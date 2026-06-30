from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import text
from app.extensions import db
from app.utils.auth_decorator import token_required
import logging

# Configure logging
logger = logging.getLogger(__name__)

sample_master_bp = Blueprint("sample_master", __name__)

# Constants
VALID_STATUSES = ['active', 'inactive']
DEFAULT_STATUS = 'active'
MAX_PAGE_SIZE = 100
DEFAULT_PAGE_SIZE = 50


def _utc_now():
    return datetime.now(timezone.utc)


def _validate_pagination_params():
    """Validate and normalize pagination parameters"""
    try:
        page = max(1, int(request.args.get("page", 1)))
        per_page = min(MAX_PAGE_SIZE, max(1, int(request.args.get("per_page", DEFAULT_PAGE_SIZE))))
        return page, per_page
    except ValueError:
        return 1, DEFAULT_PAGE_SIZE


def _validate_status(status):
    """Validate status field"""
    if status and status not in VALID_STATUSES:
        raise ValueError(f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}")
    return status or DEFAULT_STATUS


def _handle_db_error(func_name, error):
    """Centralized error handling"""
    logger.error(f"Error in {func_name}: {str(error)}")
    db.session.rollback()
    return jsonify({
        "success": False,
        "message": "Internal server error"
    }), 500


# ========================================
# SAMPLE TYPES MANAGEMENT
# ========================================

# Get all sample types
@sample_master_bp.route("/sample-types", methods=["GET"])
@token_required
def get_sample_types():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Get query parameters
        status_filter = request.args.get("status", "").strip()
        page, per_page = _validate_pagination_params()
        
        # Build base query
        query = """
            SELECT
                st.sample_type_id,
                st.lab_id,
                st.sample_type_name,
                st.description,
                st.status,
                st.created_at,
                st.updated_at
            FROM sample_types st
            WHERE st.lab_id = :lab_id
        """
        
        params = {"lab_id": lab_id}
        
        # Add status filter
        if status_filter:
            query += " AND st.status = :status"
            params["status"] = status_filter
        
        # Add ordering and pagination
        query += " ORDER BY st.sample_type_name"
        
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
        types = db.session.execute(text(query), params).fetchall()
        
        # Format results
        types_data = []
        for type_ in types:
            types_data.append({
                "sample_type_id": type_.sample_type_id,
                "lab_id": type_.lab_id,
                "sample_type_name": type_.sample_type_name,
                "description": type_.description,
                "status": type_.status,
                "created_at": type_.created_at.isoformat(),
                "updated_at": type_.updated_at.isoformat()
            })
        
        return jsonify({
            "success": True,
            "data": types_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page
            }
        })
        
    except Exception as e:
        return _handle_db_error("get_sample_types", e)


# Create sample type
@sample_master_bp.route("/sample-types", methods=["POST"])
@token_required
def create_sample_type():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        # Validate required fields
        if not data.get("sample_type_name"):
            return jsonify({
                "success": False,
                "message": "Sample type name is required"
            }), 400
        
        # Check if sample type name already exists
        existing_type = db.session.execute(text("""
            SELECT sample_type_id FROM sample_types 
            WHERE sample_type_name = :sample_type_name AND lab_id = :lab_id
        """), {
            "sample_type_name": data["sample_type_name"],
            "lab_id": lab_id
        }).fetchone()
        
        if existing_type:
            return jsonify({
                "success": False,
                "message": "Sample type name already exists"
            }), 400
        
        # Insert new sample type
        insert_query = """
            INSERT INTO sample_types (
                lab_id, sample_type_name, description, status, created_at, updated_at
            ) VALUES (
                :lab_id, :sample_type_name, :description, :status, :created_at, :updated_at
            ) RETURNING sample_type_id
        """
        
        params = {
            "lab_id": lab_id,
            "sample_type_name": data["sample_type_name"],
            "description": data.get("description"),
            "status": _validate_status(data.get("status")),
            "created_at": _utc_now(),
            "updated_at": _utc_now()
        }
        
        result = db.session.execute(text(insert_query), params)
        db.session.commit()
        new_type_id = result.fetchone()[0]
        
        return jsonify({
            "success": True,
            "message": "Sample type created successfully",
            "data": {
                "sample_type_id": new_type_id
            }
        }), 201
        
    except ValueError as e:
        db.session.rollback()
        logger.error(f"Validation error in create_sample_type: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Validation error: {str(e)}"
        }), 400
    except Exception as e:
        return _handle_db_error("create_sample_type", e)


