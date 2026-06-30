from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import text
from app.extensions import db
from app.utils.auth_decorator import token_required
import logging

# Configure logging
logger = logging.getLogger(__name__)

reports_bp = Blueprint("reports", __name__)

def _utc_now():
    return datetime.now(timezone.utc)


# ========================================
# REPORTS CRUD OPERATIONS
# ========================================

# Get all reports
@reports_bp.route("/", methods=["GET"])
@token_required
def get_reports():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Get query parameters
        search = request.args.get("search", "").strip()
        status = request.args.get("status", "").strip()
        project_id = request.args.get("project_id", "").strip()
        
        # Build base query
        query = """
            SELECT
                r.report_id,
                r.lab_id,
                r.project_id,
                p.project_name,
                r.report_number,
                r.report_title,
                r.report_create_date,
                r.report_date,
                r.status,
                r.remarks,
                r.created_by,
                r.approved_by,
                r.created_at,
                r.updated_at,
                -- Get sample entry info for display
                se.sample_id,
                se.sample_entry_id,
                mc.category_name,
                mt.type_name
            FROM reports r
            LEFT JOIN projects p ON r.project_id = p.project_id
            LEFT JOIN sample_entries se ON se.project_id = r.project_id
            LEFT JOIN material_categories mc ON mc.material_category_id = se.material_category_id
            LEFT JOIN material_types mt ON mt.material_type_id = se.material_type_id
            WHERE r.lab_id = :lab_id
        """
        
        params = {"lab_id": lab_id}
        
        # Add filters
        if search:
            query += " AND ("
            query += " r.report_number ILIKE :search OR"
            query += " r.report_title ILIKE :search OR"
            query += " p.project_name ILIKE :search OR"
            query += " r.remarks ILIKE :search"
            query += " )"
            params["search"] = f"%{search}%"
        
        if status:
            query += " AND r.status = :status"
            params["status"] = status
            
        if project_id:
            query += " AND r.project_id = :project_id"
            params["project_id"] = project_id
        
        query += " ORDER BY r.created_at DESC"
        
        results = db.session.execute(text(query), params).fetchall()
        
        reports_data = []
        for result in results:
            reports_data.append({
                "report_id": result.report_id,
                "lab_id": result.lab_id,
                "project_id": result.project_id,
                "project_name": result.project_name,
                "report_number": result.report_number,
                "report_title": result.report_title,
                "report_create_date": result.report_create_date.isoformat() if result.report_create_date else None,
                "report_date": result.report_date.isoformat() if result.report_date else None,
                "status": result.status,
                "remarks": result.remarks,
                "created_by": result.created_by,
                "approved_by": result.approved_by,
                "created_at": result.created_at.isoformat(),
                "updated_at": result.updated_at.isoformat(),
                "sample_code": getattr(result, 'sample_id', None),
                "sample_entry_id": getattr(result, 'sample_entry_id', None),
                "category_name": getattr(result, 'category_name', None),
                "type_name": getattr(result, 'type_name', None)
            })
        
        return jsonify({
            "success": True,
            "data": reports_data
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching reports: {str(e)}"
        }), 500


