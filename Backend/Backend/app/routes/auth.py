import hashlib
import random
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText

from flask import Blueprint, request, jsonify, current_app
from sqlalchemy import text
from app.extensions import db, bcrypt
from flask import g
from app.utils.jwt_utils import generate_access_token
from app.utils.auth_decorator import token_required

auth_bp = Blueprint("auth", __name__)


def _utcnow():
    return datetime.now(timezone.utc)


def _generate_otp() -> str:
    return str(random.randint(100000, 999999))


def _send_otp_email(to_email: str, otp: str) -> None:
    """Send OTP via email. If SMTP not configured, log to console (dev mode)."""
    smtp_host = current_app.config.get("SMTP_HOST", "")
    smtp_port = current_app.config.get("SMTP_PORT", 587)
    smtp_username = current_app.config.get("SMTP_USERNAME", "")
    smtp_password = current_app.config.get("SMTP_PASSWORD", "")
    smtp_from = current_app.config.get("SMTP_FROM", smtp_username)
    smtp_use_tls = current_app.config.get("SMTP_USE_TLS", True)
    ttl_minutes = current_app.config.get("FORGOT_PASSWORD_OTP_TTL_MINUTES", 10)

    if not smtp_host:
        current_app.logger.warning(f"SMTP not configured. OTP for {to_email}: {otp}")
        return

    subject = "LabMate Password Reset OTP"
    body = (
        f"Your OTP for resetting your LabMate password is: {otp}\n\n"
        f"This OTP will expire in {ttl_minutes} minutes.\n\n"
        "If you did not request this, you can ignore this email."
    )

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = smtp_from
    msg["To"] = to_email

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
        if smtp_use_tls:
            server.starttls()
        if smtp_username:
            server.login(smtp_username, smtp_password)
        server.sendmail(smtp_from, [to_email], msg.as_string())


def _store_refresh_token(user_id: int) -> None:
    """Generate refresh token, hash it, and store in refresh_tokens table."""
    refresh_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    expires_at = _utcnow() + timedelta(days=7)
    now = _utcnow()

    db.session.execute(text("""
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at, is_revoked, created_at, updated_at)
        VALUES (:user_id, :token_hash, :expires_at, FALSE, :now, :now)
    """), {
        "user_id": user_id,
        "token_hash": token_hash,
        "expires_at": expires_at,
        "now": now,
    })


