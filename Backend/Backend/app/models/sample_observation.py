from datetime import datetime
from app.extensions import db

class SampleObservation(db.Model):
    __tablename__ = 'sample_observations'
    
    observation_id = db.Column(db.BigInteger, primary_key=True)
    project_id = db.Column(db.BigInteger, nullable=False)
    sample_id = db.Column(db.BigInteger, nullable=False)
    scope_test_id = db.Column(db.BigInteger, nullable=True)
    template_id = db.Column(db.BigInteger, nullable=True)
    test_name = db.Column(db.String(255), nullable=False)
    test_method = db.Column(db.String(255), nullable=True)
    operator_name = db.Column(db.String(255), nullable=True, default="Lab Technician")
    
    sheets_data = db.Column(db.JSON, nullable=False, default=dict)
    merges_data = db.Column(db.JSON, nullable=False, default=list)
    status = db.Column(db.String(50), nullable=False, default="Draft")
    
    # Equipment integration
    equipment_id = db.Column(db.String(50), nullable=True)
    equipment_name = db.Column(db.String(255), nullable=True)
    equipment_cert_no = db.Column(db.String(100), nullable=True)
    equipment_validity_date = db.Column(db.Date, nullable=True)
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'observation_id': self.observation_id,
            'project_id': self.project_id,
            'sample_id': self.sample_id,
            'scope_test_id': self.scope_test_id,
            'template_id': self.template_id,
            'test_name': self.test_name,
            'test_method': self.test_method,
            'operator_name': self.operator_name,
            'sheets_data': self.sheets_data,
            'merges_data': self.merges_data,
            'status': self.status,
            'equipment_id': self.equipment_id,
            'equipment_name': self.equipment_name,
            'equipment_cert_no': self.equipment_cert_no,
            'equipment_validity_date': self.equipment_validity_date.isoformat() if self.equipment_validity_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
