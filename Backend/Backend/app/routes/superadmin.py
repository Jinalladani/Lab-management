from flask import Blueprint, jsonify, g
from sqlalchemy import text
from app.extensions import db
from app.utils.auth_decorator import token_required
from datetime import datetime

superadmin_bp = Blueprint("superadmin", __name__)


@superadmin_bp.route("/labs", methods=["GET"])
@token_required
def get_labs():
    """Get all labs with detailed information for superadmin"""
    try:
        # Check if user is superadmin
        user_role = g.jwt_payload.get("role")
        if user_role not in ["superadmin", "super_admin"]:
            return jsonify({
                "success": False,
                "message": "Access denied. Superadmin role required."
            }), 403

        # Get labs with detailed statistics
        labs_query = text("""
            SELECT 
                l.lab_id,
                l.lab_name,
                l.email as contact_email,
                l.phone as contact_phone,
                l.address,
                l.status,
                l.created_at,
                l.updated_at,
                COUNT(DISTINCT p.project_id) as total_projects,
                COUNT(DISTINCT c.client_id) as total_clients,
                COUNT(DISTINCT u.user_id) as total_users,
                CASE 
                    WHEN l.status = 'active' THEN 'active'
                    ELSE 'inactive'
                END as lab_status
            FROM labs l
            LEFT JOIN projects p ON l.lab_id = p.lab_id
            LEFT JOIN clients c ON l.lab_id = c.lab_id
            LEFT JOIN users u ON l.lab_id = u.lab_id
            GROUP BY l.lab_id, l.lab_name, l.email, l.phone, l.address, l.status, l.created_at, l.updated_at
            ORDER BY l.created_at DESC
        """)
        
        labs_result = db.session.execute(labs_query).fetchall()
        
        labs_list = []
        for lab in labs_result:
            labs_list.append({
                "lab_id": lab.lab_id,
                "lab_name": lab.lab_name,
                "contact_email": lab.contact_email,
                "contact_phone": lab.contact_phone,
                "address": lab.address,
                "status": lab.lab_status,
                "created_at": lab.created_at.isoformat() if lab.created_at else None,
                "updated_at": lab.updated_at.isoformat() if lab.updated_at else None,
                "total_projects": lab.total_projects or 0,
                "total_clients": lab.total_clients or 0,
                "total_users": lab.total_users or 0
            })
        
        return jsonify({
            "success": True,
            "data": labs_list,
            "total": len(labs_list)
        }), 200
        
    except Exception as e:
        print(f"Error fetching labs: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch labs",
            "error": str(e)
        }), 500


