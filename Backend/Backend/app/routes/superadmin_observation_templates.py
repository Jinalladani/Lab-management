from datetime import datetime
import re

from flask import Blueprint, g, jsonify, request
from sqlalchemy import or_, func, text
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.observation_template_builder_data import ObservationTemplateBuilderData
from app.models.observation_template import ObservationTemplate
from app.models.observation_template_master import (
    ObservationTemplateMaterial,
    ObservationTemplateStandard,
    ObservationTemplateTest,
)
from app.utils.auth_decorator import token_required


superadmin_observation_templates_bp = Blueprint("superadmin_observation_templates", __name__)

VALID_STATUSES = {"Draft", "Published", "Archived"}
REQUIRED_FIELDS = ["name", "material", "test", "standard"]
_schema_ready = False

MASTER_CONFIG = {
    "materials": {
        "model": ObservationTemplateMaterial,
        "pk": "material_id",
        "label": "Material",
        "table": "observation_template_materials",
        "template_id_field": "material_id",
        "template_name_field": "material",
    },
    "tests": {
        "model": ObservationTemplateTest,
        "pk": "test_id",
        "label": "Test",
        "table": "observation_template_tests",
        "template_id_field": "test_id",
        "template_name_field": "test",
    },
    "standards": {
        "model": ObservationTemplateStandard,
        "pk": "standard_id",
        "label": "Standard",
        "table": "observation_template_standards",
        "template_id_field": "standard_id",
        "template_name_field": "standard",
    },
}


@superadmin_observation_templates_bp.before_request
def ensure_observation_template_storage():
    pass


def current_user_label():
    payload = getattr(g, "jwt_payload", {}) or {}
    return (
        payload.get("email")
        or payload.get("username")
        or payload.get("sub")
        or payload.get("user_id")
        or "System"
    )


def normalize_name(value):
    return re.sub(r"\s+", " ", str(value or "").strip())


def api_error(message, status_code=400):
    return jsonify({"success": False, "message": message}), status_code


def list_master_records(kind):
    config = MASTER_CONFIG[kind]
    model = config["model"]
    search = request.args.get("search", "").strip()
    include_deleted = request.args.get("include_deleted") == "true"

    query = model.query
    if not include_deleted:
        query = query.filter(model.deleted_at.is_(None))
    if search:
        query = query.filter(model.name.ilike(f"%{search}%"))

    records = query.order_by(model.name.asc()).all()
    return jsonify({"success": True, "data": [record.to_dict() for record in records]}), 200


def find_master_by_name(model, name):
    return model.query.filter(
        func.lower(model.name) == name.lower(),
        model.deleted_at.is_(None),
    ).first()


def resolve_master(kind, data):
    config = MASTER_CONFIG[kind]
    model = config["model"]
    pk = config["pk"]
    label = config["label"]
    id_value = data.get(pk) or data.get(config["template_id_field"])
    name_value = normalize_name(data.get(config["template_name_field"]) or data.get("name"))

    if id_value:
        record = model.query.get(id_value)
        if not record or record.deleted_at:
            raise ValueError(f"{label} not found")
        return record

    if not name_value:
        raise ValueError(f"{label} is required")

    record = find_master_by_name(model, name_value)
    if record:
        return record

    record = model(name=name_value, created_by=str(current_user_label()))
    db.session.add(record)
    db.session.flush()
    return record


def create_master_record(kind):
    config = MASTER_CONFIG[kind]
    model = config["model"]
    label = config["label"]
    data = request.get_json() or {}
    name = normalize_name(data.get("name"))
    if not name:
        return api_error(f"{label} name is required", 400)

    if find_master_by_name(model, name):
        return api_error(f"Duplicate {label}", 409)

    record = model(
        name=name,
        description=normalize_name(data.get("description")) or None,
        status=data.get("status") or "Active",
        created_by=str(current_user_label()),
    )
    db.session.add(record)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return api_error(f"Duplicate {label}", 409)

    return jsonify({"success": True, "message": f"{label} created", "data": record.to_dict()}), 201


