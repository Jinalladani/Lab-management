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


# ========================================
# MATERIAL CATEGORIES MANAGEMENT
# ========================================

# Get all material categories
@sample_master_bp.route("/material-categories", methods=["GET"])
@token_required
def get_material_categories():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Get query parameters
        status_filter = request.args.get("status", "").strip()
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))
        
        # Build base query
        query = """
            SELECT
                mc.material_category_id,
                mc.lab_id,
                mc.category_name,
                mc.description,
                mc.status,
                mc.created_at,
                mc.updated_at
            FROM material_categories mc
            WHERE mc.lab_id = :lab_id
        """
        
        params = {"lab_id": lab_id}
        
        # Add status filter
        if status_filter:
            query += " AND mc.status = :status"
            params["status"] = status_filter
        
        # Add ordering and pagination
        query += " ORDER BY mc.category_name"
        
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
        categories = db.session.execute(text(query), params).fetchall()
        
        # Format results
        categories_data = []
        for category in categories:
            categories_data.append({
                "material_category_id": category.material_category_id,
                "lab_id": category.lab_id,
                "category_name": category.category_name,
                "description": category.description,
                "status": category.status,
                "created_at": category.created_at.isoformat(),
                "updated_at": category.updated_at.isoformat()
            })
        
        return jsonify({
            "success": True,
            "data": categories_data,
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
            "message": f"Error fetching material categories: {str(e)}"
        }), 500