@superadmin_bp.route("/labs/<int:lab_id>", methods=["GET"])
@token_required
def get_lab_details(lab_id):
    """Get detailed information for a specific lab"""
    try:
        # Check if user is superadmin
        user_role = g.jwt_payload.get("role")
        if user_role not in ["superadmin", "super_admin"]:
            return jsonify({
                "success": False,
                "message": "Access denied. Superadmin role required."
            }), 403

        # Get lab details with admin info
        lab_query = text("""
            SELECT 
                l.lab_id,
                l.lab_name,
                l.email as contact_email,
                l.phone as contact_phone,
                l.address,
                l.status,
                l.created_at,
                l.updated_at,
                COUNT(DISTINCT p.project_id) as total_projects,
                COUNT(DISTINCT c.client_id) as total_clients,
                COUNT(DISTINCT u.user_id) as total_users,
                admin.first_name as admin_first_name,
                admin.last_name as admin_last_name,
                admin.email as admin_email,
                admin.phone as admin_phone
            FROM labs l
            LEFT JOIN projects p ON l.lab_id = p.lab_id
            LEFT JOIN clients c ON l.lab_id = c.lab_id
            LEFT JOIN users u ON l.lab_id = u.lab_id
            LEFT JOIN users admin ON l.lab_id = admin.lab_id 
                AND admin.role_id IN (
                    SELECT role_id FROM roles 
                    WHERE UPPER(role_name) = 'ADMIN'
                )
                AND admin.is_active = true
            WHERE l.lab_id = :lab_id
            GROUP BY l.lab_id, l.lab_name, l.email, l.phone, l.address, l.status, l.created_at, l.updated_at, 
                     admin.first_name, admin.last_name, admin.email, admin.phone
        """)
        
        lab_result = db.session.execute(lab_query, {"lab_id": lab_id}).fetchone()
        
        if not lab_result:
            return jsonify({
                "success": False,
                "message": "Lab not found"
            }), 404
        
        # Get recent projects for this lab
        projects_query = text("""
            SELECT p.project_id, p.project_name, p.created_at,
                   COUNT(DISTINCT pst.scope_test_id) as total_tests
            FROM projects p
            LEFT JOIN project_scope_tests pst ON p.project_id = pst.project_id
            WHERE p.lab_id = :lab_id
            GROUP BY p.project_id, p.project_name, p.created_at
            ORDER BY p.created_at DESC
            LIMIT 5
        """)
        
        projects_result = db.session.execute(projects_query, {"lab_id": lab_id}).fetchall()
        
        # Get users in this lab with roles
        users_query = text("""
            SELECT u.user_id, u.first_name, u.last_name, u.email, u.is_active,
                   r.role_name
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE u.lab_id = :lab_id
            ORDER BY r.role_name, u.first_name
        """)
        
        users_result = db.session.execute(users_query, {"lab_id": lab_id}).fetchall()
        
        lab_data = {
            "lab_id": lab_result.lab_id,
            "lab_name": lab_result.lab_name,
            "contact_email": lab_result.contact_email,
            "contact_phone": lab_result.contact_phone,
            "address": lab_result.address,
            "status": lab_result.status,
            "created_at": lab_result.created_at.isoformat() if lab_result.created_at else None,
            "updated_at": lab_result.updated_at.isoformat() if lab_result.updated_at else None,
            "total_projects": lab_result.total_projects or 0,
            "total_clients": lab_result.total_clients or 0,
            "total_users": lab_result.total_users or 0,
            "admin_first_name": lab_result.admin_first_name,
            "admin_last_name": lab_result.admin_last_name,
            "admin_email": lab_result.admin_email,
            "admin_phone": lab_result.admin_phone,
            "recent_projects": [
                {
                    "project_id": project.project_id,
                    "project_name": project.project_name,
                    "created_at": project.created_at.isoformat() if project.created_at else None,
                    "total_tests": project.total_tests or 0
                }
                for project in projects_result
            ],
            "users": [
                {
                    "user_id": user.user_id,
                    "name": f"{user.first_name} {user.last_name}".strip(),
                    "email": user.email,
                    "role": user.role_name,
                    "is_active": user.is_active
                }
                for user in users_result
            ]
        }
        
        return jsonify({
            "success": True,
            "data": lab_data
        }), 200
        
    except Exception as e:
        print(f"Error fetching lab details: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch lab details",
            "error": str(e)
        }), 500


@superadmin_bp.route("/labs/<int:lab_id>/admin", methods=["GET"])
@token_required
def get_lab_admin(lab_id):
    """Get admin user for a specific lab"""
    try:
        # Check if user is superadmin
        user_role = g.jwt_payload.get("role")
        if user_role not in ["superadmin", "super_admin"]:
            return jsonify({
                "success": False,
                "message": "Access denied. Superadmin role required."
            }), 403

        # Get admin user for this lab
        admin_query = text("""
            SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone as contact_no, u.is_active
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE u.lab_id = :lab_id 
              AND UPPER(r.role_name) = 'ADMIN'
              AND u.is_active = true
            ORDER BY u.created_at ASC
            LIMIT 1
        """)
        
        admin_result = db.session.execute(admin_query, {"lab_id": lab_id}).fetchone()
        
        if not admin_result:
            return jsonify({
                "success": False,
                "message": "No admin found for this lab"
            }), 404
        
        admin_data = {
            "user_id": admin_result.user_id,
            "first_name": admin_result.first_name,
            "last_name": admin_result.last_name,
            "email": admin_result.email,
            "contact_no": admin_result.contact_no,
            "is_active": admin_result.is_active
        }
        
        return jsonify({
            "success": True,
            "data": admin_data
        }), 200
        
    except Exception as e:
        print(f"Error fetching lab admin: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch lab admin",
            "error": str(e)
        }), 500


