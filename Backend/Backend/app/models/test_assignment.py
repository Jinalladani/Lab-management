from datetime import datetime
from app.extensions import db


class SampleTestAssignment(db.Model):
    __tablename__ = 'sample_test_assignments'
    
    assignment_id = db.Column(db.BigInteger, primary_key=True)
    sample_id = db.Column(db.BigInteger, db.ForeignKey('sample_receipt_register.sample_id', ondelete='CASCADE'), nullable=False)
    scope_test_id = db.Column(db.BigInteger, db.ForeignKey('project_scope_tests.project_scope_test_id', ondelete='CASCADE'), nullable=False)
    
    assigned_to = db.Column(db.BigInteger, db.ForeignKey('users.user_id', ondelete='SET NULL'))
    assigned_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date())
    target_date = db.Column(db.Date)
    
    priority = db.Column(db.String(50), nullable=False, default='Normal')
    status = db.Column(db.String(50), nullable=False, default='Assigned')
    
    remarks = db.Column(db.Text)
    
    created_by = db.Column(db.BigInteger, db.ForeignKey('users.user_id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sample = db.relationship('Sample', backref='test_assignments', lazy=True)
    scope_test = db.relationship('ProjectScopeTest', backref='assignments', lazy=True)
    assigned_user = db.relationship('User', foreign_keys=[assigned_to], backref='assigned_tests', lazy=True)
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_assignments', lazy=True)
    history = db.relationship('SampleTestAssignmentHistory', backref='assignment', cascade='all, delete-orphan', lazy=True)
    
    __table_args__ = (
        db.UniqueConstraint('sample_id', 'scope_test_id', name='uq_sample_test_assignment'),
        db.CheckConstraint("priority IN ('Normal', 'High', 'Urgent')", name='check_priority'),
        
    )
    
    def to_dict(self):
        return {
            'assignment_id': self.assignment_id,
            'sample_id': self.sample_id,
            'scope_test_id': self.scope_test_id,
            'assigned_to': self.assigned_to,
            'assigned_date': self.assigned_date.isoformat() if self.assigned_date else None,
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'priority': self.priority,
            'status': self.status,
            'remarks': self.remarks,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class SampleTestAssignmentHistory(db.Model):
    __tablename__ = 'sample_test_assignment_history'
    
    history_id = db.Column(db.BigInteger, primary_key=True)
    assignment_id = db.Column(db.BigInteger, db.ForeignKey('sample_test_assignments.assignment_id', ondelete='CASCADE'), nullable=False)
    
    old_status = db.Column(db.String(50))
    new_status = db.Column(db.String(50), nullable=False)
    
    changed_by = db.Column(db.BigInteger, db.ForeignKey('users.user_id', ondelete='SET NULL'))
    changed_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    remarks = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'history_id': self.history_id,
            'assignment_id': self.assignment_id,
            'old_status': self.old_status,
            'new_status': self.new_status,
            'changed_by': self.changed_by,
            'changed_at': self.changed_at.isoformat() if self.changed_at else None,
            'remarks': self.remarks,
        }