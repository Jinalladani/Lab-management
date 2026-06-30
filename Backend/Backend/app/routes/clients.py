from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import text
from app.extensions import db
from app.utils.auth_decorator import token_required

clients_bp = Blueprint("clients", __name__)


def _utc_now():
    return datetime.now(timezone.utc)


@clients_bp.route("/", methods=["GET"])
@token_required
def get_clients():
    try:
        lab_id = g.jwt_payload.get("lab_id")

        status = request.args.get("status", "").strip()
        search = request.args.get("search", "").strip()

        query = """
            SELECT
                client_id,
                lab_id,
                client_name,
                contact_person,
                email,
                phone,
                address,
                city,
                state,
                pincode,
                gst_no,
                status,
                created_by,
                updated_by,
                created_at,
                updated_at
            FROM clients
            WHERE lab_id = :lab_id
        """

        params = {"lab_id": lab_id}

        if status:
            query += " AND status = :status"
            params["status"] = status

        if search:
            query += """
                AND (
                    LOWER(client_name) LIKE LOWER(:search)
                    OR LOWER(contact_person) LIKE LOWER(:search)
                    OR LOWER(email) LIKE LOWER(:search)
                    OR LOWER(phone) LIKE LOWER(:search)
                )
            """
            params["search"] = f"%{search}%"

        query += " ORDER BY client_id DESC"

        result = db.session.execute(text(query), params).mappings().all()

        return jsonify({
            "success": True,
            "message": "Clients fetched successfully",
            "data": [dict(row) for row in result]
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to fetch clients",
            "errors": {"server": [str(e)]}
        }), 500


@clients_bp.route("/", methods=["POST"])
@token_required
def create_client():
    try:
        data = request.get_json() or {}

        user_id = g.jwt_payload.get("user_id")
        lab_id = g.jwt_payload.get("lab_id")

        client_name = (data.get("client_name") or "").strip()
        contact_person = (data.get("contact_person") or "").strip()
        email = (data.get("email") or "").strip().lower()
        phone = (data.get("phone") or "").strip()
        address = (data.get("address") or "").strip()
        city = (data.get("city") or "").strip()
        state = (data.get("state") or "").strip()
        pincode = (data.get("pincode") or "").strip()
        gst_no = (data.get("gst_no") or "").strip()

        errors = {}

        if not client_name:
            errors["client_name"] = ["Client name is required"]

        if email and "@" not in email:
            errors["email"] = ["Enter a valid email"]

        if errors:
            return jsonify({
                "success": False,
                "message": "Validation failed",
                "errors": errors
            }), 400

        existing = db.session.execute(text("""
            SELECT client_id
            FROM clients
            WHERE lab_id = :lab_id
              AND LOWER(client_name) = LOWER(:client_name)
        """), {
            "lab_id": lab_id,
            "client_name": client_name
        }).fetchone()

        if existing:
            return jsonify({
                "success": False,
                "message": "Client already exists for this lab"
            }), 409

        now = _utc_now()

        result = db.session.execute(text("""
            INSERT INTO clients (
                lab_id,
                client_name,
                contact_person,
                email,
                phone,
                address,
                city,
                state,
                pincode,
                gst_no,
                status,
                created_by,
                updated_by,
                created_at,
                updated_at
            )
            VALUES (
                :lab_id,
                :client_name,
                :contact_person,
                :email,
                :phone,
                :address,
                :city,
                :state,
                :pincode,
                :gst_no,
                'active',
                :created_by,
                :updated_by,
                :created_at,
                :updated_at
            )
            RETURNING client_id
        """), {
            "lab_id": lab_id,
            "client_name": client_name,
            "contact_person": contact_person or None,
            "email": email or None,
            "phone": phone or None,
            "address": address or None,
            "city": city or None,
            "state": state or None,
            "pincode": pincode or None,
            "gst_no": gst_no or None,
            "created_by": user_id,
            "updated_by": user_id,
            "created_at": now,
            "updated_at": now
        }).fetchone()

        client_id = result[0]

        db.session.execute(text("""
            INSERT INTO audit_logs (
                lab_id,
                user_id,
                module_name,
                record_type,
                record_id,
                action_type,
                action_note,
                created_at,
                updated_at
            )
            VALUES (
                :lab_id,
                :user_id,
                'clients',
                'clients',
                :record_id,
                'create',
                :action_note,
                :created_at,
                :updated_at
            )
        """), {
            "lab_id": lab_id,
            "user_id": user_id,
            "record_id": client_id,
            "action_note": f"Client created: {client_name}",
            "created_at": now,
            "updated_at": now
        })

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Client created successfully",
            "data": {
                "client_id": client_id,
                "client_name": client_name
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to create client",
            "errors": {"server": [str(e)]}
        }), 500


