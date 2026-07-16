from datetime import datetime

from app.extensions import db


class ObservationTemplateBuilderData(db.Model):
    __tablename__ = "observation_template_builder_data"

    builder_data_id = db.Column(db.BigInteger, primary_key=True)
    template_id = db.Column(
        db.BigInteger,
        db.ForeignKey("observation_templates.template_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    sections = db.Column(db.JSON, nullable=False, default=list)
    components = db.Column(db.JSON, nullable=False, default=list)
    properties = db.Column(db.JSON, nullable=False, default=dict)
    component_order = db.Column(db.JSON, nullable=False, default=list)
    formula_mapping = db.Column(db.JSON, nullable=False, default=dict)
    report_mapping = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    template = db.relationship("ObservationTemplate", backref=db.backref("builder_data", uselist=False))

    def to_dict(self):
        return {
            "builder_data_id": self.builder_data_id,
            "template_id": self.template_id,
            "sections": self.sections or [],
            "components": self.components or [],
            "properties": self.properties or {},
            "component_order": self.component_order or [],
            "formula_mapping": self.formula_mapping or {},
            "report_mapping": self.report_mapping or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
