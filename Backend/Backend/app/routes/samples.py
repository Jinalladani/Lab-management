from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, g
from sqlalchemy import text
from app.extensions import db
from app.utils.auth_decorator import token_required

samples_bp = Blueprint("samples", __name__)


def _utc_now():
    return datetime.now(timezone.utc)


# Test endpoint without authentication for CORS testing
@samples_bp.route("/test", methods=["GET"])
def test_samples():
    return jsonify({
        "success": True,
        "message": "Samples API is working!",
        "data": []
    })


# Get all samples for a lab (without entries for better performance)
@samples_bp.route("/", methods=["GET"])
@token_required
def get_samples():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Get query parameters
        project_id = request.args.get("project_id", "").strip()
        search = request.args.get("search", "").strip()
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 10))
        
        # Build the base query - INCLUDE entries count
        query = """
            SELECT
                s.sample_id,
                s.lab_id,
                s.project_id,
                p.project_name,
                p.project_code,
                s.sample_code,
                s.sample_quantity,
                s.total_quantity,
                s.collect_date,
                s.collected_by,
                s.status,
                s.collection_mode,
                s.remarks,
                s.created_at,
                s.updated_at,
                COUNT(se.sample_entry_id) as entries_count
            FROM samples s
            LEFT JOIN projects p ON s.project_id = p.project_id
            LEFT JOIN sample_receipt_register se ON s.sample_id = se.sample_id
            WHERE s.lab_id = :lab_id
        """
        
        params = {"lab_id": lab_id}
        
        # Add project filter
        if project_id:
            query += " AND s.project_id = :project_id"
            params["project_id"] = project_id
        
        # Add search filter
        if search:
            query += " AND (s.sample_code ILIKE :search OR s.collected_by ILIKE :search OR p.project_name ILIKE :search)"
            params["search"] = f"%{search}%"
        
        # Add GROUP BY after all WHERE conditions
        query += """
            GROUP BY
                s.sample_id, s.lab_id, s.project_id, p.project_name, p.project_code,
                s.sample_code, s.sample_quantity, s.total_quantity, s.collect_date,
                s.collected_by,s.status, s.collection_mode, s.remarks, s.created_at, s.updated_at
            ORDER BY s.created_at DESC
        """
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
        total_result = db.session.execute(text(count_query), params).fetchone()
        total = total_result.total if total_result else 0
        
        # Add pagination
        offset = (page - 1) * per_page
        query += " LIMIT :per_page OFFSET :offset"
        params["per_page"] = per_page
        params["offset"] = offset
        
        # Execute query
        samples = db.session.execute(text(query), params).fetchall()
        
        # Format results - INCLUDE entries count
        samples_data = []
        for sample in samples:
            samples_data.append({
                "sample_id": sample.sample_id,
                "lab_id": sample.lab_id,
                "project_id": sample.project_id,
                "project_name": sample.project_name,
                "project_code": sample.project_code,
                "sample_code": sample.sample_code,
                "sample_quantity": sample.total_quantity,
                "total_quantity": sample.total_quantity,
                "collect_date": sample.collect_date.isoformat() if sample.collect_date else None,
                "collected_by": sample.collected_by,
                "status": sample.status,
                "collection_mode": sample.collection_mode,
                "remarks": sample.remarks,
                "created_at": sample.created_at.isoformat() if sample.created_at else None,
                "updated_at": sample.updated_at.isoformat() if sample.updated_at else None,
                "entries_count": sample.entries_count or 0
            })
        
        return jsonify({
            "success": True,
            "data": samples_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching samples: {str(e)}"
        }), 500


