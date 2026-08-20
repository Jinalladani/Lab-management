from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from app.config import Config
from app.extensions import cors, db, bcrypt
from app.routes import register_blueprints


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Configure CORS with simpler approach
    cors.init_app(app, 
                  origins="*",
                  methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
                  allow_headers=["Content-Type", "Authorization"],
                  supports_credentials=True)

    db.init_app(app)
    bcrypt.init_app(app)



    # Handle OPTIONS requests globally before authentication
    @app.before_request
    def handle_options():
        if request.method == "OPTIONS":
            origin = request.headers.get('Origin')
            if origin:
                response = Response()
                response.headers.add("Access-Control-Allow-Origin", origin)
                response.headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
                response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
                response.headers.add("Access-Control-Allow-Credentials", "true")
                return response

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get('Origin')
        if origin:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            if not response.headers.get('Access-Control-Allow-Methods'):
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
            if not response.headers.get('Access-Control-Allow-Headers'):
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response

    register_blueprints(app)

    return app