# Create material category
@sample_master_bp.route("/material-categories", methods=["POST"])
@token_required
def create_material_category():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        # Validate required fields
        if not data.get("category_name"):
            return jsonify({
                "success": False,
                "message": "Category name is required"
            }), 400
        
        # Check if category name already exists for this lab
        existing_category = db.session.execute(text("""
            SELECT material_category_id FROM material_categories 
            WHERE category_name = :category_name AND lab_id = :lab_id
        """), {
            "category_name": data["category_name"],
            "lab_id": lab_id
        }).fetchone()
        
        if existing_category:
            return jsonify({
                "success": False,
                "message": "Category name already exists for this lab"
            }), 400
        
        # Insert new category
        insert_query = """
            INSERT INTO material_categories (
                lab_id, category_name, description, status, created_by, created_at, updated_at
            ) VALUES (
                :lab_id, :category_name, :description, :status, :created_by, :created_at, :updated_at
            ) RETURNING material_category_id
        """
        
        params = {
            "lab_id": lab_id,
            "category_name": data["category_name"],
            "description": data.get("description"),
            "status": data.get("status", "active"),
            "created_by": g.jwt_payload.get("user_id"),
            "created_at": _utc_now(),
            "updated_at": _utc_now()
        }
        
        result = db.session.execute(text(insert_query), params)
        db.session.commit()
        new_category_id = result.fetchone()[0]
        
        return jsonify({
            "success": True,
            "message": "Material category created successfully",
            "data": {
                "material_category_id": new_category_id
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error creating material category: {str(e)}"
        }), 500


# Update material category
@sample_master_bp.route("/material-categories/<int:material_category_id>", methods=["PUT"])
@token_required
def update_material_category(material_category_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        # Check if category exists and belongs to lab
        existing_category = db.session.execute(text("""
            SELECT material_category_id FROM material_categories 
            WHERE material_category_id = :material_category_id AND lab_id = :lab_id
        """), {
            "material_category_id": material_category_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not existing_category:
            return jsonify({
                "success": False,
                "message": "Material category not found"
            }), 404
        
        # Check if new name conflicts with existing one for this lab
        new_name = data.get("category_name")
        if new_name:
            name_check = db.session.execute(text("""
                SELECT material_category_id FROM material_categories 
                WHERE lab_id = :lab_id AND category_name = :category_name AND material_category_id != :material_category_id
            """), {
                "lab_id": lab_id,
                "category_name": new_name,
                "material_category_id": material_category_id
            }).fetchone()
            
            if name_check:
                return jsonify({
                    "success": False,
                    "message": "Category name already exists for this lab"
                }), 400
        
        # Build update query dynamically
        update_fields = []
        params = {
            "material_category_id": material_category_id,
            "lab_id": lab_id,
            "updated_by": g.jwt_payload.get("user_id"),
            "updated_at": _utc_now()
        }
        
        if "category_name" in data:
            update_fields.append("category_name = :category_name")
            params["category_name"] = data["category_name"]
        
        if "description" in data:
            update_fields.append("description = :description")
            params["description"] = data["description"]
        
        if "status" in data:
            valid_statuses = ['active', 'inactive']
            if data["status"] not in valid_statuses:
                return jsonify({
                    "success": False,
                    "message": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
                }), 400
            update_fields.append("status = :status")
            params["status"] = data["status"]
        
        if not update_fields:
            return jsonify({
                "success": False,
                "message": "No fields to update"
            }), 400
        
        update_query = f"""
            UPDATE material_categories 
            SET {', '.join(update_fields)}, updated_by = :updated_by, updated_at = :updated_at
            WHERE material_category_id = :material_category_id AND lab_id = :lab_id
        """
        
        db.session.execute(text(update_query), params)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Material category updated successfully"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error updating material category: {str(e)}"
        }), 500


# Delete material category
@sample_master_bp.route("/material-categories/<int:material_category_id>", methods=["DELETE"])
@token_required
def delete_material_category(material_category_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Check if category exists and belongs to lab
        existing_category = db.session.execute(text("""
            SELECT material_category_id FROM material_categories 
            WHERE material_category_id = :material_category_id AND lab_id = :lab_id
        """), {
            "material_category_id": material_category_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not existing_category:
            return jsonify({
                "success": False,
                "message": "Material category not found"
            }), 404
        
        # Check if category is being used
        usage_check = db.session.execute(text("""
            SELECT COUNT(*) as count FROM material_types 
            WHERE material_category_id = :material_category_id
        """), {
            "material_category_id": material_category_id
        }).fetchone()
        
        if usage_check.count > 0:
            return jsonify({
                "success": False,
                "message": "Cannot delete category. It has material types associated with it."
            }), 400
        
        # Delete category
        db.session.execute(text("""
            DELETE FROM material_categories 
            WHERE material_category_id = :material_category_id AND lab_id = :lab_id
        """), {
            "material_category_id": material_category_id,
            "lab_id": lab_id
        })
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Material category deleted successfully"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error deleting material category: {str(e)}"
        }), 500


# ========================================
# MATERIAL TYPES MANAGEMENT
# ========================================

# Get all material types
@sample_master_bp.route("/material-types", methods=["GET"])
@token_required
def get_material_types():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Get query parameters
        category_id = request.args.get("material_category_id", "").strip()
        status_filter = request.args.get("status", "").strip()
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))
        
        # Build base query
        query = """
            SELECT
                mt.material_type_id,
                mt.lab_id,
                mt.material_category_id,
                mc.category_name,
                mt.type_name,
                mt.description,
                mt.status,
                mt.created_at,
                mt.updated_at
            FROM material_types mt
            LEFT JOIN material_categories mc ON mt.material_category_id = mc.material_category_id
            WHERE mt.lab_id = :lab_id
        """
        
        params = {"lab_id": lab_id}
        
        # Add category filter
        if category_id:
            query += " AND mt.material_category_id = :material_category_id"
            params["material_category_id"] = category_id
        
        # Add status filter
        if status_filter:
            query += " AND mt.status = :status"
            params["status"] = status_filter
        
        # Add ordering and pagination
        query += " ORDER BY mc.category_name, mt.type_name"
        
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
                "material_type_id": type_.material_type_id,
                "lab_id": type_.lab_id,
                "material_category_id": type_.material_category_id,
                "category_name": type_.category_name,
                "type_name": type_.type_name,
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
        return jsonify({
            "success": False,
            "message": f"Error fetching material types: {str(e)}"
        }), 500


# Create material type
@sample_master_bp.route("/material-types", methods=["POST"])
@token_required
def create_material_type():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        # Validate required fields
        if not data.get("material_category_id"):
            return jsonify({
                "success": False,
                "message": "Material category ID is required"
            }), 400
        
        if not data.get("type_name"):
            return jsonify({
                "success": False,
                "message": "Type name is required"
            }), 400
        
        # Check if category exists and belongs to lab
        category_check = db.session.execute(text("""
            SELECT material_category_id FROM material_categories 
            WHERE material_category_id = :material_category_id AND lab_id = :lab_id
        """), {
            "material_category_id": data["material_category_id"],
            "lab_id": lab_id
        }).fetchone()
        
        if not category_check:
            return jsonify({
                "success": False,
                "message": "Material category not found"
            }), 404
        
        # Check if type name already exists for this category and lab
        existing_type = db.session.execute(text("""
            SELECT material_type_id FROM material_types 
            WHERE material_category_id = :material_category_id AND type_name = :type_name AND lab_id = :lab_id
        """), {
            "material_category_id": data["material_category_id"],
            "type_name": data["type_name"],
            "lab_id": lab_id
        }).fetchone()
        
        if existing_type:
            return jsonify({
                "success": False,
                "message": "Type name already exists for this category"
            }), 400
        
        # Insert new type
        insert_query = """
            INSERT INTO material_types (
                lab_id, material_category_id, type_name, description, status, created_by, created_at, updated_at
            ) VALUES (
                :lab_id, :material_category_id, :type_name, :description, :status, :created_by, :created_at, :updated_at
            ) RETURNING material_type_id
        """
        
        params = {
            "lab_id": lab_id,
            "material_category_id": data["material_category_id"],
            "type_name": data["type_name"],
            "description": data.get("description"),
            "status": data.get("status", "active"),
            "created_by": g.jwt_payload.get("user_id"),
            "created_at": _utc_now(),
            "updated_at": _utc_now()
        }
        
        result = db.session.execute(text(insert_query), params)
        db.session.commit()
        new_type_id = result.fetchone()[0]
        
        return jsonify({
            "success": True,
            "message": "Material type created successfully",
            "data": {
                "material_type_id": new_type_id
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error creating material type: {str(e)}"
        }), 500


# ========================================
# TESTING DAYS MANAGEMENT
# ========================================

# Get all testing days
@sample_master_bp.route("/testing-days", methods=["GET"])
@token_required
def get_testing_days():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Get query parameters
        status_filter = request.args.get("status", "").strip()
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))
        
        # Build base query
        query = """
            SELECT
                td.testing_day_id,
                td.lab_id,
                td.days,
                td.description,
                td.status,
                td.created_at,
                td.updated_at
            FROM testing_days td
            WHERE td.lab_id = :lab_id
        """
        
        params = {"lab_id": lab_id}
        
        # Add status filter
        if status_filter:
            query += " AND td.status = :status"
            params["status"] = status_filter
        
        # Add ordering and pagination
        query += " ORDER BY td.days"
        
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
        days = db.session.execute(text(query), params).fetchall()
        
        # Format results
        days_data = []
        for day in days:
            days_data.append({
                "testing_day_id": day.testing_day_id,
                "lab_id": day.lab_id,
                "days": day.days,
                "description": day.description,
                "status": day.status,
                "created_at": day.created_at.isoformat(),
                "updated_at": day.updated_at.isoformat()
            })
        
        return jsonify({
            "success": True,
            "data": days_data,
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
            "message": f"Error fetching testing days: {str(e)}"
        }), 500


