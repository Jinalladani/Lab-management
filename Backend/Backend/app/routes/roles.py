from flask import Blueprint, jsonify, g
from app.utils.auth_decorator import token_required
from sqlalchemy import text
from app.extensions import db

roles_bp = Blueprint("roles", __name__)


@roles_bp.route("/list", methods=["GET"])
@token_required
def get_lab_roles():
    """Get all global roles"""
    # try:
    if True:
        # Get global roles (no lab_id filter)
        roles_query = text("""
            SELECT role_id, role_name, description, 
                   created_at, updated_at
            FROM roles 
            ORDER BY created_at DESC
        """)
        
        result = db.session.execute(roles_query)
        roles = result.fetchall()

        role_list = []
        for role in roles:
            role_list.append({
                "role_id": role.role_id,
                "role_name": role.role_name,
                "description": role.description,
                "created_at": role.created_at.isoformat() if role.created_at else None,
                "updated_at": role.updated_at.isoformat() if role.updated_at else None
            })
        print(role_list)
        return jsonify({
            "success": True,
            "data": {
                "roles": role_list,
                "total_count": len(role_list)
            },
            "message": f"Found {len(role_list)} global roles"
        }), 200

    # except Exception as e:
    #     return jsonify({
    #         "success": False,
    #         "message": "Failed to fetch roles",
    #         "error": str(e)
    #     }), 500
