from datetime import datetime
from app.extensions import db

class ObservationTemplate(db.Model):
    __tablename__ = 'observation_templates'
    
    template_id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    material = db.Column(db.String(255), nullable=True)
    test = db.Column(db.String(255), nullable=True)
    standard = db.Column(db.String(255), nullable=True)
    material_id = db.Column(db.BigInteger, db.ForeignKey("observation_template_materials.material_id"), nullable=True)
    test_id = db.Column(db.BigInteger, db.ForeignKey("observation_template_tests.test_id"), nullable=True)
    standard_id = db.Column(db.BigInteger, db.ForeignKey("observation_template_standards.standard_id"), nullable=True)
    scope_test_ids = db.Column(db.JSON, nullable=True, default=list)
    version = db.Column(db.String(50), nullable=False, default="1.0.0")
    status = db.Column(db.String(50), nullable=False, default="Draft")
    created_by = db.Column(db.String(255), nullable=True)
    
    # JSON columns to store spreadsheet cells data and merge boundary configurations
    sheets_data = db.Column(db.JSON, nullable=False, default=dict)
    merges_data = db.Column(db.JSON, nullable=False, default=list)
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    archived_at = db.Column(db.DateTime, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.template_id,
            'template_id': self.template_id,
            'name': self.name,
            'description': self.description,
            'material': self.material,
            'test': self.test,
            'standard': self.standard,
            'material_id': self.material_id,
            'test_id': self.test_id,
            'standard_id': self.standard_id,
            'scope_test_ids': self.scope_test_ids or [],
            'version': self.version,
            'status': self.status,
            'created_by': self.created_by,
            'sheets_data': self.sheets_data,
            'merges_data': self.merges_data,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'archived_at': self.archived_at.isoformat() if self.archived_at else None,
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
        }
