# """JWT authentication decorator for protected routes."""
# from functools import wraps
# from flask import request, jsonify, g
# from app.utils.jwt_utils import decode_access_token


# def token_required(f):
#     """Decorator to require valid JWT for a route."""
#     @wraps(f)
#     def decorated(*args, **kwargs):
#         auth_header = request.headers.get("Authorization")
#         if not auth_header or not auth_header.startswith("Bearer "):
#             return jsonify({
#                 "success": False,
#                 "message": "Missing or invalid authorization header",
#             }), 401
#         token = auth_header.split(" ")[1]
#         payload = decode_access_token(token)
#         if not payload:
#             return jsonify({
#                 "success": False,
#                 "message": "Invalid or expired token",
#             }), 401
#         g.jwt_payload = payload
#         return f(*args, **kwargs)
#     return decorated


from functools import wraps
from flask import request, jsonify, g
import jwt
import os


def token_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = None

        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        elif request.args.get("token"):
            token = request.args.get("token")

        if not token:
            return jsonify({
                "success": False,
                "message": "Authorization token missing"
            }), 401

        try:
            payload = jwt.decode(
                token,
                os.getenv("JWT_SECRET_KEY"),
                algorithms=["HS256"]
            )
            g.jwt_payload = payload
        except jwt.ExpiredSignatureError:
            return jsonify({
                "success": False,
                "message": "Token has expired"
            }), 401
        except jwt.InvalidTokenError:
            return jsonify({
                "success": False,
                "message": "Invalid token"
            }), 401

        return fn(*args, **kwargs)

    return wrapper