"""JWT token generation and validation."""
import time
import jwt
from flask import current_app


def generate_access_token(user_id, email, role, lab_id=None):
    """Generate a JWT access token for the user."""
    expires_hours = current_app.config.get("JWT_ACCESS_TOKEN_EXPIRES", 24)
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "lab_id": str(lab_id) if lab_id is not None else None,
        "iat": now,
        "exp": now + (expires_hours * 3600),
        "type": "access",
    }
    secret = current_app.config.get("JWT_SECRET_KEY") or current_app.config.get("SECRET_KEY")
    return jwt.encode(
        payload,
        secret,
        algorithm="HS256",
    )


def decode_access_token(token):
    """Decode and validate JWT access token. Returns payload or None."""
    try:
        secret = current_app.config.get("JWT_SECRET_KEY") or current_app.config.get("SECRET_KEY")
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        if payload.get("type") != "access":
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