def update_master_record(kind, record_id):
    config = MASTER_CONFIG[kind]
    model = config["model"]
    label = config["label"]
    record = model.query.get(record_id)
    if not record or record.deleted_at:
        return api_error(f"{label} not found", 404)

    data = request.get_json() or {}
    if "name" in data:
        name = normalize_name(data.get("name"))
        if not name:
            return api_error(f"{label} name is required", 400)
        duplicate = find_master_by_name(model, name)
        if duplicate and getattr(duplicate, config["pk"]) != record_id:
            return api_error(f"Duplicate {label}", 409)
        record.name = name
    if "description" in data:
        record.description = normalize_name(data.get("description")) or None
    if "status" in data:
        record.status = data.get("status") or "Active"
    record.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"success": True, "message": f"{label} updated", "data": record.to_dict()}), 200


def delete_master_record(kind, record_id):
    config = MASTER_CONFIG[kind]
    model = config["model"]
    label = config["label"]
    record = model.query.get(record_id)
    if not record or record.deleted_at:
        return api_error(f"{label} not found", 404)

    in_use = ObservationTemplate.query.filter(
        getattr(ObservationTemplate, config["template_id_field"]) == record_id,
        ObservationTemplate.deleted_at.is_(None),
    ).first()
    if in_use:
        return api_error(f"Cannot delete {label}. It is used by observation templates.", 409)

    record.deleted_at = datetime.utcnow()
    record.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"success": True, "message": f"{label} deleted"}), 200


def template_identity_filter(template):
    return (
        func.lower(ObservationTemplate.name) == template.name.lower(),
        func.lower(ObservationTemplate.material) == template.material.lower(),
        func.lower(ObservationTemplate.test) == template.test.lower(),
        func.lower(ObservationTemplate.standard) == template.standard.lower(),
        ObservationTemplate.deleted_at.is_(None),
    )


def parse_version(version):
    match = re.search(r"(\d+)", str(version or ""))
    return int(match.group(1)) if match else 1


def next_version_for(data):
    query = ObservationTemplate.query.filter(
        func.lower(ObservationTemplate.name) == data["name"].lower(),
        func.lower(ObservationTemplate.material) == data["material"].lower(),
        func.lower(ObservationTemplate.test) == data["test"].lower(),
        func.lower(ObservationTemplate.standard) == data["standard"].lower(),
    )
    versions = [parse_version(row.version) for row in query.all()]
    return f"V{(max(versions) if versions else 0) + 1}"


def validate_template_payload(data, partial=False):
    missing = [
        field for field in REQUIRED_FIELDS
        if not partial and not str(data.get(field, "")).strip()
    ]
    if missing:
        return f"Missing required fields: {', '.join(missing)}"

    status = data.get("status")
    if status and status not in VALID_STATUSES:
        return "Status must be Draft, Published, or Archived"

    return None


def template_name_exists(name, exclude_id=None):
    query = ObservationTemplate.query.filter(
        func.lower(ObservationTemplate.name) == name.lower(),
        ObservationTemplate.deleted_at.is_(None),
    )
    if exclude_id:
        query = query.filter(ObservationTemplate.template_id != exclude_id)
    return query.first() is not None