# Create testing days
@sample_master_bp.route("/testing-days", methods=["POST"])
@token_required
def create_testing_days():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        # Validate required fields
        if not data.get("days"):
            return jsonify({
                "success": False,
                "message": "Days is required"
            }), 400
        
        # Check if days already exists for this lab
        existing_days = db.session.execute(text("""
            SELECT testing_day_id FROM testing_days 
            WHERE days = :days AND lab_id = :lab_id
        """), {
            "days": data["days"],
            "lab_id": lab_id
        }).fetchone()
        
        if existing_days:
            return jsonify({
                "success": False,
                "message": "Testing days already exists for this lab"
            }), 400
        
        # Insert new testing days
        insert_query = """
            INSERT INTO testing_days (
                lab_id, days, description, status, created_by, created_at, updated_at
            ) VALUES (
                :lab_id, :days, :description, :status, :created_by, :created_at, :updated_at
            ) RETURNING testing_day_id
        """
        
        params = {
            "lab_id": lab_id,
            "days": data["days"],
            "description": data.get("description"),
            "status": data.get("status", "active"),
            "created_by": g.jwt_payload.get("user_id"),
            "created_at": _utc_now(),
            "updated_at": _utc_now()
        }
        
        result = db.session.execute(text(insert_query), params)
        db.session.commit()
        new_days_id = result.fetchone()[0]
        
        return jsonify({
            "success": True,
            "message": "Testing days created successfully",
            "data": {
                "testing_day_id": new_days_id
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error creating testing days: {str(e)}"
        }), 500


# ========================================
# SAMPLE GRADES MANAGEMENT
# ========================================

# Get all sample grades
@sample_master_bp.route("/sample-grades", methods=["GET"])
@token_required
def get_sample_grades():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Get query parameters
        category_id = request.args.get("material_category_id", "").strip()
        status_filter = request.args.get("status", "").strip()
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))
        
        # Build base query
        query = """
            SELECT
                sg.sample_grade_id,
                sg.lab_id,
                sg.grade_name,
                sg.grade_description,
                sg.material_category_id,
                mc.category_name,
                sg.status,
                sg.created_at,
                sg.updated_at
            FROM sample_grades sg
            LEFT JOIN material_categories mc ON sg.material_category_id = mc.material_category_id
            WHERE sg.lab_id = :lab_id
        """
        
        params = {"lab_id": lab_id}
        
        # Add category filter
        if category_id:
            query += " AND sg.material_category_id = :material_category_id"
            params["material_category_id"] = category_id
        
        # Add status filter
        if status_filter:
            query += " AND sg.status = :status"
            params["status"] = status_filter
        
        # Add ordering and pagination
        query += " ORDER BY mc.category_name, sg.grade_name"
        
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
        grades = db.session.execute(text(query), params).fetchall()
        
        # Format results
        grades_data = []
        for grade in grades:
            grades_data.append({
                "sample_grade_id": grade.sample_grade_id,
                "lab_id": grade.lab_id,
                "grade_name": grade.grade_name,
                "grade_description": grade.grade_description,
                "material_category_id": grade.material_category_id,
                "category_name": grade.category_name,
                "status": grade.status,
                "created_at": grade.created_at.isoformat(),
                "updated_at": grade.updated_at.isoformat()
            })
        
        return jsonify({
            "success": True,
            "data": grades_data,
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
            "message": f"Error fetching sample grades: {str(e)}"
        }), 500


