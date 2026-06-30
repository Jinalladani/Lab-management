from datetime import datetime
from app.extensions import db
from flask_bcrypt import generate_password_hash, check_password_hash


class User(db.Model):
    __tablename__ = 'users'
    
    user_id = db.Column(db.BigInteger, primary_key=True)
    lab_id = db.Column(db.BigInteger, db.ForeignKey('labs.lab_id', ondelete='CASCADE'))
    role_id = db.Column(db.BigInteger, db.ForeignKey('roles.role_id', ondelete='RESTRICT'))
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100))
    email = db.Column(db.String(255), nullable=False, unique=True)
    contact_no = db.Column(db.String(50))
    password_hash = db.Column(db.Text, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='active')
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    phone = db.Column(db.String(50))
    is_email_verified = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime)
    
    # Relationships
    user_verifications = db.relationship('UserVerification', backref='user', cascade='all, delete-orphan')
    password_reset_tokens = db.relationship('PasswordResetToken', backref='user', cascade='all, delete-orphan')
    refresh_tokens = db.relationship('RefreshToken', backref='user', cascade='all, delete-orphan')
    created_clients = db.relationship('Client', foreign_keys='Client.created_by', backref='creator', cascade='all, delete-orphan')
    updated_clients = db.relationship('Client', foreign_keys='Client.updated_by', backref='updater', cascade='all, delete-orphan')
    # Project relationships - using actual columns that exist
    collected_projects = db.relationship('Project', foreign_keys='Project.request_collected_by', backref='collector', cascade='all, delete-orphan')
    assigned_projects = db.relationship('Project', foreign_keys='Project.test_assigned_to', backref='assigned_user', cascade='all, delete-orphan')
    reviewed_projects = db.relationship('Project', foreign_keys='Project.reviewed_by', backref='reviewer', cascade='all, delete-orphan')
    audit_logs = db.relationship('AuditLog', backref='user', cascade='all, delete-orphan')
    
    __table_args__ = (
        db.CheckConstraint("status IN ('active', 'inactive')", name='users_status_check'),
    )
    
    def set_password(self, password):
        """Set password hash"""
        self.password_hash = generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        """Check password against hash"""
        return check_password_hash(self.password_hash, password)
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}" if self.last_name else self.first_name
    
    def is_locked(self):
        """Check if user account is locked"""
        if self.locked_until:
            return datetime.utcnow() < self.locked_until
        return False
    
    def __repr__(self):
        return f'<User {self.email}>'