# Get report by ID
@reports_bp.route("/<int:report_id>", methods=["GET"])
@token_required
def get_report_by_id(report_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Get main report details
        query = """
            SELECT
                r.report_id,
                r.lab_id,
                r.project_id,
                p.project_name,
                r.report_number,
                r.report_title,
                r.report_create_date,
                r.report_date,
                r.status,
                r.remarks,
                r.extra_fields,
                r.created_by,
                r.approved_by,
                r.created_at,
                r.updated_at
            FROM reports r
            LEFT JOIN projects p ON r.project_id = p.project_id
            WHERE r.report_id = :report_id AND r.lab_id = :lab_id
        """
        
        result = db.session.execute(text(query), {
            "report_id": report_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not result:
            return jsonify({
                "success": False,
                "message": "Report not found"
            }), 404
        
        report_data = {
            "report_id": result.report_id,
            "lab_id": result.lab_id,
            "project_id": result.project_id,
            "project_name": result.project_name,
            "report_number": result.report_number,
            "report_title": result.report_title,
            "report_create_date": result.report_create_date.isoformat() if result.report_create_date else None,
            "report_date": result.report_date.isoformat() if result.report_date else None,
            "status": result.status,
            "remarks": result.remarks,
            "extra_fields": result.extra_fields,
            "created_by": result.created_by,
            "approved_by": result.approved_by,
            "created_at": result.created_at.isoformat(),
            "updated_at": result.updated_at.isoformat()
        }
        
        # Get scope test results for this report
        scope_results_query = """
            SELECT
                rsr.report_scope_result_id,
                rsr.report_id,
                rsr.group_id,
                sg.group_name,
                rsr.material_id,
                sm.material_name,
                rsr.scope_test_id,
                st.test_name,
                st.test_method,
                rsr.result_value,
                rsr.unit,
                rsr.remark,
                rsr.created_at,
                rsr.updated_at
            FROM report_scope_results rsr
            LEFT JOIN scope_groups sg ON sg.group_id = rsr.group_id
            LEFT JOIN scope_materials sm ON sm.material_id = rsr.material_id
            LEFT JOIN scope_tests st ON st.scope_test_id = rsr.scope_test_id
            WHERE rsr.report_id = :report_id
            ORDER BY sg.group_name, sm.material_name, st.test_name
        """
        
        scope_results = db.session.execute(text(scope_results_query), {
            "report_id": report_id
        }).fetchall()
        
        scope_results_data = []
        for scope_result in scope_results:
            scope_results_data.append({
                "report_scope_result_id": scope_result.report_scope_result_id,
                "report_id": scope_result.report_id,
                "group_id": scope_result.group_id,
                "group_name": scope_result.group_name,
                "material_id": scope_result.material_id,
                "material_name": scope_result.material_name,
                "scope_test_id": scope_result.scope_test_id,
                "test_name": scope_result.test_name,
                "test_method": scope_result.test_method,
                "result_value": scope_result.result_value,
                "unit": scope_result.unit,
                "remark": scope_result.remark,
                "created_at": scope_result.created_at.isoformat(),
                "updated_at": scope_result.updated_at.isoformat()
            })
        
        report_data["scope_results"] = scope_results_data
        
        return jsonify({
            "success": True,
            "data": report_data
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching report: {str(e)}"
        }), 500


# Create report
@reports_bp.route("/", methods=["POST"])
@token_required
def create_report():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        # Validate required fields
        required_fields = ["project_id", "test_name", "test_results", "status"]
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    "success": False,
                    "message": f"{field} is required"
                }), 400
        
        # Generate report number
        report_number = f"RPT-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Insert main report
        insert_query = """
            INSERT INTO reports (
                lab_id, project_id, report_number, report_title,
                report_create_date, status, remarks, created_by, created_at, updated_at
            ) VALUES (
                :lab_id, :project_id, :report_number, :report_title,
                :report_create_date, :status, :remarks, :created_by, :created_at, :updated_at
            ) RETURNING report_id
        """
        
        params = {
            "lab_id": lab_id,
            "project_id": data["project_id"],
            "report_number": report_number,
            "report_title": data.get("test_name", ""),
            "report_create_date": datetime.now().date(),
            "status": data["status"],
            "remarks": data.get("remarks", ""),
            "created_by": g.jwt_payload.get("user_id"),
            "created_at": _utc_now(),
            "updated_at": _utc_now()
        }
        
        result = db.session.execute(text(insert_query), params)
        db.session.commit()
        new_report_id = result.fetchone()[0]
        
        # Handle scope test results if provided
        scope_test_values = data.get('scope_test_values', {})
        if scope_test_values and isinstance(scope_test_values, dict):
            for scope_test_id, test_data in scope_test_values.items():
                try:
                    # Get scope test details
                    scope_query = """
                        SELECT pst.group_id, pst.material_id, pst.scope_test_id
                        FROM project_scope_tests pst
                        WHERE pst.project_scope_test_id = :project_scope_test_id
                    """
                    scope_result = db.session.execute(text(scope_query), {
                        "project_scope_test_id": scope_test_id
                    }).fetchone()
                    
                    if scope_result:
                        # Insert scope test result
                        scope_result_insert = """
                            INSERT INTO report_scope_results (
                                report_id, group_id, material_id, scope_test_id,
                                result_value, unit, remark, created_at, updated_at
                            ) VALUES (
                                :report_id, :group_id, :material_id, :scope_test_id,
                                :result_value, :unit, :remark, :created_at, :updated_at
                            )
                        """
                        scope_params = {
                            "report_id": new_report_id,
                            "group_id": scope_result.group_id,
                            "material_id": scope_result.material_id,
                            "scope_test_id": scope_result.scope_test_id,
                            "result_value": test_data.get('test_value', ''),
                            "unit": None,  # Can be added later
                            "remark": test_data.get('remarks', ''),
                            "created_at": _utc_now(),
                            "updated_at": _utc_now()
                        }
                        db.session.execute(text(scope_result_insert), scope_params)
                except Exception as e:
                    # Log error but continue with other scope tests
                    print(f"Error inserting scope test result {scope_test_id}: {str(e)}")
            
            db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Report created successfully",
            "data": {
                "report_id": new_report_id,
                "report_number": report_number
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error creating report: {str(e)}"
        }), 500


