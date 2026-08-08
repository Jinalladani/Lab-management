from flask import Blueprint, jsonify, request, g
from app.utils.auth_decorator import token_required
from app.utils.permissions import permission_required
from sqlalchemy import text
from app.extensions import db
from datetime import datetime

roles_bp = Blueprint("roles", __name__)


@roles_bp.route("/list", methods=["GET"])
@token_required
@permission_required("user.view")
def get_lab_roles():
    """Get all global roles with user count"""
    try:
        roles_query = text("""
            SELECT r.role_id, r.role_name, r.description, 
                   r.created_at, r.updated_at,
                   COUNT(u.user_id) as user_count
            FROM roles r
            LEFT JOIN users u ON r.role_id = u.role_id
            GROUP BY r.role_id, r.role_name, r.description, r.created_at, r.updated_at
            ORDER BY r.created_at DESC
        """)
        
        result = db.session.execute(roles_query)
        roles = result.fetchall()

        role_list = []
        for role in roles:
            role_list.append({
                "role_id": role.role_id,
                "role_name": role.role_name,
                "description": role.description,
                "user_count": role.user_count or 0,
                "created_at": role.created_at.isoformat() if role.created_at else None,
                "updated_at": role.updated_at.isoformat() if role.updated_at else None
            })

        return jsonify({
            "success": True,
            "data": {
                "roles": role_list,
                "total_count": len(role_list)
            },
            "message": f"Found {len(role_list)} global roles"
        }), 200

    except Exception as e:
        print(f"Error fetching roles: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch roles",
            "error": str(e)
        }), 500


@roles_bp.route("/<int:role_id>", methods=["GET"])
@token_required
@permission_required("user.view")
def get_role_details(role_id):
    """Get details of a specific role"""
    try:
        query = text("""
            SELECT r.role_id, r.role_name, r.description, 
                   r.created_at, r.updated_at,
                   COUNT(u.user_id) as user_count
            FROM roles r
            LEFT JOIN users u ON r.role_id = u.role_id
            WHERE r.role_id = :role_id
            GROUP BY r.role_id, r.role_name, r.description, r.created_at, r.updated_at
        """)
        role = db.session.execute(query, {"role_id": role_id}).fetchone()
        
        if not role:
            return jsonify({
                "success": False,
                "message": "Role not found"
            }), 404

        return jsonify({
            "success": True,
            "data": {
                "role_id": role.role_id,
                "role_name": role.role_name,
                "description": role.description,
                "user_count": role.user_count or 0,
                "created_at": role.created_at.isoformat() if role.created_at else None,
                "updated_at": role.updated_at.isoformat() if role.updated_at else None
            }
        }), 200

    except Exception as e:
        print(f"Error fetching role details: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch role details",
            "error": str(e)
        }), 500


@roles_bp.route("", methods=["POST"])
@roles_bp.route("/add", methods=["POST"])
@token_required
@permission_required("user.manage")
def create_role():
    """Create a new role"""
    try:
        data = request.get_json() or {}
        role_name = (data.get("role_name") or "").strip()
        description = (data.get("description") or "").strip()

        if not role_name:
            return jsonify({
                "success": False,
                "message": "Role name is required"
            }), 400

        # Check if role name already exists (case-insensitive)
        check_query = text("SELECT role_id FROM roles WHERE LOWER(role_name) = LOWER(:role_name)")
        existing = db.session.execute(check_query, {"role_name": role_name}).fetchone()
        if existing:
            return jsonify({
                "success": False,
                "message": f"Role '{role_name}' already exists"
            }), 400

        now = datetime.utcnow()
        insert_query = text("""
            INSERT INTO roles (role_name, description, created_at, updated_at)
            VALUES (:role_name, :description, :created_at, :updated_at)
            RETURNING role_id
        """)
        
        result = db.session.execute(insert_query, {
            "role_name": role_name,
            "description": description or None,
            "created_at": now,
            "updated_at": now
        })
        
        role_id = result.scalar()
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Role created successfully",
            "data": {
                "role_id": role_id,
                "role_name": role_name,
                "description": description,
                "user_count": 0,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error creating role: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to create role",
            "error": str(e)
        }), 500


@roles_bp.route("/<int:role_id>", methods=["PUT"])
@roles_bp.route("/edit/<int:role_id>", methods=["PUT"])
@token_required
@permission_required("user.manage")
def update_role(role_id):
    """Update an existing role"""
    try:
        _ensure_roles_table_flexible()
        data = request.get_json() or {}
        role_name = (data.get("role_name") or "").strip()
        description = (data.get("description") or "").strip()

        if not role_name:
            return jsonify({
                "success": False,
                "message": "Role name is required"
            }), 400

        # Check if role exists
        check_role = db.session.execute(
            text("SELECT role_id FROM roles WHERE role_id = :role_id"), 
            {"role_id": role_id}
        ).fetchone()

        if not check_role:
            return jsonify({
                "success": False,
                "message": "Role not found"
            }), 404

        # Check duplicate name on another role
        dup_check = db.session.execute(
            text("SELECT role_id FROM roles WHERE LOWER(role_name) = LOWER(:role_name) AND role_id != :role_id"),
            {"role_name": role_name, "role_id": role_id}
        ).fetchone()

        if dup_check:
            return jsonify({
                "success": False,
                "message": f"Role name '{role_name}' is already in use by another role"
            }), 400

        now = datetime.utcnow()
        update_query = text("""
            UPDATE roles 
            SET role_name = :role_name,
                description = :description,
                updated_at = :updated_at
            WHERE role_id = :role_id
        """)
        
        db.session.execute(update_query, {
            "role_id": role_id,
            "role_name": role_name,
            "description": description or None,
            "updated_at": now
        })
        
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Role updated successfully",
            "data": {
                "role_id": role_id,
                "role_name": role_name,
                "description": description,
                "updated_at": now.isoformat()
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error updating role: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to update role",
            "error": str(e)
        }), 500


@roles_bp.route("/<int:role_id>", methods=["DELETE"])
@token_required
@permission_required("user.manage")
def delete_role(role_id):
    """Delete a role if no users are assigned"""
    try:
        # Check if role exists
        check_role = db.session.execute(
            text("SELECT role_id, role_name FROM roles WHERE role_id = :role_id"), 
            {"role_id": role_id}
        ).fetchone()

        if not check_role:
            return jsonify({
                "success": False,
                "message": "Role not found"
            }), 404

        # Check assigned users count
        user_count_result = db.session.execute(
            text("SELECT COUNT(*) FROM users WHERE role_id = :role_id"),
            {"role_id": role_id}
        ).scalar()

        if user_count_result and user_count_result > 0:
            return jsonify({
                "success": False,
                "message": f"Cannot delete role '{check_role.role_name}' because it is assigned to {user_count_result} user(s)."
            }), 400

        # Delete the role
        db.session.execute(
            text("DELETE FROM roles WHERE role_id = :role_id"),
            {"role_id": role_id}
        )
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Role '{check_role.role_name}' deleted successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error deleting role: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to delete role",
            "error": str(e)
        }), 500

