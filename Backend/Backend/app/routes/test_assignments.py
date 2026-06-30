from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import text
from app.extensions import db
from app.utils.auth_decorator import token_required

test_assignments_bp = Blueprint("test_assignments", __name__)


def _utc_now():
    return datetime.now(timezone.utc)


def _get_lab_id():
    return g.jwt_payload.get("lab_id")


def _get_user_id():
    return g.jwt_payload.get("user_id")


# ==========================================
# ASSIGNMENT CRUD OPERATIONS
# ==========================================

@test_assignments_bp.route("/", methods=["POST"])
@token_required
def create_assignment():
    try:
        lab_id = _get_lab_id()
        user_id = _get_user_id()
        data = request.get_json() or {}
        
        if not data.get("sample_id"):
            return jsonify({
                "success": False,
                "message": "sample_id is required"
            }), 400

        sample_id = data["sample_id"]
        scope_test_ids = data.get("scope_test_ids")
        if scope_test_ids is None:
            scope_test_ids = [data.get("scope_test_id")] if data.get("scope_test_id") else []
        if not isinstance(scope_test_ids, list):
            scope_test_ids = [scope_test_ids]

        scope_test_ids = [int(test_id) for test_id in scope_test_ids if str(test_id).strip()]
        scope_test_ids = list(dict.fromkeys(scope_test_ids))

        if not scope_test_ids:
            return jsonify({
                "success": False,
                "message": "At least one scope test is required"
            }), 400
        
        # Check if sample belongs to lab
        sample_check = db.session.execute(text("""
            SELECT s.sample_id, s.project_id
            FROM sample_receipt_register s
            JOIN projects p ON s.project_id = p.project_id
            WHERE s.sample_id = :sample_id AND p.lab_id = :lab_id
        """), {
            "sample_id": sample_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not sample_check:
            return jsonify({
                "success": False,
                "message": "Sample not found or does not belong to your lab"
            }), 404
        
        project_id = sample_check.project_id
        
        # Check if scope tests belong to project
        scope_rows = db.session.execute(text("""
            SELECT project_scope_test_id
            FROM project_scope_tests
            WHERE project_scope_test_id = ANY(:scope_test_ids)
            AND project_id = :project_id
            AND status = 'active'
        """), {
            "scope_test_ids": scope_test_ids,
            "project_id": project_id
        }).fetchall()
        
        valid_scope_test_ids = {row.project_scope_test_id for row in scope_rows}
        invalid_scope_test_ids = [test_id for test_id in scope_test_ids if test_id not in valid_scope_test_ids]
        if invalid_scope_test_ids:
            return jsonify({
                "success": False,
                "message": "One or more test scopes are not active for this project"
            }), 404
        
        # Check if assignment already exists
        existing_rows = db.session.execute(text("""
            SELECT scope_test_id
            FROM sample_test_assignments
            WHERE sample_id = :sample_id AND scope_test_id = ANY(:scope_test_ids)
        """), {
            "sample_id": sample_id,
            "scope_test_ids": scope_test_ids
        }).fetchall()
        
        existing_scope_test_ids = {row.scope_test_id for row in existing_rows}
        new_scope_test_ids = [test_id for test_id in scope_test_ids if test_id not in existing_scope_test_ids]
        if not new_scope_test_ids:
            return jsonify({
                "success": False,
                "message": "Selected test(s) are already assigned to this sample"
            }), 400
        
        # Validate priority
        priority = data.get("priority", "Normal")
        if priority not in ["Normal", "High", "Urgent"]:
            priority = "Normal"
        
        # Parse target_date if provided
        target_date = None
        if data.get("target_date"):
            try:
                target_date = datetime.strptime(data["target_date"], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({
                    "success": False,
                    "message": "Invalid target_date format. Use YYYY-MM-DD"
                }), 400
        
        # Create assignment
        insert_query = """
            INSERT INTO sample_test_assignments (
                sample_id, scope_test_id, assigned_to, assigned_date, target_date,
                priority, status, remarks, created_by, created_at, updated_at
            ) VALUES (
                :sample_id, :scope_test_id, :assigned_to, :assigned_date, :target_date,
                :priority, :status, :remarks, :created_by, :created_at, :updated_at
            ) RETURNING assignment_id
        """
        
        assignment_ids = []
        for scope_test_id in new_scope_test_ids:
            params = {
                "sample_id": sample_id,
                "scope_test_id": scope_test_id,
                "assigned_to": data.get("assigned_to"),
                "assigned_date": datetime.now(timezone.utc).date(),
                "target_date": target_date,
                "priority": priority,
                "status": "Assigned",
                "remarks": data.get("remarks"),
                "created_by": user_id,
                "created_at": _utc_now(),
                "updated_at": _utc_now()
            }
            result = db.session.execute(text(insert_query), params)
            assignment_ids.append(result.fetchone()[0])

            db.session.execute(text("""
                INSERT INTO sample_test_results (
                    lab_id, project_id, sample_id, project_scope_test_id, scope_test_id,
                    test_name, test_method, entered_by, updated_by, created_at, updated_at
                )
                SELECT
                    :lab_id,
                    pst.project_id,
                    :sample_id,
                    pst.project_scope_test_id,
                    pst.scope_test_id,
                    st.test_name,
                    st.test_method,
                    :user_id,
                    :user_id,
                    :created_at,
                    :updated_at
                FROM project_scope_tests pst
                JOIN scope_tests st ON pst.scope_test_id = st.scope_test_id
                WHERE pst.project_scope_test_id = :scope_test_id
                ON CONFLICT (sample_id, project_scope_test_id)
                WHERE project_scope_test_id IS NOT NULL
                DO UPDATE SET
                    is_active = TRUE,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = EXCLUDED.updated_at
            """), {
                "lab_id": lab_id,
                "sample_id": sample_id,
                "scope_test_id": scope_test_id,
                "user_id": user_id,
                "created_at": _utc_now(),
                "updated_at": _utc_now()
            })

        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"{len(assignment_ids)} test assignment(s) created successfully",
            "data": {
                "assignment_ids": assignment_ids,
                "created_count": len(assignment_ids),
                "skipped_existing_count": len(existing_scope_test_ids)
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error creating assignment: {str(e)}"
        }), 500


@test_assignments_bp.route("/<int:assignment_id>", methods=["PUT"])
@token_required
def update_assignment(assignment_id):
    try:
        lab_id = _get_lab_id()
        user_id = _get_user_id()
        data = request.get_json()
        
        # Check if assignment exists and belongs to lab
        assignment_check = db.session.execute(text("""
            SELECT sta.assignment_id, sta.status, s.project_id
            FROM sample_test_assignments sta
            JOIN sample_receipt_register s ON sta.sample_id = s.sample_id
            JOIN projects p ON s.project_id = p.project_id
            WHERE sta.assignment_id = :assignment_id AND p.lab_id = :lab_id
        """), {
            "assignment_id": assignment_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not assignment_check:
            return jsonify({
                "success": False,
                "message": "Assignment not found or does not belong to your lab"
            }), 404
        
        current_status = assignment_check.status
        
        # Cannot modify approved assignments
        if current_status == "Approved":
            return jsonify({
                "success": False,
                "message": "Cannot modify approved assignment"
            }), 400
        
        # Build update query
        update_fields = []
        params = {
            "assignment_id": assignment_id,
            "updated_at": _utc_now()
        }
        
        if "assigned_to" in data:
            update_fields.append("assigned_to = :assigned_to")
            params["assigned_to"] = data["assigned_to"]
        
        if "target_date" in data:
            if data["target_date"]:
                try:
                    target_date = datetime.strptime(data["target_date"], "%Y-%m-%d").date()
                    update_fields.append("target_date = :target_date")
                    params["target_date"] = target_date
                except ValueError:
                    return jsonify({
                        "success": False,
                        "message": "Invalid target_date format. Use YYYY-MM-DD"
                    }), 400
            else:
                update_fields.append("target_date = NULL")
        
        if "priority" in data:
            priority = data["priority"]
            if priority not in ["Normal", "High", "Urgent"]:
                return jsonify({
                    "success": False,
                    "message": "Invalid priority. Must be Normal, High, or Urgent"
                }), 400
            update_fields.append("priority = :priority")
            params["priority"] = priority
        
        if "remarks" in data:
            update_fields.append("remarks = :remarks")
            params["remarks"] = data["remarks"]
        
        if not update_fields:
            return jsonify({
                "success": False,
                "message": "No valid fields to update"
            }), 400
        
        update_query = f"""
            UPDATE sample_test_assignments
            SET {', '.join(update_fields)}, updated_at = :updated_at
            WHERE assignment_id = :assignment_id
        """
        
        db.session.execute(text(update_query), params)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Assignment updated successfully"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error updating assignment: {str(e)}"
        }), 500


@test_assignments_bp.route("/<int:assignment_id>", methods=["DELETE"])
@token_required
def delete_assignment(assignment_id):
    try:
        lab_id = _get_lab_id()
        
        # Check if assignment exists and belongs to lab
        assignment_check = db.session.execute(text("""
            SELECT sta.assignment_id, sta.status
            FROM sample_test_assignments sta
            JOIN sample_receipt_register s ON sta.sample_id = s.sample_id
            JOIN projects p ON s.project_id = p.project_id
            WHERE sta.assignment_id = :assignment_id AND p.lab_id = :lab_id
        """), {
            "assignment_id": assignment_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not assignment_check:
            return jsonify({
                "success": False,
                "message": "Assignment not found or does not belong to your lab"
            }), 404
        
        current_status = assignment_check.status
        
        # Check if observation exists
        observation_check = db.session.execute(text("""
            SELECT so.sample_observation_id
            FROM sample_observations so
            WHERE so.assignment_id = :assignment_id
            LIMIT 1
        """), {
            "assignment_id": assignment_id
        }).fetchone()
        
        if observation_check:
            return jsonify({
                "success": False,
                "message": "Cannot delete assignment. Observation already exists for this test."
            }), 400
        
        # Cannot delete approved assignments
        if current_status == "Approved":
            return jsonify({
                "success": False,
                "message": "Cannot delete approved assignment"
            }), 400
        
        # Delete assignment
        db.session.execute(text("""
            DELETE FROM sample_test_assignments
            WHERE assignment_id = :assignment_id
        """), {"assignment_id": assignment_id})
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Assignment deleted successfully"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error deleting assignment: {str(e)}"
        }), 500


@test_assignments_bp.route("/<int:assignment_id>", methods=["GET"])
@token_required
def get_assignment_details(assignment_id):
    try:
        lab_id = _get_lab_id()
        
        query = """
            SELECT 
                sta.assignment_id,
                sta.sample_id,
                sta.scope_test_id,
                sta.assigned_to,
                sta.assigned_date,
                sta.target_date,
                sta.priority,
                sta.status,
                sta.remarks,
                sta.created_by,
                sta.created_at,
                sta.updated_at,
                s.sample_no,
                s.material_name,
                s.quantity,
                s.received_date,
                s.received_condition,
                s.sample_priority,
                s.received_by,
                s.status as sample_status,
                st.test_name,
                st.test_method,
                sg.group_name,
                sm.material_name as scope_material,
                u.first_name || ' ' || u.last_name as assigned_to_name
            FROM sample_test_assignments sta
            JOIN sample_receipt_register s ON sta.sample_id = s.sample_id
            JOIN projects p ON s.project_id = p.project_id
            LEFT JOIN project_scope_tests pst ON sta.scope_test_id = pst.project_scope_test_id
            LEFT JOIN scope_tests st ON pst.scope_test_id = st.scope_test_id
            LEFT JOIN scope_groups sg ON pst.group_id = sg.group_id
            LEFT JOIN scope_materials sm ON pst.material_id = sm.material_id
            LEFT JOIN users u ON sta.assigned_to = u.user_id
            WHERE sta.assignment_id = :assignment_id AND p.lab_id = :lab_id
        """
        
        result = db.session.execute(text(query), {
            "assignment_id": assignment_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not result:
            return jsonify({
                "success": False,
                "message": "Assignment not found"
            }), 404
        
        assignment = {
            "assignment_id": result.assignment_id,
            "sample_id": result.sample_id,
            "scope_test_id": result.scope_test_id,
            "assigned_to": result.assigned_to,
            "assigned_date": result.assigned_date.isoformat() if result.assigned_date else None,
            "target_date": result.target_date.isoformat() if result.target_date else None,
            "priority": result.priority,
            "status": result.status,
            "remarks": result.remarks,
            "created_by": result.created_by,
            "created_at": result.created_at.isoformat() if result.created_at else None,
            "updated_at": result.updated_at.isoformat() if result.updated_at else None,
            "sample_no": result.sample_no,
            "material_name": result.material_name,
            "quantity": result.quantity,
            "received_date": result.received_date.isoformat() if result.received_date else None,
            "received_condition": result.received_condition,
            "sample_priority": result.sample_priority,
            "received_by": result.received_by,
            "sample_status": result.sample_status,
            "test_name": result.test_name,
            "test_method": result.test_method,
            "group_name": result.group_name,
            "assigned_to_name": result.assigned_to_name
        }
        
        return jsonify({
            "success": True,
            "data": assignment
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching assignment details: {str(e)}"
        }), 500


# ==========================================
# ASSIGNMENT LIST OPERATIONS
# ==========================================

@test_assignments_bp.route("/by-project/<int:project_id>", methods=["GET"])
@token_required
def get_assignments_by_project(project_id):
    try:
        lab_id = _get_lab_id()
        
        # Verify project belongs to lab
        project_check = db.session.execute(text("""
            SELECT project_id FROM projects
            WHERE project_id = :project_id AND lab_id = :lab_id
        """), {
            "project_id": project_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not project_check:
            return jsonify({
                "success": False,
                "message": "Project not found or does not belong to your lab"
            }), 404
        
        query = """
            SELECT 
                sta.assignment_id,
                sta.sample_id,
                sta.scope_test_id,
                sta.assigned_to,
                sta.assigned_date,
                sta.target_date,
                sta.priority,
                sta.status,
                sta.remarks,
                s.sample_no,
                s.material_name,
                s.quantity,
                s.received_date,
                s.received_condition,
                st.test_name,
                st.test_method,
                u.first_name || ' ' || u.last_name as assigned_to_name
            FROM sample_test_assignments sta
            JOIN sample_receipt_register s ON sta.sample_id = s.sample_id
            JOIN projects p ON s.project_id = p.project_id
            LEFT JOIN project_scope_tests pst ON sta.scope_test_id = pst.project_scope_test_id
            LEFT JOIN scope_tests st ON pst.scope_test_id = st.scope_test_id
            LEFT JOIN users u ON sta.assigned_to = u.user_id
            WHERE p.project_id = :project_id AND p.lab_id = :lab_id
            ORDER BY sta.assigned_date DESC, sta.assignment_id DESC
        """
        
        assignments = db.session.execute(text(query), {
            "project_id": project_id,
            "lab_id": lab_id
        }).fetchall()
        
        assignments_data = []
        for assignment in assignments:
            assignments_data.append({
                "assignment_id": assignment.assignment_id,
                "sample_id": assignment.sample_id,
                "scope_test_id": assignment.scope_test_id,
                "assigned_to": assignment.assigned_to,
                "assigned_date": assignment.assigned_date.isoformat() if assignment.assigned_date else None,
                "target_date": assignment.target_date.isoformat() if assignment.target_date else None,
                "priority": assignment.priority,
                "status": assignment.status,
                "remarks": assignment.remarks,
                "sample_no": assignment.sample_no,
                "material_name": assignment.material_name,
                "quantity": assignment.quantity,
                "received_date": assignment.received_date.isoformat() if assignment.received_date else None,
                "received_condition": assignment.received_condition,
                "success": True,
                "data": assignments_data
            })
        
        return jsonify({
            "success": True,
            "data": assignments_data
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching assignments: {str(e)}"
        }), 500


@test_assignments_bp.route("/by-sample/<int:sample_id>", methods=["GET"])
@token_required
def get_assignments_by_sample(sample_id):
    try:
        lab_id = _get_lab_id()
        
        # Verify sample belongs to lab
        sample_check = db.session.execute(text("""
            SELECT s.sample_id
            FROM sample_receipt_register s
            JOIN projects p ON s.project_id = p.project_id
            WHERE s.sample_id = :sample_id AND p.lab_id = :lab_id
        """), {
            "sample_id": sample_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not sample_check:
            return jsonify({
                "success": False,
                "message": "Sample not found or does not belong to your lab"
            }), 404
        
        query = """
            SELECT 
                sta.assignment_id,
                sta.sample_id,
                sta.scope_test_id,
                pst.scope_test_id AS master_scope_test_id,
                sta.assigned_to,
                sta.assigned_date,
                sta.target_date,
                sta.priority,
                sta.status,
                sta.remarks,
                st.test_name,
                st.test_method,
                sg.group_name,
                u.first_name || ' ' || u.last_name as assigned_to_name
            FROM sample_test_assignments sta
            LEFT JOIN project_scope_tests pst ON sta.scope_test_id = pst.project_scope_test_id
            LEFT JOIN scope_tests st ON pst.scope_test_id = st.scope_test_id
            LEFT JOIN scope_groups sg ON pst.group_id = sg.group_id
            LEFT JOIN users u ON sta.assigned_to = u.user_id
            WHERE sta.sample_id = :sample_id
            ORDER BY sta.assigned_date DESC, sta.assignment_id DESC
        """
        
        assignments = db.session.execute(text(query), {
            "sample_id": sample_id
        }).fetchall()
        
        assignments_data = []
        for assignment in assignments:
            assignments_data.append({
                "assignment_id": assignment.assignment_id,
                "sample_id": assignment.sample_id,
                "scope_test_id": assignment.scope_test_id,
                "master_scope_test_id": assignment.master_scope_test_id,
                "assigned_to": assignment.assigned_to,
                "assigned_date": assignment.assigned_date.isoformat() if assignment.assigned_date else None,
                "target_date": assignment.target_date.isoformat() if assignment.target_date else None,
                "priority": assignment.priority,
                "status": assignment.status,
                "remarks": assignment.remarks,
                "test_name": assignment.test_name,
                "test_method": assignment.test_method,
                "group_name": assignment.group_name,
                "assigned_to_name": assignment.assigned_to_name
            })
        
        return jsonify({
            "success": True,
            "data": assignments_data
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching assignments: {str(e)}"
        }), 500


# ==========================================
# STATUS CHANGE OPERATIONS
# ==========================================

@test_assignments_bp.route("/<int:assignment_id>/status", methods=["PATCH"])
@token_required
def change_assignment_status(assignment_id):
    try:
        lab_id = _get_lab_id()
        user_id = _get_user_id()
        data = request.get_json()
        
        new_status = data.get("status")
        if not new_status:
            return jsonify({
                "success": False,
                "message": "Status is required"
            }), 400
        
        valid_statuses = ["Assigned", "In Progress", "Observation Completed", "Result Generated", "Reviewed", "Approved"]
        if new_status not in valid_statuses:
            return jsonify({
                "success": False,
                "message": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            }), 400
        
        # Check if assignment exists and belongs to lab
        assignment_check = db.session.execute(text("""
            SELECT sta.assignment_id, sta.status
            FROM sample_test_assignments sta
            JOIN sample_receipt_register s ON sta.sample_id = s.sample_id
            JOIN projects p ON s.project_id = p.project_id
            WHERE sta.assignment_id = :assignment_id AND p.lab_id = :lab_id
        """), {
            "assignment_id": assignment_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not assignment_check:
            return jsonify({
                "success": False,
                "message": "Assignment not found or does not belong to your lab"
            }), 404
        
        current_status = assignment_check.status
        
        # Update status
        update_query = """
            UPDATE sample_test_assignments
            SET status = :status, updated_at = :updated_at
            WHERE assignment_id = :assignment_id
        """
        
        db.session.execute(text(update_query), {
            "assignment_id": assignment_id,
            "status": new_status,
            "updated_at": _utc_now()
        })
        
        # Log status change in history
        history_query = """
            INSERT INTO sample_test_assignment_history (
                assignment_id, old_status, new_status, changed_by, changed_at, remarks
            ) VALUES (
                :assignment_id, :old_status, :new_status, :changed_by, :changed_at, :remarks
            )
        """
        
        db.session.execute(text(history_query), {
            "assignment_id": assignment_id,
            "old_status": current_status,
            "new_status": new_status,
            "changed_by": user_id,
            "changed_at": _utc_now(),
            "remarks": data.get("remarks", "Status changed")
        })
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Assignment status updated to {new_status}"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error updating status: {str(e)}"
        }), 500


# ==========================================
# DASHBOARD SUMMARY
# ==========================================

@test_assignments_bp.route("/dashboard-summary", methods=["GET"])
@token_required
def get_dashboard_summary():
    try:
        lab_id = _get_lab_id()
        project_id = request.args.get("project_id", "").strip()
        
        # Base query conditions
        where_clause = "WHERE p.lab_id = :lab_id"
        params = {"lab_id": lab_id}
        
        if project_id:
            where_clause += " AND p.project_id = :project_id"
            params["project_id"] = project_id
        
        # Get summary statistics
        summary_query = f"""
            SELECT 
                COUNT(DISTINCT s.sample_id) as total_samples,
                COUNT(sta.assignment_id) as total_assignments,
                COUNT(CASE WHEN sta.status = 'Approved' THEN 1 END) as completed,
                COUNT(CASE WHEN sta.status IN ('In Progress', 'Observation Completed') THEN 1 END) as in_progress,
                COUNT(CASE WHEN sta.status = 'Assigned' THEN 1 END) as pending
            FROM sample_test_assignments sta
            JOIN sample_receipt_register s ON sta.sample_id = s.sample_id
            JOIN projects p ON s.project_id = p.project_id
            {where_clause}
        """
        
        summary = db.session.execute(text(summary_query), params).fetchone()
        
        summary_data = {
            "total_samples": summary.total_samples if summary else 0,
            "total_assignments": summary.total_assignments if summary else 0,
            "completed": summary.completed if summary else 0,
            "in_progress": summary.in_progress if summary else 0,
            "pending": summary.pending if summary else 0
        }
        
        return jsonify({
            "success": True,
            "data": summary_data
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching dashboard summary: {str(e)}"
        }), 500


# ==========================================
# HELPER: GET AVAILABLE TESTS FOR SAMPLE
# ==========================================

@test_assignments_bp.route("/available-tests/<int:sample_id>", methods=["GET"])
@token_required
def get_available_tests(sample_id):
    try:
        lab_id = _get_lab_id()
        
        # Get sample details
        sample = db.session.execute(text("""
            SELECT s.sample_id, s.project_id, s.material_name
            FROM sample_receipt_register s
            JOIN projects p ON s.project_id = p.project_id
            WHERE s.sample_id = :sample_id AND p.lab_id = :lab_id
        """), {
            "sample_id": sample_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not sample:
            return jsonify({
                "success": False,
                "message": "Sample not found"
            }), 404
        
        # Get all scope tests for this project that are not yet assigned
        query = """
            SELECT 
                pst.project_scope_test_id,
                st.test_name,
                st.test_method,
                sm.material_name,
                sg.group_name,
                pst.remarks
            FROM project_scope_tests pst
            JOIN scope_tests st ON pst.scope_test_id = st.scope_test_id
            JOIN scope_materials sm ON pst.material_id = sm.material_id
            JOIN scope_groups sg ON pst.group_id = sg.group_id
            WHERE pst.project_id = :project_id
            AND pst.status = 'active'
            AND pst.is_active = TRUE
            AND pst.project_scope_test_id NOT IN (
                SELECT scope_test_id
                FROM sample_test_assignments
                WHERE sample_id = :sample_id
            )
            ORDER BY pst.sequence_no, sg.group_name, st.test_name
        """
        
        tests = db.session.execute(text(query), {
            "project_id": sample.project_id,
            "sample_id": sample_id
        }).fetchall()
        
        tests_data = []
        for test in tests:
            tests_data.append({
                "project_scope_test_id": test.project_scope_test_id,
                "test_name": test.test_name,
                "test_method": test.test_method,
                "material_name": test.material_name,
                "group_name": test.group_name,
                "remarks": test.remarks
            })
        
        return jsonify({
            "success": True,
            "data": tests_data
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching available tests: {str(e)}"
        }), 500
