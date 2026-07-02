from .home import home_bp
from .auth import auth_bp
from .clients import clients_bp
from .projects import projects_bp
from .scope import scope_bp
from .samples import samples_bp
from .sample_master import sample_master_bp
from .sample_entries import sample_entries_bp
from .project_registration import project_registration_bp
from .reports import reports_bp
from .users import users_bp
from .roles import roles_bp
from .labs import labs_bp
from .superadmin import superadmin_bp
from .test_assignments import test_assignments_bp
from .observation_builder import observation_builder_bp
from .sample_observation import sample_observations_bp
from .equipment import equipment_bp
from .calibration import calibration_bp

def register_blueprints(app):
    app.register_blueprint(home_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(clients_bp, url_prefix="/api/clients")
    app.register_blueprint(projects_bp, url_prefix="/api/projects")
    app.register_blueprint(scope_bp, url_prefix="/api/scope")
    app.register_blueprint(samples_bp, url_prefix="/api/samples")
    app.register_blueprint(sample_master_bp, url_prefix="/api")
    app.register_blueprint(sample_entries_bp, url_prefix="/api/sample-entries")
    app.register_blueprint(project_registration_bp, url_prefix="/api/project-registration")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(roles_bp, url_prefix="/api/roles")
    app.register_blueprint(labs_bp, url_prefix="/api/labs")
    app.register_blueprint(superadmin_bp, url_prefix="/api/superadmin")
    app.register_blueprint(test_assignments_bp, url_prefix="/api/test-assignments")
    app.register_blueprint(observation_builder_bp, url_prefix="/api/observation-builder")
    app.register_blueprint(sample_observations_bp, url_prefix="/api/sample-observations")
    app.register_blueprint(equipment_bp, url_prefix="/api/equipment")
    app.register_blueprint(calibration_bp, url_prefix="/api/calibration")