def serialize_collection(query, page, per_page):
    total = query.count()
    items = (
        query.order_by(ObservationTemplate.updated_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {
        "items": [item.to_dict() for item in items],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page if per_page else 1,
        },
    }


@superadmin_observation_templates_bp.route("/masters/<kind>", methods=["GET"])
@token_required
def list_masters(kind):
    if kind not in MASTER_CONFIG:
        return api_error("Unknown master data type", 404)
    return list_master_records(kind)


@superadmin_observation_templates_bp.route("/masters/<kind>", methods=["POST"])
@token_required
def create_master(kind):
    if kind not in MASTER_CONFIG:
        return api_error("Unknown master data type", 404)
    return create_master_record(kind)


@superadmin_observation_templates_bp.route("/masters/<kind>/<int:record_id>", methods=["PUT"])
@token_required
def update_master(kind, record_id):
    if kind not in MASTER_CONFIG:
        return api_error("Unknown master data type", 404)
    return update_master_record(kind, record_id)


@superadmin_observation_templates_bp.route("/masters/<kind>/<int:record_id>", methods=["DELETE"])
@token_required
def delete_master(kind, record_id):
    if kind not in MASTER_CONFIG:
        return api_error("Unknown master data type", 404)
    return delete_master_record(kind, record_id)


def ensure_builder_data(template_id):
    builder_data = ObservationTemplateBuilderData.query.filter_by(template_id=template_id).first()
    if builder_data:
        return builder_data

    builder_data = ObservationTemplateBuilderData(
        template_id=template_id,
        sections=[],
        components=[],
        properties={},
        component_order=[],
        formula_mapping={},
        report_mapping={},
    )
    db.session.add(builder_data)
    return builder_data


@superadmin_observation_templates_bp.route("/", methods=["GET"], strict_slashes=False)
@token_required
def list_templates():
    search = request.args.get("search", "").strip()
    status = request.args.get("status", "").strip()
    material = request.args.get("material", "").strip()
    test = request.args.get("test", "").strip()
    standard = request.args.get("standard", "").strip()
    include_deleted = request.args.get("include_deleted") == "true"
    page = max(int(request.args.get("page", 1) or 1), 1)
    per_page = min(max(int(request.args.get("per_page", 10) or 10), 1), 100)

    query = ObservationTemplate.query
    if not include_deleted:
        query = query.filter(ObservationTemplate.deleted_at.is_(None))
    if search:
        pattern = f"%{search}%"
        query = query.filter(or_(
            ObservationTemplate.name.ilike(pattern),
            ObservationTemplate.material.ilike(pattern),
            ObservationTemplate.test.ilike(pattern),
            ObservationTemplate.standard.ilike(pattern),
            ObservationTemplate.description.ilike(pattern),
        ))
    if status:
        query = query.filter(ObservationTemplate.status == status)
    if material:
        query = query.filter(ObservationTemplate.material == material)
    if test:
        query = query.filter(ObservationTemplate.test == test)
    if standard:
        query = query.filter(ObservationTemplate.standard == standard)

    return jsonify({"success": True, "data": serialize_collection(query, page, per_page)}), 200


@superadmin_observation_templates_bp.route("/options", methods=["GET"])
@token_required
def template_options():
    def master_values(kind):
        model = MASTER_CONFIG[kind]["model"]
        records = (
            model.query
            .filter(model.deleted_at.is_(None))
            .order_by(model.name.asc())
            .all()
        )
        return [record.name for record in records]

    def master_records(kind):
        model = MASTER_CONFIG[kind]["model"]
        return [
            record.to_dict()
            for record in model.query
            .filter(model.deleted_at.is_(None))
            .order_by(model.name.asc())
            .all()
        ]

    return jsonify({
        "success": True,
        "data": {
            "materials": master_values("materials"),
            "tests": master_values("tests"),
            "standards": master_values("standards"),
            "material_records": master_records("materials"),
            "test_records": master_records("tests"),
            "standard_records": master_records("standards"),
        },
    }), 200


@superadmin_observation_templates_bp.route("/<int:template_id>", methods=["GET"])
@token_required
def get_template(template_id):
    template = ObservationTemplate.query.get(template_id)
    if not template or template.deleted_at:
        return jsonify({"success": False, "message": "Template not found"}), 404
    return jsonify({"success": True, "data": template.to_dict()}), 200


@superadmin_observation_templates_bp.route("/", methods=["POST"], strict_slashes=False)
@token_required
def create_template():
    data = request.get_json() or {}
    error = validate_template_payload(data)
    if error:
        return jsonify({"success": False, "message": error}), 400

    name = normalize_name(data["name"])
    if template_name_exists(name):
        return api_error("Template Name already exists", 409)

    try:
        material = resolve_master("materials", data)
        test = resolve_master("tests", data)
        standard = resolve_master("standards", data)
    except ValueError as exc:
        db.session.rollback()
        return api_error(str(exc), 400)

    template_data = {
        "name": name,
        "material": material.name,
        "test": test.name,
        "standard": standard.name,
        "material_id": material.material_id,
        "test_id": test.test_id,
        "standard_id": standard.standard_id,
    }

    template = ObservationTemplate(
        **template_data,
        description=normalize_name(data.get("description")) or None,
        version=data.get("version") or next_version_for(template_data),
        status=data.get("status") or "Draft",
        created_by=str(current_user_label()),
        sheets_data=data.get("sheets_data") or {},
        merges_data=data.get("merges_data") or [],
        scope_test_ids=data.get("scope_test_ids") or [],
    )

    if template.status == "Published":
        archive_published_versions(template)

    db.session.add(template)
    db.session.flush()
    ensure_builder_data(template.template_id)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return api_error("Template Name already exists", 409)
    return jsonify({"success": True, "message": "Draft template created", "data": template.to_dict()}), 201


@superadmin_observation_templates_bp.route("/<int:template_id>", methods=["PUT"])
@token_required
def update_template(template_id):
    template = ObservationTemplate.query.get(template_id)
    if not template or template.deleted_at:
        return jsonify({"success": False, "message": "Template not found"}), 404

    data = request.get_json() or {}
    error = validate_template_payload(data, partial=True)
    if error:
        return jsonify({"success": False, "message": error}), 400

    if "name" in data:
        name = normalize_name(data.get("name"))
        if not name:
            return api_error("Template Name is required", 400)
        if template_name_exists(name, exclude_id=template_id):
            return api_error("Template Name already exists", 409)
        template.name = name

    if any(field in data for field in ["material_id", "material"]):
        try:
            material = resolve_master("materials", data)
        except ValueError as exc:
            db.session.rollback()
            return api_error(str(exc), 400)
        template.material_id = material.material_id
        template.material = material.name
    if any(field in data for field in ["test_id", "test"]):
        try:
            test = resolve_master("tests", data)
        except ValueError as exc:
            db.session.rollback()
            return api_error(str(exc), 400)
        template.test_id = test.test_id
        template.test = test.name
    if any(field in data for field in ["standard_id", "standard"]):
        try:
            standard = resolve_master("standards", data)
        except ValueError as exc:
            db.session.rollback()
            return api_error(str(exc), 400)
        template.standard_id = standard.standard_id
        template.standard = standard.name

    for field in ["description", "version", "status"]:
        if field in data:
            value = data[field]
            setattr(template, field, value.strip() if isinstance(value, str) else value)

    if "scope_test_ids" in data:
        template.scope_test_ids = data["scope_test_ids"] or []

    if "sheets_data" in data:
        template.sheets_data = data["sheets_data"] or {}
    if "merges_data" in data:
        template.merges_data = data["merges_data"] or []

    if template.status == "Published":
        archive_published_versions(template)
        template.archived_at = None
    elif template.status == "Archived" and not template.archived_at:
        template.archived_at = datetime.utcnow()

    template.updated_at = datetime.utcnow()
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return api_error("Template Name already exists", 409)
    return jsonify({"success": True, "message": "Template updated", "data": template.to_dict()}), 200


def archive_published_versions(template):
    published_templates = ObservationTemplate.query.filter(
        *template_identity_filter(template),
        ObservationTemplate.status == "Published",
        ObservationTemplate.template_id != (template.template_id or 0),
    ).all()
    for published in published_templates:
        published.status = "Archived"
        published.archived_at = datetime.utcnow()
        published.updated_at = datetime.utcnow()


@superadmin_observation_templates_bp.route("/<int:template_id>/duplicate", methods=["POST"])
@token_required
def duplicate_template(template_id):
    template = ObservationTemplate.query.get(template_id)
    if not template or template.deleted_at:
        return jsonify({"success": False, "message": "Template not found"}), 404

    base_name = f"{template.name} Copy"
    duplicate_name = base_name
    counter = 2
    while template_name_exists(duplicate_name):
        duplicate_name = f"{base_name} {counter}"
        counter += 1

    data = {
        "name": duplicate_name,
        "material": template.material,
        "test": template.test,
        "standard": template.standard,
    }
    duplicate = ObservationTemplate(
        name=duplicate_name,
        description=template.description,
        material=template.material,
        test=template.test,
        standard=template.standard,
        material_id=template.material_id,
        test_id=template.test_id,
        standard_id=template.standard_id,
        version=next_version_for(data),
        status="Draft",
        created_by=str(current_user_label()),
        sheets_data=template.sheets_data or {},
        merges_data=template.merges_data or [],
    )
    db.session.add(duplicate)
    db.session.flush()
    ensure_builder_data(duplicate.template_id)
    db.session.commit()
    return jsonify({"success": True, "message": "Template duplicated", "data": duplicate.to_dict()}), 201


@superadmin_observation_templates_bp.route("/<int:template_id>/builder", methods=["GET"])
@token_required
def get_builder_data(template_id):
    template = ObservationTemplate.query.get(template_id)
    if not template or template.deleted_at:
        return jsonify({"success": False, "message": "Template not found"}), 404

    builder_data = ensure_builder_data(template_id)
    db.session.commit()
    return jsonify({
        "success": True,
        "data": {
            "template": template.to_dict(),
            "builder": builder_data.to_dict(),
        },
    }), 200


@superadmin_observation_templates_bp.route("/<int:template_id>/builder", methods=["PUT"])
@token_required
def update_builder_data(template_id):
    template = ObservationTemplate.query.get(template_id)
    if not template or template.deleted_at:
        return jsonify({"success": False, "message": "Template not found"}), 404

    data = request.get_json() or {}
    builder_data = ensure_builder_data(template_id)
    for field in [
        "sections",
        "components",
        "properties",
        "component_order",
        "formula_mapping",
        "report_mapping",
    ]:
        if field in data:
            setattr(builder_data, field, data[field])

    builder_data.updated_at = datetime.utcnow()
    template.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({
        "success": True,
        "message": "Builder draft saved",
        "data": {
            "template": template.to_dict(),
            "builder": builder_data.to_dict(),
        },
    }), 200


@superadmin_observation_templates_bp.route("/<int:template_id>/publish", methods=["POST"])
@token_required
def publish_template(template_id):
    template = ObservationTemplate.query.get(template_id)
    if not template or template.deleted_at:
        return jsonify({"success": False, "message": "Template not found"}), 404

    archive_published_versions(template)
    template.status = "Published"
    template.archived_at = None
    template.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"success": True, "message": "Template published", "data": template.to_dict()}), 200


@superadmin_observation_templates_bp.route("/<int:template_id>/archive", methods=["POST"])
@token_required
def archive_template(template_id):
    template = ObservationTemplate.query.get(template_id)
    if not template or template.deleted_at:
        return jsonify({"success": False, "message": "Template not found"}), 404

    template.status = "Archived"
    template.archived_at = datetime.utcnow()
    template.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"success": True, "message": "Template archived", "data": template.to_dict()}), 200


@superadmin_observation_templates_bp.route("/<int:template_id>/restore", methods=["POST"])
@token_required
def restore_template(template_id):
    template = ObservationTemplate.query.get(template_id)
    if not template or template.deleted_at:
        return jsonify({"success": False, "message": "Template not found"}), 404

    template.status = "Draft"
    template.archived_at = None
    template.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"success": True, "message": "Template restored", "data": template.to_dict()}), 200


@superadmin_observation_templates_bp.route("/<int:template_id>", methods=["DELETE"])
@token_required
def soft_delete_template(template_id):
    template = ObservationTemplate.query.get(template_id)
    if not template or template.deleted_at:
        return jsonify({"success": False, "message": "Template not found"}), 404

    template.deleted_at = datetime.utcnow()
    template.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"success": True, "message": "Template deleted"}), 200