@superadmin_bp.route("/labs/<int:lab_id>", methods=["GET"])
@token_required
def get_lab_by_id(lab_id):
    """Get specific lab by ID for superadmin"""
    try:
        # Check if user is superadmin
        user_role = g.jwt_payload.get("role")
        if user_role not in ["superadmin", "super_admin"]:
            return jsonify({
                "success": False,
                "message": "Access denied. Superadmin role required."
            }), 403

        # Get lab details
        lab_query = text("""
            SELECT 
                l.lab_id,
                l.lab_name,
                l.email as contact_email,
                l.phone as contact_phone,
                l.address,
                l.status,
                l.created_at,
                l.updated_at,
                COUNT(DISTINCT p.project_id) as total_projects,
                COUNT(DISTINCT c.client_id) as total_clients,
                COUNT(DISTINCT u.user_id) as total_users,
                admin.first_name as admin_first_name,
                admin.last_name as admin_last_name,
                admin.email as admin_email,
                admin.contact_no as admin_phone
            FROM labs l
            LEFT JOIN projects p ON l.lab_id = p.lab_id
            LEFT JOIN clients c ON l.lab_id = c.lab_id
            LEFT JOIN users u ON l.lab_id = u.lab_id
            LEFT JOIN users admin ON l.lab_id = admin.lab_id 
                AND admin.role_id IN (
                    SELECT role_id FROM roles 
                    WHERE UPPER(role_name) = 'ADMIN'
                )
                AND admin.is_active = true
            WHERE l.lab_id = :lab_id
            GROUP BY l.lab_id, l.lab_name, l.email, l.phone, l.address, l.status, l.created_at, l.updated_at, 
                     admin.first_name, admin.last_name, admin.email, admin.contact_no
        """)
        
        lab_result = db.session.execute(lab_query, {"lab_id": lab_id}).fetchone()
        
        if not lab_result:
            return jsonify({
                "success": False,
                "message": "Lab not found"
            }), 404
        
        lab_data = dict(lab_result._mapping)
        
        return jsonify({
            "success": True,
            "message": "Lab retrieved successfully",
            "data": lab_data
        }), 200
        
    except Exception as e:
        print(f"Error fetching lab details: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch lab details",
            "error": str(e)
        }), 500


@superadmin_bp.route("/labs/<int:lab_id>", methods=["PUT"])
@token_required
def update_lab(lab_id):
    """Update lab information"""
    try:
        # Check if user is superadmin
        user_role = g.jwt_payload.get("role")
        if user_role not in ["superadmin", "super_admin"]:
            return jsonify({
                "success": False,
                "message": "Access denied. Superadmin role required."
            }), 403

        from flask import request
        
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400
        
        # Update lab
        update_query = text("""
            UPDATE labs 
            SET lab_name = :lab_name,
                email = :contact_email,
                phone = :contact_phone,
                address = :address,
                status = :status,
                updated_at = :updated_at
            WHERE lab_id = :lab_id
        """)
        
        db.session.execute(update_query, {
            "lab_id": lab_id,
            "lab_name": data.get("lab_name"),
            "contact_email": data.get("contact_email"),
            "contact_phone": data.get("contact_phone"),
            "address": data.get("address"),
            "status": data.get("status", "active"),
            "updated_at": datetime.utcnow()
        })
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Lab updated successfully"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating lab: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to update lab",
            "error": str(e)
        }), 500


@superadmin_bp.route("/labs/<int:lab_id>", methods=["DELETE"])
@token_required
def delete_lab(lab_id):
    """Delete a lab (soft delete by setting status to inactive)"""
    try:
        # Check if user is superadmin
        user_role = g.jwt_payload.get("role")
        if user_role not in ["superadmin", "super_admin"]:
            return jsonify({
                "success": False,
                "message": "Access denied. Superadmin role required."
            }), 403

        # Check if lab has active projects
        projects_check = text("SELECT COUNT(*) FROM projects WHERE lab_id = :lab_id")
        project_count = db.session.execute(projects_check, {"lab_id": lab_id}).scalar()
        
        if project_count > 0:
            return jsonify({
                "success": False,
                "message": "Cannot delete lab with active projects. Please deactivate instead."
            }), 400
        
        # Soft delete by setting status to inactive
        delete_query = text("""
            UPDATE labs 
            SET status = 'inactive', updated_at = :updated_at
            WHERE lab_id = :lab_id
        """)
        
        db.session.execute(delete_query, {
            "lab_id": lab_id,
            "updated_at": datetime.utcnow()
        })
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Lab deactivated successfully"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting lab: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to delete lab",
            "error": str(e)
        }), 500