# ========================================
# SAMPLE CONDITIONS MANAGEMENT
# ========================================

# Get all sample conditions
@sample_master_bp.route("/sample-conditions", methods=["GET"])
@token_required
def get_sample_conditions():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Get query parameters
        status_filter = request.args.get("status", "").strip()
        page, per_page = _validate_pagination_params()
        
        # Build base query
        query = """
            SELECT
                sc.sample_condition_id,
                sc.lab_id,
                sc.condition_name,
                sc.description,
                sc.status,
                sc.created_at,
                sc.updated_at
            FROM sample_conditions sc
            WHERE sc.lab_id = :lab_id
        """
        
        params = {"lab_id": lab_id}
        
        # Add status filter
        if status_filter:
            query += " AND sc.status = :status"
            params["status"] = status_filter
        
        # Add ordering and pagination
        query += " ORDER BY sc.condition_name"
        
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
        conditions = db.session.execute(text(query), params).fetchall()
        
        # Format results
        conditions_data = []
        for condition in conditions:
            conditions_data.append({
                "sample_condition_id": condition.sample_condition_id,
                "lab_id": condition.lab_id,
                "condition_name": condition.condition_name,
                "description": condition.description,
                "status": condition.status,
                "created_at": condition.created_at.isoformat(),
                "updated_at": condition.updated_at.isoformat()
            })
        
        return jsonify({
            "success": True,
            "data": conditions_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page
            }
        })
        
    except Exception as e:
        return _handle_db_error("get_sample_conditions", e)


# Create sample condition
@sample_master_bp.route("/sample-conditions", methods=["POST"])
@token_required
def create_sample_condition():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        # Validate required fields
        if not data.get("condition_name"):
            return jsonify({
                "success": False,
                "message": "Condition name is required"
            }), 400
        
        # Check if condition name already exists for this lab
        existing_condition = db.session.execute(text("""
            SELECT sample_condition_id FROM sample_conditions 
            WHERE condition_name = :condition_name AND lab_id = :lab_id
        """), {
            "condition_name": data["condition_name"],
            "lab_id": lab_id
        }).fetchone()
        
        if existing_condition:
            return jsonify({
                "success": False,
                "message": "Condition name already exists"
            }), 400
        
        # Insert new condition
        insert_query = """
            INSERT INTO sample_conditions (
                lab_id, condition_name, description, status, created_at, updated_at
            ) VALUES (
                :lab_id, :condition_name, :description, :status, :created_at, :updated_at
            ) RETURNING sample_condition_id
        """
        
        params = {
            "lab_id": lab_id,
            "condition_name": data["condition_name"],
            "description": data.get("description"),
            "status": _validate_status(data.get("status")),
            "created_at": _utc_now(),
            "updated_at": _utc_now()
        }
        
        result = db.session.execute(text(insert_query), params)
        db.session.commit()
        new_condition_id = result.fetchone()[0]
        
        return jsonify({
            "success": True,
            "message": "Sample condition created successfully",
            "data": {
                "sample_condition_id": new_condition_id
            }
        }), 201
        
    except ValueError as e:
        db.session.rollback()
        logger.error(f"Validation error in create_sample_condition: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Validation error: {str(e)}"
        }), 400
    except Exception as e:
        return _handle_db_error("create_sample_condition", e)


