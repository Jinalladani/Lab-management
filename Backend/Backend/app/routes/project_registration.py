from datetime import datetime, timezone

from flask import Blueprint, jsonify, request, g
from sqlalchemy import text

from app.extensions import db
from app.utils.auth_decorator import token_required

project_registration_bp = Blueprint("project_registration", __name__)


def _utc_now():
    return datetime.now(timezone.utc)


def _project_belongs_to_lab(project_id, lab_id):
    return db.session.execute(text("""
        SELECT project_id
        FROM projects
        WHERE project_id = :project_id
          AND lab_id = :lab_id
    """), {"project_id": project_id, "lab_id": lab_id}).fetchone()


def _format_registration(row):
    if not row:
        return None
    return {
        "id": row.id,
        "project_id": row.project_id,
        "registration_no": row.registration_no,
        "job_no": row.job_no,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _validate_payload(data):
    errors = {}
    code = (
        data.get("registration_no")
        or data.get("job_no")
        or data.get("registration_job_no")
        or data.get("job_code")
        or ""
    ).strip()
    registration_no = code
    job_no = code

    if not code:
        errors["registration_no"] = "Registration No. / Job No. is required"

    return errors, registration_no, job_no


@project_registration_bp.route("", methods=["POST"])
@token_required
def create_registration():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json() or {}
        project_id = data.get("project_id")

        if not project_id:
            return jsonify({"success": False, "message": "Project is required"}), 400

        try:
            project_id = int(project_id)
        except (TypeError, ValueError):
            return jsonify({"success": False, "message": "Invalid project id"}), 400

        if not _project_belongs_to_lab(project_id, lab_id):
            return jsonify({"success": False, "message": "Project not found"}), 404

        errors, registration_no, job_no = _validate_payload(data)
        if errors:
            return jsonify({"success": False, "message": "Validation failed", "errors": errors}), 400

        now = _utc_now()
        row = db.session.execute(text("""
            INSERT INTO project_registration (
                project_id,
                registration_no,
                job_no,
                created_at,
                updated_at
            )
            VALUES (
                :project_id,
                :registration_no,
                :job_no,
                :created_at,
                :updated_at
            )
            ON CONFLICT (project_id) DO UPDATE
            SET registration_no = EXCLUDED.registration_no,
                job_no = EXCLUDED.job_no,
                updated_at = EXCLUDED.updated_at
            RETURNING id, project_id, registration_no, job_no, created_at, updated_at
        """), {
            "project_id": project_id,
            "registration_no": registration_no,
            "job_no": job_no,
            "created_at": now,
            "updated_at": now,
        }).fetchone()

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Registration / Job No saved successfully",
            "data": _format_registration(row),
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Error saving registration: {str(e)}"}), 500


@project_registration_bp.route("/<int:project_id>", methods=["GET"])
@token_required
def get_registration(project_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")

        if not _project_belongs_to_lab(project_id, lab_id):
            return jsonify({"success": False, "message": "Project not found"}), 404

        row = db.session.execute(text("""
            SELECT id, project_id, registration_no, job_no, created_at, updated_at
            FROM project_registration
            WHERE project_id = :project_id
        """), {"project_id": project_id}).fetchone()

        return jsonify({
            "success": True,
            "data": _format_registration(row),
        })

    except Exception as e:
        return jsonify({"success": False, "message": f"Error fetching registration: {str(e)}"}), 500


@project_registration_bp.route("/<int:project_id>", methods=["PUT"])
@token_required
def update_registration(project_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json() or {}

        if not _project_belongs_to_lab(project_id, lab_id):
            return jsonify({"success": False, "message": "Project not found"}), 404

        errors, registration_no, job_no = _validate_payload(data)
        if errors:
            return jsonify({"success": False, "message": "Validation failed", "errors": errors}), 400

        row = db.session.execute(text("""
            UPDATE project_registration
            SET registration_no = :registration_no,
                job_no = :job_no,
                updated_at = :updated_at
            WHERE project_id = :project_id
            RETURNING id, project_id, registration_no, job_no, created_at, updated_at
        """), {
            "project_id": project_id,
            "registration_no": registration_no,
            "job_no": job_no,
            "updated_at": _utc_now(),
        }).fetchone()

        if not row:
            return jsonify({"success": False, "message": "Registration not found"}), 404

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Registration / Job No updated successfully",
            "data": _format_registration(row),
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Error updating registration: {str(e)}"}), 500
