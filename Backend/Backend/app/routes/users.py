import secrets
import string
from flask import Blueprint, jsonify, g, request
from app.utils.auth_decorator import token_required
from flask_bcrypt import generate_password_hash
from sqlalchemy import text
from app.extensions import db

users_bp = Blueprint("users", __name__)


def generate_secure_password(length=12):
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password


@users_bp.route("/list", methods=["GET"])
@token_required
def get_lab_users():
    """Get all users for the current lab using direct SQL"""
    try:
        # Get lab_id from JWT payload
        lab_id = g.jwt_payload.get("lab_id")

        if not lab_id:
            return jsonify({
                "success": False,
                "message": "Lab ID not found in token"
            }), 400

        # Direct SQL query to get users for the lab
        users_query = text("""
            SELECT user_id, lab_id, role_id, first_name, last_name, 
                   email, phone, is_email_verified, is_active, 
                   last_login, created_at, updated_at
            FROM users 
            WHERE lab_id = :lab_id
            ORDER BY created_at DESC
        """)
        
        result = db.session.execute(users_query, {"lab_id": lab_id})
        users = result.fetchall()

        user_list = []
        for user in users:
            user_list.append({
                "user_id": user.user_id,
                "lab_id": user.lab_id,
                "role_id": user.role_id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": f"{user.first_name} {user.last_name}" if user.last_name else user.first_name,
                "email": user.email,
                "phone": user.phone,
                "is_email_verified": user.is_email_verified,
                "is_active": user.is_active,
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None
            })

        return jsonify({
            "success": True,
            "data": {
                "users": user_list,
                "total_count": len(user_list)
            },
            "message": f"Found {len(user_list)} users for lab_id {lab_id}"
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to fetch users",
            "error": str(e)
        }), 500


@users_bp.route("/create", methods=["POST"])
@token_required
def create_user():
    """Create a new user using direct SQL with auto-generated password"""
    try:
        # Get lab_id from JWT payload
        lab_id = g.jwt_payload.get("lab_id")

        if not lab_id:
            return jsonify({
                "success": False,
                "message": "Lab ID not found in token"
            }), 400

        data = request.get_json()
        
        # Validation - removed password requirements
        required_fields = ['first_name', 'last_name', 'email', 'role_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    "success": False,
                    "message": f"Field '{field}' is required"
                }), 400

        # Check if email already exists in this lab
        email_check_query = text("""
            SELECT COUNT(*) as count FROM users 
            WHERE lab_id = :lab_id AND email = :email
        """)
        email_result = db.session.execute(email_check_query, {
            "lab_id": lab_id, 
            "email": data['email']
        }).fetchone()
        
        if email_result.count > 0:
            return jsonify({
                "success": False,
                "message": "Email already exists in this lab"
            }), 400

        # Verify role exists and belongs to same lab
        role_check_query = text("""
            SELECT COUNT(*) as count FROM roles 
            WHERE role_id = :role_id AND lab_id = :lab_id
        """)
        role_result = db.session.execute(role_check_query, {
            "role_id": data['role_id'], 
            "lab_id": lab_id
        }).fetchone()
        
        if role_result.count == 0:
            return jsonify({
                "success": False,
                "message": "Invalid role"
            }), 400

        # Auto-generate secure password
        generated_password = generate_secure_password()
        password_hash = generate_password_hash(generated_password).decode('utf-8')

        # Create new user using SQL
        create_user_query = text("""
            INSERT INTO users (
                lab_id, role_id, first_name, last_name, 
                email, phone, password_hash, is_email_verified, 
                is_active, created_at, updated_at
            ) VALUES (
                :lab_id, :role_id, :first_name, :last_name, 
                :email, :phone, :password_hash, :is_email_verified, 
                :is_active, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            RETURNING user_id, email
        """)
        
        result = db.session.execute(create_user_query, {
            "lab_id": lab_id,
            "role_id": data['role_id'],
            "first_name": data['first_name'],
            "last_name": data['last_name'],
            "email": data['email'],
            "phone": data.get('phone'),
            "password_hash": password_hash,
            "is_email_verified": False,
            "is_active": data.get('is_active', True)
        }).fetchone()

        db.session.commit()

        # Log user creation (without exposing password)
        current_app.logger.info(f"User created successfully: {data['email']}")

        return jsonify({
            "success": True,
            "message": "User created successfully. Password has been sent to the user's email.",
            "data": {
                "user_id": result.user_id,
                "email": result.email,
                "full_name": f"{data['first_name']} {data['last_name']}"
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to create user",
            "error": str(e)
        }), 500