# Create sample grade
@sample_master_bp.route("/sample-grades", methods=["POST"])
@token_required
def create_sample_grade():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        # Validate required fields
        if not data.get("grade_name"):
            return jsonify({
                "success": False,
                "message": "Grade name is required"
            }), 400
        
        # Check if material category exists and belongs to lab (if provided)
        if data.get("material_category_id"):
            category_check = db.session.execute(text("""
                SELECT material_category_id FROM material_categories 
                WHERE material_category_id = :material_category_id AND lab_id = :lab_id
            """), {
                "material_category_id": data["material_category_id"],
                "lab_id": lab_id
            }).fetchone()
            
            if not category_check:
                return jsonify({
                    "success": False,
                    "message": "Material category not found"
                }), 404
        
        # Check if grade name already exists for this lab
        existing_grade = db.session.execute(text("""
            SELECT sample_grade_id FROM sample_grades 
            WHERE grade_name = :grade_name AND lab_id = :lab_id
        """), {
            "grade_name": data["grade_name"],
            "lab_id": lab_id
        }).fetchone()
        
        if existing_grade:
            return jsonify({
                "success": False,
                "message": "Grade name already exists for this lab"
            }), 400
        
        # Insert new grade
        insert_query = """
            INSERT INTO sample_grades (
                lab_id, grade_name, grade_description, material_category_id, 
                status, created_by, created_at, updated_at
            ) VALUES (
                :lab_id, :grade_name, :grade_description, :material_category_id, 
                :status, :created_by, :created_at, :updated_at
            ) RETURNING sample_grade_id
        """
        
        params = {
            "lab_id": lab_id,
            "grade_name": data["grade_name"],
            "grade_description": data.get("grade_description"),
            "material_category_id": data.get("material_category_id"),
            "status": data.get("status", "active"),
            "created_by": g.jwt_payload.get("user_id"),
            "created_at": _utc_now(),
            "updated_at": _utc_now()
        }
        
        result = db.session.execute(text(insert_query), params)
        db.session.commit()
        new_grade_id = result.fetchone()[0]
        
        return jsonify({
            "success": True,
            "message": "Sample grade created successfully",
            "data": {
                "sample_grade_id": new_grade_id
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error creating sample grade: {str(e)}"
        }), 500


# Update sample grade
@sample_master_bp.route("/sample-grades/<int:sample_grade_id>", methods=["PUT"])
@token_required
def update_sample_grade(sample_grade_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        # Check if grade exists and belongs to lab
        existing_grade = db.session.execute(text("""
            SELECT sample_grade_id FROM sample_grades 
            WHERE sample_grade_id = :sample_grade_id AND lab_id = :lab_id
        """), {
            "sample_grade_id": sample_grade_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not existing_grade:
            return jsonify({
                "success": False,
                "message": "Sample grade not found"
            }), 404
        
        # Check if new name conflicts with existing one for this lab
        new_name = data.get("grade_name")
        if new_name:
            name_check = db.session.execute(text("""
                SELECT sample_grade_id FROM sample_grades 
                WHERE lab_id = :lab_id AND grade_name = :grade_name AND sample_grade_id != :sample_grade_id
            """), {
                "lab_id": lab_id,
                "grade_name": new_name,
                "sample_grade_id": sample_grade_id
            }).fetchone()
            
            if name_check:
                return jsonify({
                    "success": False,
                    "message": "Grade name already exists for this lab"
                }), 400
        
        # Check if material category exists and belongs to lab (if provided)
        if data.get("material_category_id"):
            category_check = db.session.execute(text("""
                SELECT material_category_id FROM material_categories 
                WHERE material_category_id = :material_category_id AND lab_id = :lab_id
            """), {
                "material_category_id": data["material_category_id"],
                "lab_id": lab_id
            }).fetchone()
            
            if not category_check:
                return jsonify({
                    "success": False,
                    "message": "Material category not found"
                }), 404
        
        # Build update query dynamically
        update_fields = []
        params = {
            "sample_grade_id": sample_grade_id,
            "lab_id": lab_id,
            "updated_by": g.jwt_payload.get("user_id"),
            "updated_at": _utc_now()
        }
        
        if "grade_name" in data:
            update_fields.append("grade_name = :grade_name")
            params["grade_name"] = data["grade_name"]
        
        if "grade_description" in data:
            update_fields.append("grade_description = :grade_description")
            params["grade_description"] = data["grade_description"]
        
        if "material_category_id" in data:
            update_fields.append("material_category_id = :material_category_id")
            params["material_category_id"] = data["material_category_id"]
        
        if "status" in data:
            valid_statuses = ['active', 'inactive']
            if data["status"] not in valid_statuses:
                return jsonify({
                    "success": False,
                    "message": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
                }), 400
            update_fields.append("status = :status")
            params["status"] = data["status"]
        
        if not update_fields:
            return jsonify({
                "success": False,
                "message": "No fields to update"
            }), 400
        
        update_query = f"""
            UPDATE sample_grades 
            SET {', '.join(update_fields)}, updated_by = :updated_by, updated_at = :updated_at
            WHERE sample_grade_id = :sample_grade_id AND lab_id = :lab_id
        """
        
        db.session.execute(text(update_query), params)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Sample grade updated successfully"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error updating sample grade: {str(e)}"
        }), 500


# Delete sample grade
@sample_master_bp.route("/sample-grades/<int:sample_grade_id>", methods=["DELETE"])
@token_required
def delete_sample_grade(sample_grade_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Check if grade exists and belongs to lab
        existing_grade = db.session.execute(text("""
            SELECT sample_grade_id FROM sample_grades 
            WHERE sample_grade_id = :sample_grade_id AND lab_id = :lab_id
        """), {
            "sample_grade_id": sample_grade_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not existing_grade:
            return jsonify({
                "success": False,
                "message": "Sample grade not found"
            }), 404
        
        # Check if grade is being used in sample entries
        usage_check = db.session.execute(text("""
            SELECT COUNT(*) as count FROM sample_entries 
            WHERE sample_grade = (SELECT grade_name FROM sample_grades WHERE sample_grade_id = :sample_grade_id)
            AND lab_id = :lab_id
        """), {
            "sample_grade_id": sample_grade_id,
            "lab_id": lab_id
        }).fetchone()
        
        if usage_check.count > 0:
            return jsonify({
                "success": False,
                "message": "Cannot delete grade. It is being used in sample entries."
            }), 400
        
        # Delete grade
        db.session.execute(text("""
            DELETE FROM sample_grades 
            WHERE sample_grade_id = :sample_grade_id AND lab_id = :lab_id
        """), {
            "sample_grade_id": sample_grade_id,
            "lab_id": lab_id
        })
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Sample grade deleted successfully"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error deleting sample grade: {str(e)}"
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
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))
        
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
        return jsonify({
            "success": False,
            "message": f"Error fetching sample types: {str(e)}"
        }), 500


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
            "status": data.get("status", "active"),
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
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error creating sample type: {str(e)}"
        }), 500


# Update sample type
@sample_master_bp.route("/sample-types/<int:sample_type_id>", methods=["PUT"])
@token_required
def update_sample_type(sample_type_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        # Check if sample type exists and belongs to lab
        existing_type = db.session.execute(text("""
            SELECT sample_type_id FROM sample_types 
            WHERE sample_type_id = :sample_type_id AND lab_id = :lab_id
        """), {
            "sample_type_id": sample_type_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not existing_type:
            return jsonify({
                "success": False,
                "message": "Sample type not found or does not belong to your lab"
            }), 404
        
        # Check if new name conflicts with existing one
        new_name = data.get("sample_type_name")
        if new_name:
            name_check = db.session.execute(text("""
                SELECT sample_type_id FROM sample_types 
                WHERE sample_type_name = :sample_type_name AND sample_type_id != :sample_type_id AND lab_id = :lab_id
            """), {
                "sample_type_name": new_name,
                "sample_type_id": sample_type_id,
                "lab_id": lab_id
            }).fetchone()
            
            if name_check:
                return jsonify({
                    "success": False,
                    "message": "Sample type name already exists"
                }), 400
        
        # Build update query dynamically
        update_fields = []
        params = {
            "sample_type_id": sample_type_id,
            "lab_id": lab_id,
            "updated_at": _utc_now()
        }
        
        if "sample_type_name" in data:
            update_fields.append("sample_type_name = :sample_type_name")
            params["sample_type_name"] = data["sample_type_name"]
        
        if "description" in data:
            update_fields.append("description = :description")
            params["description"] = data["description"]
        
        if "status" in data:
            valid_statuses = ['active', 'inactive']
            if data["status"] not in valid_statuses:
                return jsonify({
                    "success": False,
                    "message": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
                }), 400
            update_fields.append("status = :status")
            params["status"] = data["status"]
        
        if not update_fields:
            return jsonify({
                "success": False,
                "message": "No fields to update"
            }), 400
        
        update_query = f"""
            UPDATE sample_types 
            SET {', '.join(update_fields)}, updated_at = :updated_at
            WHERE sample_type_id = :sample_type_id
        """
        
        db.session.execute(text(update_query), params)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Sample type updated successfully"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error updating sample type: {str(e)}"
        }), 500


# Delete sample type
@sample_master_bp.route("/sample-types/<int:sample_type_id>", methods=["DELETE"])
@token_required
def delete_sample_type(sample_type_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Check if sample type exists and belongs to lab
        existing_type = db.session.execute(text("""
            SELECT sample_type_id FROM sample_types 
            WHERE sample_type_id = :sample_type_id AND lab_id = :lab_id
        """), {
            "sample_type_id": sample_type_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not existing_type:
            return jsonify({
                "success": False,
                "message": "Sample type not found or does not belong to your lab"
            }), 404
        
        # Check if sample type is being used
        usage_check = db.session.execute(text("""
            SELECT COUNT(*) as count FROM sample_entries se
            JOIN samples s ON se.sample_id = s.sample_id
            WHERE se.sample_type_id = :sample_type_id AND s.lab_id = :lab_id
        """), {
            "sample_type_id": sample_type_id,
            "lab_id": lab_id
        }).fetchone()
        
        if usage_check.count > 0:
            return jsonify({
                "success": False,
                "message": "Cannot delete sample type. It is being used in sample entries."
            }), 400
        
        # Delete sample type
        db.session.execute(text("""
            DELETE FROM sample_types 
            WHERE sample_type_id = :sample_type_id AND lab_id = :lab_id
        """), {
            "sample_type_id": sample_type_id,
            "lab_id": lab_id
        })
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Sample type deleted successfully"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error deleting sample type: {str(e)}"
        }), 500


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
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))
        
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
        return jsonify({
            "success": False,
            "message": f"Error fetching sample conditions: {str(e)}"
        }), 500


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
            "status": data.get("status", DEFAULT_STATUS),
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
        db.session.rollback()
        logger.error(f"Error creating sample condition: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500


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
            valid_statuses = ['active', 'inactive']
            if data["status"] not in valid_statuses:
                return jsonify({
                    "success": False,
                    "message": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
                }), 400
            update_fields.append("status = :status")
            params["status"] = data["status"]
        
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
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error updating sample condition: {str(e)}"
        }), 500