# Update sample condition
@sample_master_bp.route("/sample-conditions/<int:sample_condition_id>", methods=["PUT"])
@token_required
def update_sample_condition(sample_condition_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        # Check if condition exists and belongs to lab
        existing_condition = db.session.execute(text("""
            SELECT sample_condition_id FROM sample_conditions 
            WHERE sample_condition_id = :sample_condition_id AND lab_id = :lab_id
        """), {
            "sample_condition_id": sample_condition_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not existing_condition:
            return jsonify({
                "success": False,
                "message": "Sample condition not found or does not belong to your lab"
            }), 404
        
        # Check if new name conflicts with existing one
        new_name = data.get("condition_name")
        if new_name:
            name_check = db.session.execute(text("""
                SELECT sample_condition_id FROM sample_conditions 
                WHERE condition_name = :condition_name AND sample_condition_id != :sample_condition_id AND lab_id = :lab_id
            """), {
                "condition_name": new_name,
                "sample_condition_id": sample_condition_id,
                "lab_id": lab_id
            }).fetchone()
            
            if name_check:
                return jsonify({
                    "success": False,
                    "message": "Condition name already exists"
                }), 400
        
        # Build update query dynamically
        update_fields = []
        params = {
            "sample_condition_id": sample_condition_id,
            "updated_at": _utc_now()
        }
        
        if "condition_name" in data:
            update_fields.append("condition_name = :condition_name")
            params["condition_name"] = data["condition_name"]
        
        if "description" in data:
            update_fields.append("description = :description")
            params["description"] = data["description"]
        
        if "status" in data:
            update_fields.append("status = :status")
            params["status"] = _validate_status(data["status"])
        
        if not update_fields:
            return jsonify({
                "success": False,
                "message": "No fields to update"
            }), 400
        
        update_query = f"""
            UPDATE sample_conditions 
            SET {', '.join(update_fields)}, updated_at = :updated_at
            WHERE sample_condition_id = :sample_condition_id
        """
        
        db.session.execute(text(update_query), params)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Sample condition updated successfully"
        })
        
    except ValueError as e:
        db.session.rollback()
        logger.error(f"Validation error in update_sample_condition: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Validation error: {str(e)}"
        }), 400
    except Exception as e:
        return _handle_db_error("update_sample_condition", e)


# Delete sample condition
@sample_master_bp.route("/sample-conditions/<int:sample_condition_id>", methods=["DELETE"])
@token_required
def delete_sample_condition(sample_condition_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Check if condition exists and belongs to lab
        existing_condition = db.session.execute(text("""
            SELECT sample_condition_id FROM sample_conditions 
            WHERE sample_condition_id = :sample_condition_id AND lab_id = :lab_id
        """), {
            "sample_condition_id": sample_condition_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not existing_condition:
            return jsonify({
                "success": False,
                "message": "Sample condition not found or does not belong to your lab"
            }), 404
        
        # Check if condition is being used
        usage_check = db.session.execute(text("""
            SELECT COUNT(*) as count FROM sample_entries se
            JOIN samples s ON se.sample_id = s.sample_id
            WHERE se.sample_condition_id = :sample_condition_id AND s.lab_id = :lab_id
        """), {
            "sample_condition_id": sample_condition_id,
            "lab_id": lab_id
        }).fetchone()
        
        if usage_check.count > 0:
            return jsonify({
                "success": False,
                "message": "Cannot delete condition. It is being used in sample entries."
            }), 400
        
        # Delete condition
        db.session.execute(text("""
            DELETE FROM sample_conditions 
            WHERE sample_condition_id = :sample_condition_id AND lab_id = :lab_id
        """), {
            "sample_condition_id": sample_condition_id,
            "lab_id": lab_id
        })
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Sample condition deleted successfully"
        })
        
    except Exception as e:
        return _handle_db_error("delete_sample_condition", e)