def _get_user_for_email(email: str):
    query = text(
        """
        SELECT user_id, lab_id, email, status
        FROM users
        WHERE email = :email
        """
    )
    return db.session.execute(query, {"email": email}).fetchone()


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()

        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not email or not password:
            return jsonify({
                "success": False,
                "message": "Email and password required"
            }), 400

        # 🔹 Get user
        query = text("""
            SELECT user_id, lab_id, role_id, first_name, last_name,
                   email, password_hash, is_email_verified, is_active,
                   last_login, created_at, updated_at
            FROM users
            WHERE email = :email
        """)

        result = db.session.execute(query, {"email": email}).fetchone()

        if not result:
            return jsonify({
                "success": False,
                "message": "Invalid email or password"
            }), 401

        user = dict(result._mapping)

        # 🔹 Check status
        if not user["is_active"]:
            return jsonify({
                "success": False,
                "message": "User is inactive"
            }), 403

        # 🔹 Check password
        if not bcrypt.check_password_hash(user["password_hash"], password):
            return jsonify({
                "success": False,
                "message": "Invalid email or password"
            }), 401

        # 🔹 Get role name
        role_query = text("""
            SELECT role_name FROM roles WHERE role_id = :role_id
        """)

        role_result = db.session.execute(
            role_query, {"role_id": user["role_id"]}
        ).fetchone()

        role_name = role_result[0] if role_result else None

        # 🔹 Update last_login
        db.session.execute(text("""
            UPDATE users
            SET last_login = :time
            WHERE user_id = :user_id
        """), {
            "time": _utcnow(),
            "user_id": user["user_id"]
        })

        # 🔹 Audit log
        db.session.execute(text("""
            INSERT INTO audit_logs (
                lab_id, user_id, module_name, record_type,
                record_id, action_type, action_note,
                created_at, updated_at
            )
            VALUES (
                :lab_id, :user_id, 'auth', 'users',
                :record_id, 'login', :note,
                :time, :time
            )
        """), {
            "lab_id": user["lab_id"],
            "user_id": user["user_id"],
            "record_id": user["user_id"],
            "note": f"User {user['email']} logged in",
            "time": _utcnow()
        })

        _store_refresh_token(user["user_id"])

        db.session.commit()

        access_token = generate_access_token(
            user_id=user["user_id"],
            email=user["email"],
            role=role_name,
            lab_id=user["lab_id"],
        )

        return jsonify({
            "success": True,
            "message": "Login successful",
            "data": {
                "user_id": user["user_id"],
                "lab_id": user["lab_id"],
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "email": user["email"],
                "role": role_name,
                "token": access_token,
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Server error",
            "error": str(e)
        }), 500


@auth_bp.route("/signup", methods=["POST"])
def signup():
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "message": "Request body is required"
            }), 400

        first_name = (data.get("first_name") or "").strip()
        last_name = (data.get("last_name") or "").strip()
        lab_name = (data.get("lab_name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        contact_no = (data.get("contact_no") or "").strip()
        password = data.get("password") or ""
        confirm_password = data.get("confirm_password") or ""

        errors = {}

        if not first_name:
            errors["first_name"] = ["First name is required"]

        if not lab_name:
            errors["lab_name"] = ["Lab name is required"]

        if not email:
            errors["email"] = ["Email is required"]

        if not password:
            errors["password"] = ["Password is required"]
        elif len(password) < 6:
            errors["password"] = ["Password must be at least 6 characters"]

        if password and confirm_password != password:
            errors["confirm_password"] = ["Passwords do not match"]

        if errors:
            return jsonify({
                "success": False,
                "message": "Validation failed",
                "errors": errors
            }), 400

        # 1. email already exists?
        existing_user = db.session.execute(text("""
            SELECT user_id FROM users WHERE email = :email
        """), {"email": email}).fetchone()

        if existing_user:
            return jsonify({
                "success": False,
                "message": "Email already registered"
            }), 409

        # 2. create lab
        lab_result = db.session.execute(text("""
            INSERT INTO labs (
                lab_name,
                contact_person,
                email,
                phone,
                address,
                status,
                created_at,
                updated_at
            )
            VALUES (
                :lab_name,
                :contact_person,
                :email,
                :phone,
                :address,
                'active',
                :created_at,
                :updated_at
            )
            RETURNING lab_id
        """), {
            "lab_name": lab_name,
            "contact_person": f"{first_name} {last_name}".strip(),
            "email": email,
            "phone": contact_no,
            "address": None,
            "created_at": _utcnow(),
            "updated_at": _utcnow(),
        }).fetchone()

        lab_id = lab_result[0]

        # 3. create/fetch admin role
        role_result = db.session.execute(text("""
            SELECT role_id
            FROM roles
            WHERE lab_id = :lab_id AND role_name = 'admin'
        """), {
            "lab_id": lab_id
        }).fetchone()

        if role_result:
            role_id = role_result[0]
        else:
            new_role = db.session.execute(text("""
                INSERT INTO roles (
                    lab_id,
                    role_name,
                    description,
                    created_at,
                    updated_at
                )
                VALUES (
                    :lab_id,
                    'admin',
                    'Lab Admin - full control',
                    :created_at,
                    :updated_at
                )
                RETURNING role_id
            """), {
                "lab_id": lab_id,
                "created_at": _utcnow(),
                "updated_at": _utcnow(),
            }).fetchone()

            role_id = new_role[0]

        # 4. create team_member role also
        team_role = db.session.execute(text("""
            SELECT role_id
            FROM roles
            WHERE lab_id = :lab_id AND role_name = 'team_member'
        """), {
            "lab_id": lab_id
        }).fetchone()

        if not team_role:
            db.session.execute(text("""
                INSERT INTO roles (
                    lab_id,
                    role_name,
                    description,
                    created_at,
                    updated_at
                )
                VALUES (
                    :lab_id,
                    'team_member',
                    'Lab Staff / Engineer',
                    :created_at,
                    :updated_at
                )
            """), {
                "lab_id": lab_id,
                "created_at": _utcnow(),
                "updated_at": _utcnow(),
            })

        # 5. hash password
        password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

        # 6. create user
        user_result = db.session.execute(text("""
            INSERT INTO users (
                lab_id,
                role_id,
                first_name,
                last_name,
                email,
                phone,
                password_hash,
                is_email_verified,
                is_active,
                created_at,
                updated_at
            )
            VALUES (
                :lab_id,
                :role_id,
                :first_name,
                :last_name,
                :email,
                :phone,
                :password_hash,
                false,
                true,
                :created_at,
                :updated_at
            )
            RETURNING user_id
        """), {
            "lab_id": lab_id,
            "role_id": role_id,
            "first_name": first_name,
            "last_name": last_name if last_name else None,
            "email": email,
            "contact_no": contact_no if contact_no else None,
            "password_hash": password_hash,
            "created_at": _utcnow(),
            "updated_at": _utcnow(),
        }).fetchone()

        user_id = user_result[0]

        # 7. audit log
        db.session.execute(text("""
            INSERT INTO audit_logs (
                lab_id,
                user_id,
                module_name,
                record_type,
                record_id,
                action_type,
                action_note,
                created_at,
                updated_at
            )
            VALUES (
                :lab_id,
                :user_id,
                'auth',
                'users',
                :record_id,
                'signup',
                :action_note,
                :created_at,
                :updated_at
            )
        """), {
            "lab_id": lab_id,
            "user_id": user_id,
            "record_id": user_id,
            "action_note": f"Lab admin signup completed for {email}",
            "created_at": _utcnow(),
            "updated_at": _utcnow(),
        })

        _store_refresh_token(user_id)

        db.session.commit()

        access_token = generate_access_token(
            user_id=user_id,
            email=email,
            role="admin",
            lab_id=lab_id,
        )

        return jsonify({
            "success": True,
            "message": "Signup successful",
            "data": {
                "lab_id": lab_id,
                "user_id": user_id,
                "role": "admin",
                "email": email,
                "lab_name": lab_name,
                "first_name": first_name,
                "last_name": last_name,
                "token": access_token,
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Server error",
            "error": str(e)
        }), 500


@auth_bp.route("/me", methods=["GET"])
@token_required
def me():
    """Get current user from JWT."""
    try:
        payload = g.jwt_payload
        user_id = payload.get("sub")
        row = db.session.execute(text("""
            SELECT u.user_id, u.lab_id, u.first_name, u.last_name, u.email, u.is_email_verified, u.is_active, r.role_name
            FROM users u
            JOIN roles r ON r.role_id = u.role_id
            WHERE u.user_id = :user_id AND u.is_active = true
        """), {"user_id": user_id}).fetchone()
        if not row:
            return jsonify({"success": False, "message": "User not found"}), 404
        r = dict(row._mapping)
        return jsonify({
            "success": True,
            "data": {
                "user_id": r["user_id"],
                "lab_id": r["lab_id"],
                "first_name": r["first_name"],
                "last_name": r["last_name"],
                "email": r["email"],
                "role": r["role_name"],
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Server error", "error": str(e)}), 500


@auth_bp.route("/logout", methods=["POST"])
@token_required
def logout():
    """Revoke refresh tokens for user. Client should clear token."""
    try:
        payload = g.jwt_payload
        user_id = payload.get("sub")
        db.session.execute(
            text("UPDATE refresh_tokens SET is_revoked = TRUE, updated_at = :now WHERE user_id = :user_id"),
            {"now": _utcnow(), "user_id": user_id}
        )
        db.session.commit()
        return jsonify({"success": True, "message": "Logged out"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Server error", "error": str(e)}), 500


# ----- Forgot Password (OTP in DB - password_reset_tokens) -----

@auth_bp.route("/forgot-password/request", methods=["POST"])
def forgot_password_request():
    """Send OTP to email. Store in password_reset_tokens table."""
    try:
        data = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()
        if not email:
            return jsonify({"success": False, "message": "Email is required"}), 400

        row = db.session.execute(
            text("SELECT user_id FROM users WHERE email = :email AND is_active = true"),
            {"email": email},
        ).fetchone()
        if not row:
            return jsonify({"success": False, "message": "No active account found for this email"}), 404

        user_id = row[0]
        otp = _generate_otp()
        ttl_minutes = current_app.config.get("FORGOT_PASSWORD_OTP_TTL_MINUTES", 10)
        expires_at = _utcnow() + timedelta(minutes=ttl_minutes)
        token = f"{user_id}_{otp}"

        db.session.execute(text("""
            INSERT INTO password_reset_tokens (user_id, token, expires_at, is_used, created_at, updated_at)
            VALUES (:user_id, :token, :expires_at, FALSE, :now, :now)
        """), {"user_id": user_id, "token": token, "expires_at": expires_at, "now": _utcnow()})
        db.session.commit()

        _send_otp_email(email, otp)

        return jsonify({
            "success": True,
            "message": "OTP sent to your email",
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Server error", "error": str(e)}), 500


@auth_bp.route("/forgot-password/verify", methods=["POST"])
def forgot_password_verify():
    """Verify OTP. Returns success if valid."""
    try:
        data = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()
        otp = (data.get("otp") or "").strip()
        if not email or not otp or len(otp) != 6:
            return jsonify({"success": False, "message": "Email and 6-digit OTP required"}), 400

        row = db.session.execute(
            text("SELECT user_id FROM users WHERE email = :email"),
            {"email": email},
        ).fetchone()
        if not row:
            return jsonify({"success": False, "message": "Invalid email or OTP"}), 400

        user_id = row[0]
        token = f"{user_id}_{otp}"

        r = db.session.execute(text("""
            SELECT reset_id FROM password_reset_tokens
            WHERE user_id = :user_id AND token = :token AND is_used = FALSE AND expires_at > :now
        """), {"user_id": user_id, "token": token, "now": _utcnow()}).fetchone()

        if not r:
            return jsonify({"success": False, "message": "Invalid or expired OTP"}), 400

        return jsonify({"success": True, "message": "OTP verified"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Server error", "error": str(e)}), 500


@auth_bp.route("/forgot-password/reset", methods=["POST"])
def forgot_password_reset():
    """Reset password after OTP verification."""
    try:
        data = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()
        otp = (data.get("otp") or "").strip()
        password = data.get("password") or ""

        if not email or not otp:
            return jsonify({"success": False, "message": "Email and OTP required"}), 400
        if len(password) < 6:
            return jsonify({"success": False, "message": "Password must be at least 6 characters"}), 400

        row = db.session.execute(text("SELECT user_id FROM users WHERE email = :email"), {"email": email}).fetchone()
        if not row:
            return jsonify({"success": False, "message": "Invalid request"}), 400

        user_id = row[0]
        token = f"{user_id}_{otp}"

        r = db.session.execute(text("""
            SELECT reset_id FROM password_reset_tokens
            WHERE user_id = :user_id AND token = :token AND is_used = FALSE AND expires_at > :now
        """), {"user_id": user_id, "token": token, "now": _utcnow()}).fetchone()

        if not r:
            return jsonify({"success": False, "message": "Invalid or expired OTP"}), 400

        password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
        db.session.execute(text("""
            UPDATE users SET password_hash = :ph, updated_at = :now WHERE user_id = :user_id
        """), {"ph": password_hash, "now": _utcnow(), "user_id": user_id})
        db.session.execute(text("""
            UPDATE password_reset_tokens SET is_used = TRUE, updated_at = :now WHERE reset_id = :rid
        """), {"now": _utcnow(), "rid": r[0]})
        db.session.commit()

        return jsonify({"success": True, "message": "Password reset successful"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Server error", "error": str(e)}), 500