# Delete sample condition
@sample_master_bp.route("/sample-conditions/<int:sample_condition_id>", methods=["DELETE"])
@token_required
def delete_sample_condition(sample_condition_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Check if condition exists
        existing_condition = db.session.execute(text("""
            SELECT sample_condition_id FROM sample_conditions 
            WHERE sample_condition_id = :sample_condition_id
        """), {
            "sample_condition_id": sample_condition_id
        }).fetchone()
        
        if not existing_condition:
            return jsonify({
                "success": False,
                "message": "Sample condition not found"
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
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error deleting sample condition: {str(e)}"
        }), 500


# ========================================
# SAMPLE LOCATIONS MANAGEMENT
# ========================================

# Get all sample locations for lab
@sample_master_bp.route("/sample-locations", methods=["GET"])
@token_required
def get_sample_locations():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Get query parameters
        status_filter = request.args.get("status", "").strip()
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))
        
        # Build base query
        query = """
            SELECT
                sl.sample_location_id,
                sl.lab_id,
                sl.location_name,
                sl.description,
                sl.status,
                sl.created_by,
                sl.updated_by,
                sl.created_at,
                sl.updated_at
            FROM sample_locations sl
        """
        
        params = {}
        
        # Add lab filter (always filter by lab)
        query += " WHERE sl.lab_id = :lab_id"
        params["lab_id"] = lab_id
        
        # Add status filter
        if status_filter:
            query += " AND sl.status = :status"
            params["status"] = status_filter
        
        # Add ordering and pagination
        query += " ORDER BY sl.location_name"
        
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
        locations = db.session.execute(text(query), params).fetchall()
        
        # Format results
        locations_data = []
        for location in locations:
            locations_data.append({
                "sample_location_id": location.sample_location_id,
                "lab_id": location.lab_id,
                "location_name": location.location_name,
                "description": location.description,
                "status": location.status,
                "created_by": location.created_by,
                "updated_by": location.updated_by,
                "created_at": location.created_at.isoformat(),
                "updated_at": location.updated_at.isoformat()
            })
        
        return jsonify({
            "success": True,
            "data": locations_data,
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
            "message": f"Error fetching sample locations: {str(e)}"
        }), 500


