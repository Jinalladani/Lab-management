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
                  origins=["http://localhost:3000", "http://127.0.0.1:3000","http://192.168.31.211:3000"],
                  methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
                  allow_headers=["Content-Type", "Authorization"],
                  supports_credentials=True)

    db.init_app(app)
    bcrypt.init_app(app)

    # Database column alterations for Observation Module to handle very long labels/keys
    # pyrefly: ignore [missing-import]
    # from sqlalchemy import text
    # with app.app_context():
    #     try:
    #         db.session.execute(text("ALTER TABLE observation_template_fields ALTER COLUMN field_label TYPE TEXT;"))
    #         db.session.execute(text("ALTER TABLE observation_template_fields ALTER COLUMN field_key TYPE VARCHAR(255);"))
    #         db.session.execute(text("ALTER TABLE observation_template_formulas ALTER COLUMN result_name TYPE TEXT;"))
    #         db.session.commit()
    #     except Exception as e:
    #         db.session.rollback()

    # Handle OPTIONS requests globally before authentication
    @app.before_request
    def handle_options():
        if request.method == "OPTIONS":
            origin = request.headers.get('Origin')
            allowed_origins = ["http://localhost:3000", "http://127.0.0.1:3000", "http://192.168.31.211:3000"]
            
            if origin in allowed_origins:
                response = Response()
                response.headers.add("Access-Control-Allow-Origin", origin)
                response.headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
                response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
                response.headers.add("Access-Control-Allow-Credentials", "true")
                return response

    register_blueprints(app)

    return app