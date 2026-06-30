from datetime import datetime
from app.extensions import db

class ObservationTemplate(db.Model):
    __tablename__ = 'observation_templates'
    
    template_id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    scope_test_id = db.Column(db.BigInteger, nullable=False)
    version = db.Column(db.String(50), nullable=False, default="1.0.0")
    status = db.Column(db.String(50), nullable=False, default="Draft")
    
    # JSON columns to store spreadsheet cells data and merge boundary configurations
    sheets_data = db.Column(db.JSON, nullable=False, default=dict)
    merges_data = db.Column(db.JSON, nullable=False, default=list)
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'template_id': self.template_id,
            'name': self.name,
            'scope_test_id': self.scope_test_id,
            'version': self.version,
            'status': self.status,
            'sheets_data': self.sheets_data,
            'merges_data': self.merges_data,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