@superadmin_bp.route("/labs", methods=["POST"])
@token_required
def create_lab():
    """Create a new lab and lab admin user with auto-generated password"""
    try:
        # Check if user is superadmin
        user_role = g.jwt_payload.get("role")
        if user_role not in ["superadmin", "super_admin"]:
            return jsonify({
                "success": False,
                "message": "Access denied. Superadmin role required."
            }), 403

        from flask import request
        import secrets
        import string
        from app.extensions import bcrypt
        
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400
        
        # Validate required fields
        required_fields = ["lab_name", "contact_email", "address", "admin_first_name", "admin_last_name", "admin_email"]
        missing_fields = [field for field in required_fields if not data.get(field) or not data.get(field).strip()]
        
        if missing_fields:
            return jsonify({
                "success": False,
                "message": f"Required fields missing: {', '.join(missing_fields)}"
            }), 400
        
        # Validate email format
        def is_valid_email(email):
            import re
            pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
            return re.match(pattern, email) is not None
        
        if not is_valid_email(data.get("contact_email")):
            return jsonify({
                "success": False,
                "message": "Invalid contact email format"
            }), 400
            
        if not is_valid_email(data.get("admin_email")):
            return jsonify({
                "success": False,
                "message": "Invalid admin email format"
            }), 400
        
        # Check if emails are different
        if data.get("contact_email") == data.get("admin_email"):
            return jsonify({
                "success": False,
                "message": "Contact email and admin email must be different"
            }), 400
        
        # Check if lab email already exists
        lab_check_query = text("SELECT lab_id FROM labs WHERE email = :email")
        existing_lab = db.session.execute(lab_check_query, {"email": data.get("contact_email")}).fetchone()
        if existing_lab:
            return jsonify({
                "success": False,
                "message": "Lab with this contact email already exists"
            }), 400
        
        # Check if admin email already exists
        user_check_query = text("SELECT user_id FROM users WHERE email = :email")
        existing_user = db.session.execute(user_check_query, {"email": data.get("admin_email")}).fetchone()
        if existing_user:
            return jsonify({
                "success": False,
                "message": "User with this admin email already exists"
            }), 400
        
        # Get lab admin role_id (assuming role_name = 'admin' for global roles)
        role_query = text("SELECT role_id FROM roles WHERE role_name = 'admin'")
        role_result = db.session.execute(role_query).fetchone()
        if not role_result:
            return jsonify({
                "success": False,
                "message": "Lab admin role not found"
            }), 400
        
        lab_admin_role_id = role_result.role_id
        
        # Generate auto password
        def generate_password(length=12):
            characters = string.ascii_letters + string.digits + "!@#$%^&*"
            password = ''.join(secrets.choice(characters) for _ in range(length))
            return password
        
        auto_password = generate_password()
        hashed_password = bcrypt.generate_password_hash(auto_password).decode('utf-8')
        
        # Start transaction
        try:
            # 1. Create lab
            lab_insert_query = text("""
                INSERT INTO labs (lab_name, contact_person, email, phone, address, status, created_at, updated_at)
                VALUES (:lab_name, :contact_person, :contact_email, :contact_phone, :address, :status, :created_at, :updated_at)
                RETURNING lab_id
            """)
            
            lab_result = db.session.execute(lab_insert_query, {
                "lab_name": data.get("lab_name").strip(),
                "contact_person": f"{data.get('admin_first_name').strip()} {data.get('admin_last_name').strip()}",
                "contact_email": data.get("contact_email").strip(),
                "contact_phone": data.get("contact_phone", "").strip() or None,
                "address": data.get("address").strip(),
                "status": data.get("status", "active"),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            
            lab_id = lab_result.scalar()
            
            # 2. Create lab admin user
            user_insert_query = text("""
                INSERT INTO users (lab_id, role_id, first_name, last_name, email, password_hash, phone, is_active, created_at, updated_at)
                VALUES (:lab_id, :role_id, :first_name, :last_name, :email, :password_hash, :phone, :is_active, :created_at, :updated_at)
                RETURNING user_id
            """)
            
            user_result = db.session.execute(user_insert_query, {
                "lab_id": lab_id,
                "role_id": lab_admin_role_id,
                "first_name": data.get("admin_first_name").strip(),
                "last_name": data.get("admin_last_name").strip(),
                "email": data.get("admin_email").strip(),
                "password_hash": hashed_password,
                "phone": data.get("admin_phone", "").strip() or None,
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            
            user_id = user_result.scalar()
            
            # 3. Send welcome email with credentials
            try:
                _send_welcome_email(
                    data.get("admin_email").strip(),
                    data.get("admin_first_name").strip(),
                    data.get("admin_email").strip(),
                    auto_password
                )
            except Exception as email_error:
                print(f"Failed to send welcome email: {str(email_error)}")
                # Continue even if email fails
            
            db.session.commit()
            
            return jsonify({
                "success": True,
                "message": "Lab and lab admin created successfully. Admin credentials have been sent to the email.",
                "data": {
                    "lab_id": lab_id,
                    "user_id": user_id,
                    "admin_email": data.get("admin_email").strip(),
                    "password_sent": True
                }
            }), 201
            
        except Exception as e:
            db.session.rollback()
            raise e
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating lab and admin: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to create lab and admin",
            "error": str(e)
        }), 500


def _send_welcome_email(to_email, first_name, username, password):
    """Send welcome email with login credentials"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from flask import current_app
    
    smtp_host = current_app.config.get("SMTP_HOST", "")
    smtp_port = current_app.config.get("SMTP_PORT", 587)
    smtp_username = current_app.config.get("SMTP_USERNAME", "")
    smtp_password = current_app.config.get("SMTP_PASSWORD", "")
    smtp_from = current_app.config.get("SMTP_FROM", smtp_username)
    smtp_use_tls = current_app.config.get("SMTP_USE_TLS", True)
    
    if not smtp_host:
        print(f"SMTP not configured. Credentials for {to_email}: Email={username}, Password={password}")
        return
    
    subject = "Welcome to Lab Management System"
    
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2b63ae 0%, #1e4a8c 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Welcome to Lab Management System</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your lab account has been created successfully!</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef;">
            <h2 style="color: #2b63ae; margin-top: 0;">Hello {first_name},</h2>
            <p style="color: #666; line-height: 1.6;">
                Your lab administrator account has been created. Below are your login credentials:
            </p>
            
            <div style="background: white; border: 2px solid #2b63ae; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #2b63ae; margin-top: 0; font-size: 18px;">Login Credentials:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #333;">Email:</td>
                        <td style="padding: 8px 0; color: #333;">{username}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #333;">Password:</td>
                        <td style="padding: 8px 0; color: #333; font-family: monospace; background: #f1f3f4; padding: 4px 8px; border-radius: 4px;">{password}</td>
                    </tr>
                </table>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                    <strong>Security Notice:</strong> Please login and change your password immediately for security reasons.
                </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{current_app.config.get('FRONTEND_URL', 'http://localhost:3000')}/login" 
                   style="background: linear-gradient(135deg, #2b63ae 0%, #1e4a8c 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Login Now
                </a>
            </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 10px 10px; text-align: center; color: #666; font-size: 12px;">
            <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
        </div>
    </body>
    </html>
    """
    
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = smtp_from
    msg['To'] = to_email
    msg.attach(MIMEText(html_body, 'html'))
    
    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        if smtp_use_tls:
            server.starttls()
        if smtp_username:
            server.login(smtp_username, smtp_password)
        server.sendmail(smtp_from, [to_email], msg.as_string())
        server.quit()
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        raise e


@superadmin_bp.route("/stats", methods=["GET"])
@token_required
def get_superadmin_stats():
    """Get overall statistics for superadmin dashboard"""
    try:
        # Check if user is superadmin
        user_role = g.jwt_payload.get("role")
        if user_role not in ["superadmin", "super_admin"]:
            return jsonify({
                "success": False,
                "message": "Access denied. Superadmin role required."
            }), 403

        # Get overall statistics
        stats_query = text("""
            SELECT 
                COUNT(DISTINCT l.lab_id) as total_labs,
                COUNT(DISTINCT CASE WHEN l.status = 'active' THEN l.lab_id END) as active_labs,
                COUNT(DISTINCT p.project_id) as total_projects,
                COUNT(DISTINCT c.client_id) as total_clients,
                COUNT(DISTINCT u.user_id) as total_users,
                COUNT(DISTINCT CASE WHEN u.is_active = true THEN u.user_id END) as active_users
            FROM labs l
            LEFT JOIN projects p ON l.lab_id = p.lab_id
            LEFT JOIN clients c ON l.lab_id = c.lab_id
            LEFT JOIN users u ON l.lab_id = u.lab_id
        """)
        
        stats_result = db.session.execute(stats_query).fetchone()
        
        stats = {
            "total_labs": stats_result.total_labs or 0,
            "active_labs": stats_result.active_labs or 0,
            "total_projects": stats_result.total_projects or 0,
            "total_clients": stats_result.total_clients or 0,
            "total_users": stats_result.total_users or 0,
            "active_users": stats_result.active_users or 0
        }
        
        return jsonify({
            "success": True,
            "data": stats
        }), 200
        
    except Exception as e:
        print(f"Error fetching superadmin stats: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch statistics",
            "error": str(e)
        }), 500