# Get sample entries count (for list view performance)
@samples_bp.route("/<int:sample_id>/entries-count", methods=["GET"])
@token_required
def get_sample_entries_count(sample_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Verify sample belongs to lab
        sample_check = db.session.execute(text("""
            SELECT sample_id FROM samples 
            WHERE sample_id = :sample_id AND lab_id = :lab_id
        """), {
            "sample_id": sample_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not sample_check:
            return jsonify({
                "success": False,
                "message": "Sample not found or does not belong to your lab"
            }), 404
        
        # Get entries count
        count_result = db.session.execute(text("""
            SELECT COUNT(*) as count FROM sample_entries 
            WHERE sample_id = :sample_id
        """), {"sample_id": sample_id}).fetchone()
        
        return jsonify({
            "success": True,
            "data": {
                "sample_id": sample_id,
                "entries_count": count_result.count if count_result else 0
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching entries count: {str(e)}"
        }), 500


# Get sample by ID with entries (for edit form)
@samples_bp.route("/<int:sample_id>", methods=["GET"])
@token_required
def get_sample_by_id(sample_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Get sample details
        sample_query = """
            SELECT
                s.sample_id, s.lab_id, s.project_id, p.project_name, p.project_code,
                s.sample_code, s.sample_quantity, s.total_quantity, s.collect_date,
                s.collected_by, s.collection_mode, s.remarks,
                s.created_at, s.updated_at
            FROM samples s
            LEFT JOIN projects p ON s.project_id = p.project_id
            WHERE s.sample_id = :sample_id AND s.lab_id = :lab_id
        """
        
        sample = db.session.execute(text(sample_query), {
            "sample_id": sample_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not sample:
            return jsonify({
                "success": False,
                "message": "Sample not found"
            }), 404
        
        # Get sample entries with material details
        entries_query = """
            SELECT
                se.sample_entry_id, se.sample_type_id, se.quantity,
                se.sample_condition_id, se.sample_location_id, se.testing_days,
                se.expected_report_date, se.status, se.remarks,
                st.sample_type_name, sc.condition_name, sl.location_name
            FROM sample_entries se
            LEFT JOIN sample_types st ON se.sample_type_id = st.sample_type_id
            LEFT JOIN sample_conditions sc ON se.sample_condition_id = sc.sample_condition_id
            LEFT JOIN sample_locations sl ON se.sample_location_id = sl.sample_location_id
            WHERE se.sample_id = :sample_id AND se.lab_id = :lab_id
            ORDER BY se.created_at ASC
        """
        
        entries = db.session.execute(text(entries_query), {
            "sample_id": sample_id,
            "lab_id": lab_id
        }).fetchall()
        
        # Format entries data
        entries_data = []
        for entry in entries:
            entries_data.append({
                "sample_entry_id": entry.sample_entry_id,
                "sample_type_id": entry.sample_type_id,
                "sample_type_name": entry.sample_type_name,
                "quantity": entry.quantity,
                "sample_condition_id": entry.sample_condition_id,
                "condition_name": entry.condition_name,
                "sample_location_id": entry.sample_location_id,
                "location_name": entry.location_name,
                "testing_days": entry.testing_days,
                "expected_report_date": entry.expected_report_date.isoformat() if entry.expected_report_date else None,
                "status": entry.status,
                "remarks": entry.remarks
            })
        
        sample_data = {
            "sample_id": sample.sample_id,
            "lab_id": sample.lab_id,
            "project_id": sample.project_id,
            "project_name": sample.project_name,
            "project_code": sample.project_code,
            "sample_code": sample.sample_code,
            "sample_quantity": sample.sample_quantity,
            "total_quantity": sample.total_quantity,
            "collect_date": sample.collect_date.isoformat() if sample.collect_date else None,
            "collected_by": sample.collected_by,
            "collection_mode": sample.collection_mode,
            "remarks": sample.remarks,
            "created_at": sample.created_at.isoformat(),
            "updated_at": sample.updated_at.isoformat(),
            "entries": entries_data
        }
        
        return jsonify({
            "success": True,
            "data": sample_data
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching sample: {str(e)}"
        }), 500


# Create a new sample
@samples_bp.route("/", methods=["POST"])
@token_required
def create_sample():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        # Validate required fields
        required_fields = ["project_id", "sample_code"]
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    "success": False,
                    "message": f"{field} is required"
                }), 400
        
        # Validate collection_mode
        collection_mode = data.get("collection_mode", "in_person")
        if collection_mode not in ["courier", "in_person"]:
            return jsonify({
                "success": False,
                "message": "collection_mode must be 'courier' or 'in_person'"
            }), 400
        
        # Check if sample code already exists
        existing_sample = db.session.execute(text("""
            SELECT sample_id FROM samples 
            WHERE sample_code = :sample_code AND lab_id = :lab_id
        """), {
            "sample_code": data["sample_code"],
            "lab_id": lab_id
        }).fetchone()
        
        if existing_sample:
            return jsonify({
                "success": False,
                "message": "Sample code already exists"
            }), 400
        
        # Insert new sample
        insert_query = """
            INSERT INTO samples (
                lab_id, project_id, sample_code, sample_quantity, total_quantity,
                collect_date, collected_by, collection_mode, remarks, created_at, updated_at
            ) VALUES (
                :lab_id, :project_id, :sample_code, :sample_quantity, :total_quantity,
                :collect_date, :collected_by, :collection_mode, :remarks, :created_at, :updated_at
            ) RETURNING sample_id
        """
        
        params = {
            "lab_id": lab_id,
            "project_id": data["project_id"],
            "sample_code": data["sample_code"],
            "sample_quantity": data.get("sample_quantity"),
            "total_quantity": data.get("total_quantity"),
            "collect_date": datetime.strptime(data["collect_date"], "%Y-%m-%d").date() if data.get("collect_date") else None,
            "collected_by": data.get("collected_by"),
            "collection_mode": collection_mode,
            "remarks": data.get("remarks"),
            "created_at": _utc_now(),
            "updated_at": _utc_now()
        }
        
        result = db.session.execute(text(insert_query), params)
        db.session.commit()
        new_sample_id = result.fetchone()[0]
        
        return jsonify({
            "success": True,
            "message": "Sample added successfully",
            "data": {
                "sample_id": new_sample_id
            }
        }), 201
        
    except ValueError as e:
        return jsonify({
            "success": False,
            "message": f"Invalid date format. Use YYYY-MM-DD format: {str(e)}"
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error adding sample: {str(e)}"
        }), 500


# Update sample with entries
@samples_bp.route("/<int:sample_id>", methods=["PUT"])
@token_required
def update_sample(sample_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        # Check if sample exists and belongs to lab
        existing_sample = db.session.execute(text("""
            SELECT sample_id FROM samples 
            WHERE sample_id = :sample_id AND lab_id = :lab_id
        """), {
            "sample_id": sample_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not existing_sample:
            return jsonify({
                "success": False,
                "message": "Sample not found or does not belong to your lab"
            }), 404
        
        # Update sample header
        update_fields = []
        params = {
            "sample_id": sample_id,
            "lab_id": lab_id,
            "updated_at": _utc_now()
        }
        
        # Add fields to update if they exist in request
        if "project_id" in data:
            update_fields.append("project_id = :project_id")
            params["project_id"] = data["project_id"]
            
        if "sample_code" in data:
            # Check if new sample code conflicts with existing one (excluding current sample)
            code_check = db.session.execute(text("""
                SELECT sample_id FROM samples 
                WHERE sample_code = :sample_code AND lab_id = :lab_id AND sample_id != :sample_id
            """), {
                "sample_code": data["sample_code"],
                "lab_id": lab_id,
                "sample_id": sample_id
            }).fetchone()
            
            if code_check:
                return jsonify({
                    "success": False,
                    "message": "Sample code already exists"
                }), 400
                
            update_fields.append("sample_code = :sample_code")
            params["sample_code"] = data["sample_code"]
            
        if "sample_quantity" in data:
            update_fields.append("sample_quantity = :sample_quantity")
            params["sample_quantity"] = data["sample_quantity"]
            
        if "total_quantity" in data:
            update_fields.append("total_quantity = :total_quantity")
            params["total_quantity"] = data["total_quantity"]
            
        if "collect_date" in data:
            if data["collect_date"]:
                update_fields.append("collect_date = :collect_date")
                params["collect_date"] = datetime.strptime(data["collect_date"], "%Y-%m-%d").date()
            else:
                update_fields.append("collect_date = NULL")
                
        if "collected_by" in data:
            update_fields.append("collected_by = :collected_by")
            params["collected_by"] = data["collected_by"]
            
        if "collection_mode" in data:
            collection_mode = data["collection_mode"]
            if collection_mode not in ["courier", "in_person"]:
                return jsonify({
                    "success": False,
                    "message": "collection_mode must be 'courier' or 'in_person'"
                }), 400
            update_fields.append("collection_mode = :collection_mode")
            params["collection_mode"] = collection_mode
            
        if "remarks" in data:
            update_fields.append("remarks = :remarks")
            params["remarks"] = data["remarks"]
        
        # Update sample header if there are fields to update
        if len(update_fields) > 0:
            update_query = f"""
                UPDATE samples 
                SET {', '.join(update_fields)}, updated_at = :updated_at
                WHERE sample_id = :sample_id AND lab_id = :lab_id
            """
            
            db.session.execute(text(update_query), params)
        
        # Update sample entries if provided
        updated_entries = []
        if "entries" in data and isinstance(data["entries"], list):
            entries = data["entries"]
            
            for entry_data in entries:
                if entry_data.get("sample_entry_id"):
                    # Update existing entry
                    entry_update_fields = []
                    entry_params = {
                        "sample_entry_id": entry_data["sample_entry_id"],
                        "sample_id": sample_id,
                        "lab_id": lab_id,
                        "updated_at": _utc_now()
                    }
                    
                    if "sample_type_id" in entry_data:
                        entry_update_fields.append("sample_type_id = :sample_type_id")
                        entry_params["sample_type_id"] = entry_data["sample_type_id"]
                        
                    if "quantity" in entry_data:
                        entry_update_fields.append("quantity = :quantity")
                        entry_params["quantity"] = entry_data["quantity"]
                        
                    if "sample_condition_id" in entry_data:
                        entry_update_fields.append("sample_condition_id = :sample_condition_id")
                        entry_params["sample_condition_id"] = entry_data["sample_condition_id"] if entry_data["sample_condition_id"] else None
                        
                    if "sample_location_id" in entry_data:
                        entry_update_fields.append("sample_location_id = :sample_location_id")
                        entry_params["sample_location_id"] = entry_data["sample_location_id"] if entry_data["sample_location_id"] else None
                        
                    if "testing_days" in entry_data:
                        entry_update_fields.append("testing_days = :testing_days")
                        entry_params["testing_days"] = entry_data["testing_days"] if entry_data["testing_days"] else None
                        
                    if "expected_report_date" in entry_data:
                        if entry_data["expected_report_date"]:
                            entry_update_fields.append("expected_report_date = :expected_report_date")
                            entry_params["expected_report_date"] = datetime.strptime(entry_data["expected_report_date"], "%Y-%m-%d").date()
                        else:
                            entry_update_fields.append("expected_report_date = NULL")
                            
                    if "status" in entry_data:
                        entry_update_fields.append("status = :status")
                        entry_params["status"] = entry_data["status"]
                        
                    if "remarks" in entry_data:
                        entry_update_fields.append("remarks = :remarks")
                        entry_params["remarks"] = entry_data["remarks"]
                    
                    if len(entry_update_fields) > 0:
                        entry_update_query = f"""
                            UPDATE sample_entries 
                            SET {', '.join(entry_update_fields)}, updated_at = :updated_at
                            WHERE sample_entry_id = :sample_entry_id AND sample_id = :sample_id AND lab_id = :lab_id
                        """
                        
                        db.session.execute(text(entry_update_query), entry_params)
                        updated_entries.append(entry_data["sample_entry_id"])
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Sample and entries updated successfully",
            "data": {
                "sample_id": sample_id,
                "updated_entries": updated_entries
            }
        })
        
    except ValueError as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Invalid date format. Use YYYY-MM-DD format: {str(e)}"
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error updating sample: {str(e)}"
        }), 500


# Update individual sample entry
@samples_bp.route("/entries/<int:entry_id>", methods=["PUT"])
@token_required
def update_sample_entry(entry_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        # Check if entry exists and belongs to lab
        existing_entry = db.session.execute(text("""
            SELECT se.sample_id FROM sample_entries se
            JOIN samples s ON se.sample_id = s.sample_id
            WHERE se.sample_entry_id = :entry_id AND s.lab_id = :lab_id
        """), {
            "entry_id": entry_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not existing_entry:
            return jsonify({
                "success": False,
                "message": "Sample entry not found or does not belong to your lab"
            }), 404
        
        # Build dynamic update query
        update_fields = []
        params = {
            "entry_id": entry_id,
            "updated_at": _utc_now()
        }
        
        # Add fields to update if they exist in request
        if "sample_type_id" in data:
            update_fields.append("sample_type_id = :sample_type_id")
            params["sample_type_id"] = data["sample_type_id"]
            
        if "quantity" in data:
            update_fields.append("quantity = :quantity")
            params["quantity"] = data["quantity"]
            
        if "sample_condition_id" in data:
            update_fields.append("sample_condition_id = :sample_condition_id")
            params["sample_condition_id"] = data["sample_condition_id"] if data["sample_condition_id"] else None
            
        if "sample_location_id" in data:
            update_fields.append("sample_location_id = :sample_location_id")
            params["sample_location_id"] = data["sample_location_id"] if data["sample_location_id"] else None
            
        if "testing_days" in data:
            update_fields.append("testing_days = :testing_days")
            params["testing_days"] = data["testing_days"] if data["testing_days"] else None
            
        if "expected_report_date" in data:
            if data["expected_report_date"]:
                update_fields.append("expected_report_date = :expected_report_date")
                params["expected_report_date"] = datetime.strptime(data["expected_report_date"], "%Y-%m-%d").date()
            else:
                update_fields.append("expected_report_date = NULL")
                
        if "status" in data:
            update_fields.append("status = :status")
            params["status"] = data["status"]
            
        if "remarks" in data:
            update_fields.append("remarks = :remarks")
            params["remarks"] = data["remarks"]
        
        # If no fields to update
        if len(update_fields) == 0:
            return jsonify({
                "success": False,
                "message": "No valid fields to update"
            }), 400
        
        # Build and execute update query
        update_query = f"""
            UPDATE sample_entries 
            SET {', '.join(update_fields)}, updated_at = :updated_at
            WHERE sample_entry_id = :entry_id
        """
        
        db.session.execute(text(update_query), params)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Sample entry updated successfully",
            "data": {
                "sample_entry_id": entry_id
            }
        })
        
    except ValueError as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Invalid date format. Use YYYY-MM-DD format: {str(e)}"
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error updating sample entry: {str(e)}"
        }), 500


# Delete sample entry
@samples_bp.route("/entries/<int:entry_id>", methods=["DELETE"])
@token_required
def delete_sample_entry(entry_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Check if entry exists and belongs to lab
        existing_entry = db.session.execute(text("""
            SELECT se.sample_id FROM sample_entries se
            JOIN samples s ON se.sample_id = s.sample_id
            WHERE se.sample_entry_id = :entry_id AND s.lab_id = :lab_id
        """), {
            "entry_id": entry_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not existing_entry:
            return jsonify({
                "success": False,
                "message": "Sample entry not found or does not belong to your lab"
            }), 404
        
        # Delete the entry
        db.session.execute(text("""
            DELETE FROM sample_entries 
            WHERE sample_entry_id = :entry_id
        """), {"entry_id": entry_id})
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Sample entry deleted successfully",
            "data": {
                "sample_entry_id": entry_id
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error deleting sample entry: {str(e)}"
        }), 500


# Create sample entries (simplified version)
@samples_bp.route("/<int:sample_id>/entries", methods=["POST"])
@token_required
def create_sample_entries(sample_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        print(f"DEBUG: Creating entries for sample_id={sample_id}, lab_id={lab_id}")
        print(f"DEBUG: Request data: {data}")
        
        if not data or "entries" not in data:
            return jsonify({
                "success": False,
                "message": "Entries data is required"
            }), 400
        
        entries = data["entries"]
        if not isinstance(entries, list) or len(entries) == 0:
            return jsonify({
                "success": False,
                "message": "Data must be an array of sample entries"
            }), 400
        
        # Verify sample belongs to lab
        sample_check = db.session.execute(text("""
            SELECT sample_id, project_id FROM samples 
            WHERE sample_id = :sample_id AND lab_id = :lab_id
        """), {
            "sample_id": sample_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not sample_check:
            return jsonify({
                "success": False,
                "message": "Sample not found or does not belong to your lab"
            }), 404
        
        print(f"DEBUG: Sample validated: project_id={sample_check.project_id}")
        
        created_entries = []
        
        for i, entry_data in enumerate(entries):
            print(f"DEBUG: Processing entry {i}: {entry_data}")
            
            # Validate required fields
            if not entry_data.get("sample_type_id") or not entry_data.get("quantity"):
                return jsonify({
                    "success": False,
                    "message": "sample_type_id and quantity are required for each entry"
                }), 400
            
            # Insert sample entry
            insert_query = """
                INSERT INTO sample_entries (
                    sample_id, lab_id, project_id, sample_type_id, quantity,
                    sample_condition_id, sample_location_id, testing_days, 
                    expected_report_date, status, remarks, created_by, updated_by, created_at, updated_at
                ) VALUES (
                    :sample_id, :lab_id, :project_id, :sample_type_id, :quantity,
                    :sample_condition_id, :sample_location_id, :testing_days,
                    :expected_report_date, :status, :remarks, :created_by, :updated_by, :created_at, :updated_at
                ) RETURNING sample_entry_id
            """
            
            params = {
                "sample_id": sample_id,
                "lab_id": lab_id,
                "project_id": sample_check.project_id,
                "sample_type_id": entry_data["sample_type_id"],
                "quantity": entry_data["quantity"],
                "sample_condition_id": entry_data.get("sample_condition_id") if entry_data.get("sample_condition_id") else None,
                "sample_location_id": entry_data.get("sample_location_id") if entry_data.get("sample_location_id") else None,
                "testing_days": entry_data.get("testing_days") if entry_data.get("testing_days") else None,
                "expected_report_date": datetime.strptime(entry_data["expected_report_date"], "%Y-%m-%d").date() if entry_data.get("expected_report_date") else None,
                "status": entry_data.get("status", "pending"),
                "remarks": entry_data.get("remarks"),
                "created_by": g.jwt_payload.get("user_id") or 1,
                "updated_by": g.jwt_payload.get("user_id") or 1,
                "created_at": _utc_now(),
                "updated_at": _utc_now()
            }
            
            print(f"DEBUG: Insert params: {params}")
            
            result = db.session.execute(text(insert_query), params)
            db.session.commit()
            new_entry_id = result.fetchone()[0]
            
            print(f"DEBUG: Created entry with ID: {new_entry_id}")
            
            created_entries.append({
                "sample_entry_id": new_entry_id,
                "sample_id": sample_id
            })
        
        return jsonify({
            "success": True,
            "message": f"Created {len(created_entries)} sample entries successfully",
            "data": created_entries
        }), 201
        
    except ValueError as e:
        db.session.rollback()
        print(f"DEBUG: ValueError: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Invalid date format. Use YYYY-MM-DD format: {str(e)}"
        }), 400
    except Exception as e:
        db.session.rollback()
        print(f"DEBUG: Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": f"Error creating sample entries: {str(e)}"
        }), 500