@clients_bp.route("/<int:client_id>", methods=["GET"])
@token_required
def get_client_by_id(client_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")

        result = db.session.execute(text("""
            SELECT
                client_id,
                lab_id,
                client_name,
                contact_person,
                email,
                phone,
                address,
                city,
                state,
                pincode,
                gst_no,
                status,
                created_by,
                updated_by,
                created_at,
                updated_at
            FROM clients
            WHERE client_id = :client_id
              AND lab_id = :lab_id
        """), {
            "client_id": client_id,
            "lab_id": lab_id
        }).mappings().fetchone()

        if not result:
            return jsonify({
                "success": False,
                "message": "Client not found"
            }), 404

        return jsonify({
            "success": True,
            "message": "Client fetched successfully",
            "data": dict(result)
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to fetch client",
            "errors": {"server": [str(e)]}
        }), 500


@clients_bp.route("/<int:client_id>", methods=["PUT"])
@token_required
def update_client(client_id):
    try:
        data = request.get_json() or {}

        user_id = g.jwt_payload.get("user_id")
        lab_id = g.jwt_payload.get("lab_id")

        client_name = (data.get("client_name") or "").strip()
        contact_person = (data.get("contact_person") or "").strip()
        email = (data.get("email") or "").strip().lower()
        phone = (data.get("phone") or "").strip()
        address = (data.get("address") or "").strip()
        city = (data.get("city") or "").strip()
        state = (data.get("state") or "").strip()
        pincode = (data.get("pincode") or "").strip()
        gst_no = (data.get("gst_no") or "").strip()

        errors = {}

        if not client_name:
            errors["client_name"] = ["Client name is required"]

        if email and "@" not in email:
            errors["email"] = ["Enter a valid email"]

        if errors:
            return jsonify({
                "success": False,
                "message": "Validation failed",
                "errors": errors
            }), 400

        existing_client = db.session.execute(text("""
            SELECT client_id
            FROM clients
            WHERE client_id = :client_id
              AND lab_id = :lab_id
        """), {
            "client_id": client_id,
            "lab_id": lab_id
        }).fetchone()

        if not existing_client:
            return jsonify({
                "success": False,
                "message": "Client not found"
            }), 404

        duplicate = db.session.execute(text("""
            SELECT client_id
            FROM clients
            WHERE lab_id = :lab_id
              AND LOWER(client_name) = LOWER(:client_name)
              AND client_id != :client_id
        """), {
            "lab_id": lab_id,
            "client_name": client_name,
            "client_id": client_id
        }).fetchone()

        if duplicate:
            return jsonify({
                "success": False,
                "message": "Another client with this name already exists"
            }), 409

        now = _utc_now()

        db.session.execute(text("""
            UPDATE clients
            SET
                client_name = :client_name,
                contact_person = :contact_person,
                email = :email,
                phone = :phone,
                address = :address,
                city = :city,
                state = :state,
                pincode = :pincode,
                gst_no = :gst_no,
                updated_by = :updated_by,
                updated_at = :updated_at
            WHERE client_id = :client_id
              AND lab_id = :lab_id
        """), {
            "client_name": client_name,
            "contact_person": contact_person or None,
            "email": email or None,
            "phone": phone or None,
            "address": address or None,
            "city": city or None,
            "state": state or None,
            "pincode": pincode or None,
            "gst_no": gst_no or None,
            "updated_by": user_id,
            "updated_at": now,
            "client_id": client_id,
            "lab_id": lab_id
        })

        db.session.execute(text("""
            INSERT INTO audit_logs (
                lab_id,
                user_id,
                module_name,
                record_type,
                record_id,
                action_type,
                action_note,
                created_at,
                updated_at
            )
            VALUES (
                :lab_id,
                :user_id,
                'clients',
                'clients',
                :record_id,
                'update',
                :action_note,
                :created_at,
                :updated_at
            )
        """), {
            "lab_id": lab_id,
            "user_id": user_id,
            "record_id": client_id,
            "action_note": f"Client updated: {client_name}",
            "created_at": now,
            "updated_at": now
        })

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Client updated successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to update client",
            "errors": {"server": [str(e)]}
        }), 500


@clients_bp.route("/<int:client_id>/status", methods=["PATCH"])
@token_required
def update_client_status(client_id):
    try:
        data = request.get_json() or {}

        user_id = g.jwt_payload.get("user_id")
        lab_id = g.jwt_payload.get("lab_id")
        status = (data.get("status") or "").strip().lower()

        allowed_status = ["active", "inactive"]

        if status not in allowed_status:
            return jsonify({
                "success": False,
                "message": "Invalid status"
            }), 400

        existing_client = db.session.execute(text("""
            SELECT client_id, client_name
            FROM clients
            WHERE client_id = :client_id
              AND lab_id = :lab_id
        """), {
            "client_id": client_id,
            "lab_id": lab_id
        }).mappings().fetchone()

        if not existing_client:
            return jsonify({
                "success": False,
                "message": "Client not found"
            }), 404

        now = _utc_now()

        db.session.execute(text("""
            UPDATE clients
            SET
                status = :status,
                updated_by = :updated_by,
                updated_at = :updated_at
            WHERE client_id = :client_id
              AND lab_id = :lab_id
        """), {
            "status": status,
            "updated_by": user_id,
            "updated_at": now,
            "client_id": client_id,
            "lab_id": lab_id
        })

        db.session.execute(text("""
            INSERT INTO audit_logs (
                lab_id,
                user_id,
                module_name,
                record_type,
                record_id,
                action_type,
                action_note,
                created_at,
                updated_at
            )
            VALUES (
                :lab_id,
                :user_id,
                'clients',
                'clients',
                :record_id,
                'status_update',
                :action_note,
                :created_at,
                :updated_at
            )
        """), {
            "lab_id": lab_id,
            "user_id": user_id,
            "record_id": client_id,
            "action_note": f"Client status changed to {status}: {existing_client['client_name']}",
            "created_at": now,
            "updated_at": now
        })

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Client status updated successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to update client status",
            "errors": {"server": [str(e)]}
        }), 500