# Update report
@reports_bp.route("/<int:report_id>", methods=["PUT"])
@token_required
def update_report(report_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        # Check if report exists and belongs to lab
        existing_report = db.session.execute(text("""
            SELECT report_id FROM reports 
            WHERE report_id = :report_id AND lab_id = :lab_id
        """), {
            "report_id": report_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not existing_report:
            return jsonify({
                "success": False,
                "message": "Report not found"
            }), 404
        
        # Build update query dynamically
        update_fields = []
        params = {
            "report_id": report_id,
            "lab_id": lab_id,
            "updated_by": g.jwt_payload.get("user_id"),
            "updated_at": _utc_now()
        }
        
        # Update fields
        if "report_title" in data:
            update_fields.append("report_title = :report_title")
            params["report_title"] = data["report_title"]
        
        if "status" in data:
            update_fields.append("status = :status")
            params["status"] = data["status"]
        
        if "remarks" in data:
            update_fields.append("remarks = :remarks")
            params["remarks"] = data["remarks"]
        
        if "report_date" in data:
            update_fields.append("report_date = :report_date")
            params["report_date"] = data["report_date"]
        
        if update_fields:
            query = f"""
                UPDATE reports 
                SET {', '.join(update_fields)}, updated_by = :updated_by, updated_at = :updated_at
                WHERE report_id = :report_id AND lab_id = :lab_id
            """
            
            db.session.execute(text(query), params)
            db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Report updated successfully"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error updating report: {str(e)}"
        }), 500


# Delete report
@reports_bp.route("/<int:report_id>", methods=["DELETE"])
@token_required
def delete_report(report_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Check if report exists and belongs to lab
        existing_report = db.session.execute(text("""
            SELECT report_id FROM reports 
            WHERE report_id = :report_id AND lab_id = :lab_id
        """), {
            "report_id": report_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not existing_report:
            return jsonify({
                "success": False,
                "message": "Report not found"
            }), 404
        
        # Delete report (cascade will delete scope results)
        db.session.execute(text("""
            DELETE FROM reports 
            WHERE report_id = :report_id AND lab_id = :lab_id
        """), {
            "report_id": report_id,
            "lab_id": lab_id
        })
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Report deleted successfully"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error deleting report: {str(e)}"
        }), 500


# Get all scope tests for a sample
@reports_bp.route("/sample/<int:sample_id>/scope-tests", methods=["GET"])
@token_required
def get_sample_scope_tests(sample_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        print(f"DEBUG: Fetching scope tests for sample_id={sample_id}, lab_id={lab_id}")
        
        # Verify sample exists and belongs to lab
        try:
            sample_check_query = """
                SELECT sample_id, project_id FROM samples 
                WHERE sample_id = :sample_id AND lab_id = :lab_id
            """
            print(f"DEBUG: Executing sample check query: {sample_check_query}")
            sample_check = db.session.execute(text(sample_check_query), {
                "sample_id": sample_id,
                "lab_id": lab_id
            }).fetchone()
            print(f"DEBUG: Sample check result: {sample_check}")
        except Exception as e:
            print(f"ERROR: Sample check query failed: {str(e)}")
            return jsonify({
                "success": False,
                "message": f"Error checking sample: {str(e)}"
            }), 500
        
        if not sample_check:
            print(f"DEBUG: Sample not found for sample_id={sample_id}, lab_id={lab_id}")
            return jsonify({
                "success": False,
                "message": "Sample not found"
            }), 404
        
        print(f"DEBUG: Found sample with project_id={sample_check.project_id}")
        
        # Get all scope tests for this sample entry
        try:
            # First, let's check all scope tests assigned to this sample entry
            all_tests_query = """
                SELECT
                    sest.sample_entry_scope_test_id,
                    sest.sample_entry_id,
                    sest.project_scope_test_id,
                    pst.project_id,
                    pst.group_id,
                    sg.group_name,
                    pst.material_id,
                    sm.material_name,
                    pst.scope_test_id,
                    st.test_name,
                    st.test_method,
                    pst.sample_required,
                    pst.test_quantity,
                    pst.remarks,
                    pst.status
                FROM sample_entry_scope_tests sest
                JOIN project_scope_tests pst ON pst.project_scope_test_id = sest.project_scope_test_id
                JOIN scope_groups sg ON sg.group_id = pst.group_id
                JOIN scope_materials sm ON sm.material_id = pst.material_id
                JOIN scope_tests st ON st.scope_test_id = pst.scope_test_id
                WHERE sest.sample_entry_id = :sample_entry_id
                ORDER BY sg.group_name, sm.material_name, st.test_name
            """
            print(f"DEBUG: Executing sample entry scope tests query")
            print(f"DEBUG: Looking for sample_entry_id in sample_entries table for sample_id={sample_id}")
            
            # First get the sample_entry_id for this sample_id
            sample_entry_query = """
                SELECT sample_entry_id FROM sample_entries 
                WHERE sample_id = :sample_id AND lab_id = :lab_id
                ORDER BY created_at DESC LIMIT 1
            """
            sample_entry_result = db.session.execute(text(sample_entry_query), {
                "sample_id": sample_id,
                "lab_id": lab_id
            }).fetchone()
            
            if not sample_entry_result:
                print(f"DEBUG: No sample entry found for sample_id={sample_id}")
                return jsonify({
                    "success": True,
                    "data": []
                })
            
            sample_entry_id = sample_entry_result.sample_entry_id
            print(f"DEBUG: Found sample_entry_id={sample_entry_id} for sample_id={sample_id}")
            
            all_results = db.session.execute(text(all_tests_query), {
                "sample_entry_id": sample_entry_id
            }).fetchall()
            print(f"DEBUG: Found {len(all_results)} scope tests assigned to sample_entry_id={sample_entry_id}")
            
            # Debug: Print all results
            for i, row in enumerate(all_results):
                print(f"DEBUG: Test {i+1}: {row.test_name} - Status: {row.status}")
            
        except Exception as e:
            print(f"ERROR: Scope tests query failed: {str(e)}")
            import traceback
            print(f"ERROR: Traceback: {traceback.format_exc()}")
            return jsonify({
                "success": False,
                "message": f"Error fetching scope tests: {str(e)}"
            }), 500
        
        scope_tests = [];
        try:
            for row in all_results:
                scope_tests.append({
                    "project_scope_test_id": row.project_scope_test_id,
                    "project_id": row.project_id,
                    "group_id": row.group_id,
                    "group_name": row.group_name,
                    "material_id": row.material_id,
                    "material_name": row.material_name,
                    "scope_test_id": row.scope_test_id,
                    "test_name": row.test_name,
                    "test_method": row.test_method,
                    "sample_required": row.sample_required,
                    "test_quantity": row.test_quantity,
                    "remarks": row.remarks,
                    "status": row.status
                })
            print(f"DEBUG: Successfully processed {len(scope_tests)} scope tests")
        except Exception as e:
            print(f"ERROR: Failed to process results: {str(e)}")
            import traceback
            print(f"ERROR: Traceback: {traceback.format_exc()}")
            return jsonify({
                "success": False,
                "message": f"Error processing scope test results: {str(e)}"
            }), 500
        
        print(f"DEBUG: Returning success response with {len(scope_tests)} scope tests")
        return jsonify({
            "success": True,
            "data": scope_tests
        })
        
    except Exception as e:
        print(f"ERROR: Unexpected error in get_sample_scope_tests: {str(e)}")
        import traceback
        print(f"ERROR: Traceback: {traceback.format_exc()}")
        return jsonify({
            "success": False,
            "message": f"Error fetching sample scope tests: {str(e)}"
        }), 500
