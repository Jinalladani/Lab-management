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

    # Automatically run report module and equipment module schema migrations
    # pyrefly: ignore [missing-import]
    from sqlalchemy import text
    import os
    with app.app_context():
        try:
            sql_path = os.path.join(os.path.dirname(__file__), 'models', 'reports_module.sql')
            if os.path.exists(sql_path):
                with open(sql_path, 'r') as f:
                    migration_sql = f.read()
                db.session.execute(text(migration_sql))
                db.session.commit()
                print("Reports Module database tables verified/created successfully.")
            
            eq_sql_path = os.path.join(os.path.dirname(__file__), 'models', 'equipment_complete_system.sql')
            if os.path.exists(eq_sql_path):
                with open(eq_sql_path, 'r') as f:
                    eq_migration_sql = f.read()
                db.session.execute(text(eq_migration_sql))
                db.session.commit()
                print("Equipment System database tables verified/created successfully.")
        except Exception as e:
            db.session.rollback()
            print("Failed to run database migrations:", e)


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