# Create sample location
@sample_master_bp.route("/sample-locations", methods=["POST"])
@token_required
def create_sample_location():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        # Validate required fields
        if not data.get("location_name"):
            return jsonify({
                "success": False,
                "message": "Location name is required"
            }), 400
        
        # Check if location name already exists for this lab
        existing_location = db.session.execute(text("""
            SELECT sample_location_id FROM sample_locations 
            WHERE lab_id = :lab_id AND location_name = :location_name
        """), {
            "lab_id": lab_id,
            "location_name": data["location_name"]
        }).fetchone()
        
        if existing_location:
            return jsonify({
                "success": False,
                "message": "Location name already exists for this lab"
            }), 400
        
        # Insert new location
        insert_query = """
            INSERT INTO sample_locations (
                lab_id, location_name, description, status, created_by, created_at, updated_at
            ) VALUES (
                :lab_id, :location_name, :description, :status, :created_by, :created_at, :updated_at
            ) RETURNING sample_location_id
        """
        
        params = {
            "lab_id": lab_id,
            "location_name": data["location_name"],
            "description": data.get("description"),
            "status": data.get("status", "active"),
            "created_by": g.jwt_payload.get("user_id"),
            "created_at": _utc_now(),
            "updated_at": _utc_now()
        }
        
        result = db.session.execute(text(insert_query), params)
        db.session.commit()
        new_location_id = result.fetchone()[0]
        
        return jsonify({
            "success": True,
            "message": "Sample location created successfully",
            "data": {
                "sample_location_id": new_location_id
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error creating sample location: {str(e)}"
        }), 500


# Update sample location
@sample_master_bp.route("/sample-locations/<int:sample_location_id>", methods=["PUT"])
@token_required
def update_sample_location(sample_location_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        # Check if location exists and belongs to lab
        existing_location = db.session.execute(text("""
            SELECT sample_location_id FROM sample_locations 
            WHERE sample_location_id = :sample_location_id AND lab_id = :lab_id
        """), {
            "sample_location_id": sample_location_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not existing_location:
            return jsonify({
                "success": False,
                "message": "Sample location not found"
            }), 404
        
        # Check if new name conflicts with existing one for this lab
        new_name = data.get("location_name")
        if new_name:
            name_check = db.session.execute(text("""
                SELECT sample_location_id FROM sample_locations 
                WHERE lab_id = :lab_id AND location_name = :location_name AND sample_location_id != :sample_location_id
            """), {
                "lab_id": lab_id,
                "location_name": new_name,
                "sample_location_id": sample_location_id
            }).fetchone()
            
            if name_check:
                return jsonify({
                    "success": False,
                    "message": "Location name already exists for this lab"
                }), 400
        
        # Build update query dynamically
        update_fields = []
        params = {
            "sample_location_id": sample_location_id,
            "lab_id": lab_id,
            "updated_by": g.jwt_payload.get("user_id"),
            "updated_at": _utc_now()
        }
        
        if "location_name" in data:
            update_fields.append("location_name = :location_name")
            params["location_name"] = data["location_name"]
        
        if "description" in data:
            update_fields.append("description = :description")
            params["description"] = data["description"]
        
        if "status" in data:
            valid_statuses = ['active', 'inactive']
            if data["status"] not in valid_statuses:
                return jsonify({
                    "success": False,
                    "message": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
                }), 400
            update_fields.append("status = :status")
            params["status"] = data["status"]
        
        if not update_fields:
            return jsonify({
                "success": False,
                "message": "No fields to update"
            }), 400
        
        update_query = f"""
            UPDATE sample_locations 
            SET {', '.join(update_fields)}, updated_by = :updated_by, updated_at = :updated_at
            WHERE sample_location_id = :sample_location_id AND lab_id = :lab_id
        """
        
        db.session.execute(text(update_query), params)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Sample location updated successfully"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error updating sample location: {str(e)}"
        }), 500


# Delete sample location
@sample_master_bp.route("/sample-locations/<int:sample_location_id>", methods=["DELETE"])
@token_required
def delete_sample_location(sample_location_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Check if location exists and belongs to lab
        existing_location = db.session.execute(text("""
            SELECT sample_location_id FROM sample_locations 
            WHERE sample_location_id = :sample_location_id AND lab_id = :lab_id
        """), {
            "sample_location_id": sample_location_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not existing_location:
            return jsonify({
                "success": False,
                "message": "Sample location not found"
            }), 404
        
        # Check if location is being used
        usage_check = db.session.execute(text("""
            SELECT COUNT(*) as count FROM sample_entries 
            WHERE sample_location_id = :sample_location_id
        """), {
            "sample_location_id": sample_location_id
        }).fetchone()
        
        if usage_check.count > 0:
            return jsonify({
                "success": False,
                "message": "Cannot delete location. It is being used in sample entries."
            }), 400
        
        # Delete location
        db.session.execute(text("""
            DELETE FROM sample_locations 
            WHERE sample_location_id = :sample_location_id AND lab_id = :lab_id
        """), {
            "sample_location_id": sample_location_id,
            "lab_id": lab_id
        })
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Sample location deleted successfully"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error deleting sample location: {str(e)}"
        }), 500


# ========================================
# SAMPLE TYPE TESTS MANAGEMENT
# ========================================

# Get sample type tests
@sample_master_bp.route("/sample-type-tests", methods=["GET"])
@token_required
def get_sample_type_tests():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Get query parameters
        sample_type_id = request.args.get("sample_type_id", "").strip()
        status_filter = request.args.get("status", "").strip()
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))
        
        # Build base query
        query = """
            SELECT
                stt.sample_type_test_id,
                stt.sample_type_id,
                st.sample_type_name,
                stt.test_name,
                stt.description,
                stt.default_days,
                stt.status,
                stt.created_at,
                stt.updated_at
            FROM sample_type_tests stt
            LEFT JOIN sample_types st ON stt.sample_type_id = st.sample_type_id
        """
        
        params = {}
        
        # Add filters
        where_clauses = []
        if sample_type_id:
            where_clauses.append("stt.sample_type_id = :sample_type_id")
            params["sample_type_id"] = sample_type_id
        
        if status_filter:
            where_clauses.append("stt.status = :status")
            params["status"] = status_filter
        
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
        
        # Add ordering and pagination
        query += " ORDER BY st.sample_type_name, stt.test_name"
        
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
        tests = db.session.execute(text(query), params).fetchall()
        
        # Format results
        tests_data = []
        for test in tests:
            tests_data.append({
                "sample_type_test_id": test.sample_type_test_id,
                "sample_type_id": test.sample_type_id,
                "sample_type_name": test.sample_type_name,
                "test_name": test.test_name,
                "description": test.description,
                "default_days": test.default_days,
                "status": test.status,
                "created_at": test.created_at.isoformat(),
                "updated_at": test.updated_at.isoformat()
            })
        
        return jsonify({
            "success": True,
            "data": tests_data,
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
            "message": f"Error fetching sample type tests: {str(e)}"
        }), 500


# Create sample type test
@sample_master_bp.route("/sample-type-tests", methods=["POST"])
@token_required
def create_sample_type_test():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json()
        
        # Validate required fields
        required_fields = ["sample_type_id", "test_name"]
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    "success": False,
                    "message": f"{field} is required"
                }), 400
        
        # Validate sample type exists
        type_check = db.session.execute(text("""
            SELECT sample_type_id FROM sample_types 
            WHERE sample_type_id = :sample_type_id
        """), {
            "sample_type_id": data["sample_type_id"]
        }).fetchone()
        
        if not type_check:
            return jsonify({
                "success": False,
                "message": "Sample type not found"
            }), 404
        
        # Check if test name already exists for this sample type
        existing_test = db.session.execute(text("""
            SELECT sample_type_test_id FROM sample_type_tests 
            WHERE sample_type_id = :sample_type_id AND test_name = :test_name
        """), {
            "sample_type_id": data["sample_type_id"],
            "test_name": data["test_name"]
        }).fetchone()
        
        if existing_test:
            return jsonify({
                "success": False,
                "message": "Test name already exists for this sample type"
            }), 400
        
        # Insert new test
        insert_query = """
            INSERT INTO sample_type_tests (
                sample_type_id, test_name, description, default_days, status, created_at, updated_at
            ) VALUES (
                :sample_type_id, :test_name, :description, :default_days, :status, :created_at, :updated_at
            ) RETURNING sample_type_test_id
        """
        
        params = {
            "sample_type_id": data["sample_type_id"],
            "test_name": data["test_name"],
            "description": data.get("description"),
            "default_days": data.get("default_days"),
            "status": data.get("status", "active"),
            "created_at": _utc_now(),
            "updated_at": _utc_now()
        }
        
        result = db.session.execute(text(insert_query), params)
        db.session.commit()
        new_test_id = result.fetchone()[0]
        
        return jsonify({
            "success": True,
            "message": "Sample type test created successfully",
            "data": {
                "sample_type_test_id": new_test_id
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error creating sample type test: {str(e)}"
        }), 500


# Delete sample type test
@sample_master_bp.route("/sample-type-tests/<int:sample_type_test_id>", methods=["DELETE"])
@token_required
def delete_sample_type_test(sample_type_test_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Check if test exists
        existing_test = db.session.execute(text("""
            SELECT sample_type_test_id FROM sample_type_tests 
            WHERE sample_type_test_id = :sample_type_test_id
        """), {
            "sample_type_test_id": sample_type_test_id
        }).fetchone()
        
        if not existing_test:
            return jsonify({
                "success": False,
                "message": "Sample type test not found"
            }), 404
        
        # Check if test is being used
        usage_check = db.session.execute(text("""
            SELECT COUNT(*) as count FROM sample_entry_tests 
            WHERE test_name = (SELECT test_name FROM sample_type_tests WHERE sample_type_test_id = :sample_type_test_id)
        """), {
            "sample_type_test_id": sample_type_test_id
        }).fetchone()
        
        if usage_check.count > 0:
            return jsonify({
                "success": False,
                "message": "Cannot delete test. It is being used in sample entries."
            }), 400
        
        # Delete test
        db.session.execute(text("""
            DELETE FROM sample_type_tests 
            WHERE sample_type_test_id = :sample_type_test_id
        """), {
            "sample_type_test_id": sample_type_test_id
        })
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Sample type test deleted successfully"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error deleting sample type test: {str(e)}"
        }), 500
