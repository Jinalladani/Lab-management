from datetime import datetime, timezone, date
from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from app.extensions import db
from app.utils.auth_decorator import token_required
from app.utils.permissions import permission_required
from werkzeug.utils import secure_filename
import logging
import os
import uuid
import json

logger = logging.getLogger(__name__)

sample_entries_bp = Blueprint("sample_entries", __name__)

RECEIPT_TABLE = "sample_receipt_register"
TESTING_SAMPLES_TABLE = "testing_samples"
RECEIPT_PHOTOS_TABLE = "sample_receipt_photos"
RECEIPT_ID_COL = "sample_id"

VALID_SAMPLE_SOURCES = {'Site', 'Plant', 'Client', 'Third Party'}
VALID_RECEIVED_CONDITIONS = {'Good', 'Damaged', 'Wet', 'Broken', 'Other'}
VALID_SAMPLE_PRIORITIES = {'Normal', 'Urgent', 'High Priority'}


def _receipt_lab_filter():
    return "p.lab_id = :lab_id"


def _find_receipt(receipt_id, lab_id):
    return db.session.execute(text(f"""
        SELECT srr.{RECEIPT_ID_COL}, srr.project_id
        FROM {RECEIPT_TABLE} srr
        JOIN projects p ON srr.project_id = p.project_id
        WHERE srr.{RECEIPT_ID_COL} = :receipt_id AND {_receipt_lab_filter()}
    """), {"receipt_id": receipt_id, "lab_id": lab_id}).fetchone()


def _utc_now():
    return datetime.now(timezone.utc)


def _parse_date(value):
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return datetime.fromisoformat(str(value).replace('Z', '+00:00')).date()
    except (ValueError, AttributeError):
        return None


def _iso_date(value):
    if not value:
        return None
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    return str(value)


def _generate_receipt_no(lab_id):
    result = db.session.execute(text(f"""
        SELECT COUNT(*) AS total
        FROM {RECEIPT_TABLE} srr
        JOIN projects p ON srr.project_id = p.project_id
        WHERE {_receipt_lab_filter()}
    """), {"lab_id": lab_id}).fetchone()
    total = (result.total if result else 0) + 1
    year = datetime.now().year
    return f"SR-{year}-{str(total).zfill(5)}"


def _generate_testing_sample_code(receipt_id, offset=1):
    cnt = db.session.execute(text("""
        SELECT COUNT(*) FROM testing_samples WHERE receipt_id = :rid
    """), {"rid": receipt_id}).scalar() or 0
    seq = cnt + offset
    return f"TS-{str(seq).zfill(3)}"


def _recalculate_receipt_allocation(receipt_id):
    """Calculates quantity_allocated based on unique physical testing_samples count."""
    alloc_count = db.session.execute(text("""
        SELECT COUNT(*) FROM testing_samples WHERE receipt_id = :rid
    """), {"rid": receipt_id}).scalar() or 0

    db.session.execute(text("""
        UPDATE sample_receipt_register 
        SET quantity_allocated = :alloc, updated_at = :now 
        WHERE sample_id = :rid
    """), {"alloc": alloc_count, "now": _utc_now(), "rid": receipt_id})


def _format_receipt(row):
    receipt_id = row['sample_id']
    qty_rec = row['quantity_received'] if row.get('quantity_received') is not None else 1
    qty_alloc = row['quantity_allocated'] if row.get('quantity_allocated') is not None else 0
    qty_rem = max(0, qty_rec - qty_alloc)

    if qty_alloc == 0:
        receipt_status = "RECEIVED"
    elif qty_alloc >= qty_rec:
        receipt_status = "FULLY_ALLOCATED"
    else:
        receipt_status = "PARTIALLY_ALLOCATED"

    return {
        "receipt_id": receipt_id,
        "sample_id": receipt_id,
        "receipt_no": row['sample_no'],
        "sample_no": row['sample_no'],
        "project_id": row['project_id'],
        "project_code": row['project_code'],
        "project_name": row['project_name'],
        "client_name": row['client_name'],
        "material_name": row['material_name'],
        "quantity_received": qty_rec,
        "quantity_allocated": qty_alloc,
        "quantity_remaining": qty_rem,
        "quantity_unit": row['quantity_unit'] or 'Nos',
        "received_date": _iso_date(row['received_date'] or row['sample_received_date']),
        "received_by": row['received_by'],
        "received_condition": row['received_condition'],
        "client_reference": row['client_reference'],
        "remarks": row['remarks'],
        "receipt_status": receipt_status,
        "created_at": row['created_at'].isoformat() if row.get('created_at') else None
    }


def _format_testing_sample(row):
    df = float(row['depth_from']) if row.get('depth_from') is not None else None
    dt = float(row['depth_to']) if row.get('depth_to') is not None else None
    unit = row.get('depth_unit') or 'm'
    
    dd = ""
    if df is not None and dt is not None:
        dd = f"{df}–{dt} {unit}"
    elif df is not None:
        dd = f"{df} {unit}"

    return {
        "testing_sample_id": row['testing_sample_id'],
        "receipt_id": row['receipt_id'],
        "receipt_no": row['receipt_no'],
        "sample_code": row['sample_code'],
        "sample_no": row['sample_code'],
        "project_id": row['project_id'],
        "project_code": row.get('project_code'),
        "project_name": row.get('project_name'),
        "location_name": row['location_name'] or '',
        "borelog_no": row['borelog_no'] or '',
        "depth_from": df,
        "depth_to": dt,
        "depth_unit": unit,
        "depth_display": dd,
        "client_sample_reference": row['client_sample_reference'] or '',
        "sample_description": row['sample_description'] or '',
        "material_name": row['material_name'] or 'Soil',
        "assigned_test_count": row.get('assigned_test_count', 0),
        "completed_test_count": row.get('completed_test_count', 0),
        "status": row.get('status', 'Active'),
        "created_at": row['created_at'].isoformat() if row.get('created_at') else None
    }


# ========================================
# LOCATION & BORELOG LOOKUP ENDPOINTS
# ========================================

@sample_entries_bp.route("/locations", methods=["GET"])
@token_required
@permission_required("sample.view")
def get_location_options():
    """Get distinct location names registered under a project."""
    try:
        lab_id = g.jwt_payload.get("lab_id")
        project_id = request.args.get("project_id", "").strip()

        query = """
            SELECT DISTINCT ts.location_name
            FROM testing_samples ts
            JOIN projects p ON ts.project_id = p.project_id
            WHERE p.lab_id = :lab_id AND ts.location_name IS NOT NULL AND ts.location_name != ''
        """
        params = {"lab_id": lab_id}
        if project_id:
            query += " AND ts.project_id = :project_id"
            params["project_id"] = project_id

        rows = db.session.execute(text(query), params).fetchall()
        locations = [row.location_name for row in rows]

        return jsonify({"success": True, "data": locations})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@sample_entries_bp.route("/borelogs", methods=["GET"])
@token_required
@permission_required("sample.view")
def get_borelog_options():
    """Get distinct borelog numbers under a project and optional location."""
    try:
        lab_id = g.jwt_payload.get("lab_id")
        project_id = request.args.get("project_id", "").strip()
        location_name = request.args.get("location_name", "").strip()

        query = """
            SELECT DISTINCT ts.borelog_no
            FROM testing_samples ts
            JOIN projects p ON ts.project_id = p.project_id
            WHERE p.lab_id = :lab_id AND ts.borelog_no IS NOT NULL AND ts.borelog_no != ''
        """
        params = {"lab_id": lab_id}
        if project_id:
            query += " AND ts.project_id = :project_id"
            params["project_id"] = project_id
        if location_name:
            query += " AND ts.location_name = :location_name"
            params["location_name"] = location_name

        rows = db.session.execute(text(query), params).fetchall()
        borelogs = [row.borelog_no for row in rows]

        return jsonify({"success": True, "data": borelogs})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ========================================
# SAMPLE RECEIPT (LOT) ENDPOINTS
# ========================================

@sample_entries_bp.route("/next-sample-no", methods=["GET"])
@token_required
@permission_required("sample.view")
def get_next_sample_number():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        return jsonify({
            "success": True,
            "data": {"sample_no": _generate_receipt_no(lab_id)}
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@sample_entries_bp.route("/", methods=["GET"])
@token_required
@permission_required("sample.view")
def get_sample_receipts():
    """Returns sample receipt No.s."""
    try:
        lab_id = g.jwt_payload.get("lab_id")
        project_id = request.args.get("project_id", "").strip()
        search = request.args.get("search", "").strip()
        status = request.args.get("status", "").strip()

        query = f"""
            SELECT
                srr.sample_id,
                srr.project_id,
                srr.project_code,
                p.project_name,
                srr.client_name,
                srr.sample_no,
                srr.material_name,
                srr.quantity_received,
                srr.quantity_allocated,
                srr.quantity_unit,
                srr.received_date,
                srr.sample_received_date,
                srr.received_by,
                srr.received_condition,
                srr.client_reference,
                srr.remarks,
                srr.status,
                srr.created_at
            FROM {RECEIPT_TABLE} srr
            JOIN projects p ON srr.project_id = p.project_id
            WHERE {_receipt_lab_filter()}
        """
        params = {"lab_id": lab_id}

        if project_id and project_id != "all":
            query += " AND srr.project_id = :project_id"
            params["project_id"] = project_id

        if search:
            query += """ AND (
                srr.sample_no ILIKE :search OR
                srr.project_code ILIKE :search OR
                p.project_name ILIKE :search OR
                srr.client_name ILIKE :search OR
                srr.material_name ILIKE :search OR
                srr.client_reference ILIKE :search
            )"""
            params["search"] = f"%{search}%"

        query += " ORDER BY srr.sample_id DESC"
        rows = db.session.execute(text(query), params).mappings().all()
        receipts = [_format_receipt(r) for r in rows]

        return jsonify({"success": True, "data": receipts})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@sample_entries_bp.route("/", methods=["POST"])
@token_required
@permission_required("sample.receive")
def create_sample_receipt():
    """Creates ONE sample receipt/lot record (e.g. quantity_received = 50)."""
    try:
        lab_id = g.jwt_payload.get("lab_id")
        user_id = g.jwt_payload.get("user_id")
        data = request.get_json() or {}

        if not data.get("project_id"):
            return jsonify({"success": False, "message": "project_id is required"}), 400
        if not data.get("material_name"):
            return jsonify({"success": False, "message": "material_name is required"}), 400

        project_id = int(data["project_id"])
        project = db.session.execute(text("""
            SELECT project_code, client_id FROM projects WHERE project_id = :pid AND lab_id = :lab_id
        """), {"pid": project_id, "lab_id": lab_id}).fetchone()

        if not project:
            return jsonify({"success": False, "message": "Project not found"}), 404

        client_name = data.get("client_name") or "Client"
        receipt_no = _generate_receipt_no(lab_id)
        qty_received = int(data.get("quantity_received") or data.get("quantity") or 1)
        qty_unit = data.get("quantity_unit") or "Nos"
        received_date = _parse_date(data.get("received_date") or data.get("sample_received_date")) or date.today()
        letter_date = _parse_date(data.get("letter_date")) or received_date

        res = db.session.execute(text(f"""
            INSERT INTO {RECEIPT_TABLE} (
                project_id, project_code, client_name, sample_no, letter_date,
                sample_received_date, received_date, sample_source, received_condition,
                sample_priority, status, material_name, quantity, quantity_received, quantity_allocated,
                quantity_unit, client_reference, received_by, remarks, created_by, created_at, updated_at
            ) VALUES (
                :project_id, :project_code, :client_name, :receipt_no, :letter_date,
                :received_date, :received_date, :source, :condition,
                'Normal', 'Received', :material_name, :quantity_str, :qty_received, 0,
                :qty_unit, :client_reference, :received_by, :remarks, :created_by, :now, :now
            ) RETURNING sample_id
        """), {
            "project_id": project_id,
            "project_code": project.project_code,
            "client_name": client_name,
            "receipt_no": receipt_no,
            "letter_date": letter_date,
            "received_date": received_date,
            "source": data.get("sample_source") or "Site",
            "condition": data.get("received_condition") or "Good",
            "material_name": data["material_name"],
            "quantity_str": str(qty_received),
            "qty_received": qty_received,
            "qty_unit": qty_unit,
            "client_reference": data.get("client_reference"),
            "received_by": data.get("received_by") or "Lab Staff",
            "remarks": data.get("remarks"),
            "created_by": user_id,
            "now": _utc_now()
        })

        receipt_id = res.fetchone()[0]
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Sample receipt created successfully",
            "data": {
                "receipt_id": receipt_id,
                "sample_id": receipt_id,
                "receipt_no": receipt_no,
                "quantity_received": qty_received,
                "quantity_allocated": 0,
                "quantity_remaining": qty_received
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@sample_entries_bp.route("/<int:receipt_id>", methods=["GET"])
@token_required
@permission_required("sample.view")
def get_sample_receipt_by_id(receipt_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        row = db.session.execute(text(f"""
            SELECT srr.*, p.project_name
            FROM {RECEIPT_TABLE} srr
            JOIN projects p ON srr.project_id = p.project_id
            WHERE srr.sample_id = :rid AND p.lab_id = :lab_id
        """), {"rid": receipt_id, "lab_id": lab_id}).mappings().fetchone()

        if not row:
            return jsonify({"success": False, "message": "Receipt not found"}), 404

        formatted = _format_receipt(row)
        
        # Get testing samples allocated for this receipt
        ts_rows = db.session.execute(text("""
            SELECT 
                ts.*,
                (SELECT COUNT(*) FROM sample_test_assignments sta WHERE sta.testing_sample_id = ts.testing_sample_id AND sta.status NOT IN ('Cancelled')) AS assigned_test_count,
                (SELECT COUNT(*) FROM sample_test_assignments sta WHERE sta.testing_sample_id = ts.testing_sample_id AND sta.status IN ('Completed', 'Approved')) AS completed_test_count
            FROM testing_samples ts
            WHERE ts.receipt_id = :rid
            ORDER BY ts.testing_sample_id ASC
        """), {"rid": receipt_id}).mappings().all()

        formatted["allocated_testing_samples"] = [_format_testing_sample(r) for r in ts_rows]

        return jsonify({"success": True, "data": formatted})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ========================================
# PHYSICAL TESTING SAMPLES ENDPOINTS
# ========================================

@sample_entries_bp.route("/all-testing-samples", methods=["GET"])
@token_required
@permission_required("sample.view")
def get_all_testing_samples():
    """Returns testing samples across receipts for the Testing Samples tab."""
    try:
        lab_id = g.jwt_payload.get("lab_id")
        project_id = request.args.get("project_id", "").strip()
        search = request.args.get("search", "").strip()

        query = """
            SELECT 
                ts.*,
                srr.sample_no AS receipt_no,
                p.project_code,
                p.project_name,
                (SELECT COUNT(*) FROM sample_test_assignments sta WHERE sta.testing_sample_id = ts.testing_sample_id AND sta.status NOT IN ('Cancelled')) AS assigned_test_count,
                (SELECT COUNT(*) FROM sample_test_assignments sta WHERE sta.testing_sample_id = ts.testing_sample_id AND sta.status IN ('Completed', 'Approved')) AS completed_test_count
            FROM testing_samples ts
            JOIN sample_receipt_register srr ON ts.receipt_id = srr.sample_id
            JOIN projects p ON ts.project_id = p.project_id
            WHERE p.lab_id = :lab_id
        """
        params = {"lab_id": lab_id}

        if project_id and project_id != "all":
            query += " AND ts.project_id = :project_id"
            params["project_id"] = project_id

        if search:
            query += """ AND (
                ts.sample_code ILIKE :search OR
                ts.location_name ILIKE :search OR
                ts.borelog_no ILIKE :search OR
                ts.client_sample_reference ILIKE :search OR
                srr.sample_no ILIKE :search
            )"""
            params["search"] = f"%{search}%"

        query += " ORDER BY ts.testing_sample_id DESC"
        rows = db.session.execute(text(query), params).mappings().all()

        return jsonify({"success": True, "data": [_format_testing_sample(r) for r in rows]})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@sample_entries_bp.route("/<int:receipt_id>/testing-samples/bulk-create", methods=["POST"])
@token_required
@permission_required("sample.manage")
def create_testing_samples_bulk(receipt_id):
    """Allocates N physical testing samples from receipt quantity in a single transaction."""
    try:
        lab_id = g.jwt_payload.get("lab_id")
        user_id = g.jwt_payload.get("user_id")
        data = request.get_json() or {}

        receipt = _find_receipt(receipt_id, lab_id)
        if not receipt:
            return jsonify({"success": False, "message": "Receipt not found"}), 404

        sample_rows = data.get("samples") or []
        if not sample_rows or not isinstance(sample_rows, list):
            return jsonify({"success": False, "message": "samples array is required"}), 400

        # Validate remaining quantity in lock
        r_info = db.session.execute(text("""
            SELECT quantity_received, quantity_allocated, material_name FROM sample_receipt_register 
            WHERE sample_id = :rid FOR UPDATE
        """), {"rid": receipt_id}).fetchone()

        qty_rec = r_info.quantity_received or 1
        qty_alloc = r_info.quantity_allocated or 0
        qty_rem = max(0, qty_rec - qty_alloc)

        if len(sample_rows) > qty_rem:
            return jsonify({
                "success": False,
                "message": f"Only {qty_rem} unallocated sample(s) remain in this receipt (requested {len(sample_rows)})"
            }), 400

        created_ts = []
        for idx, s in enumerate(sample_rows):
            sample_code = s.get("sample_code") or _generate_testing_sample_code(receipt_id, idx + 1)
            location_name = (s.get("location_name") or "").strip()
            borelog_no = (s.get("borelog_no") or "").strip()
            depth_from = float(s["depth_from"]) if s.get("depth_from") is not None else None
            depth_to = float(s["depth_to"]) if s.get("depth_to") is not None else None
            depth_unit = s.get("depth_unit") or "m"
            client_ref = (s.get("client_sample_reference") or s.get("client_reference") or "").strip()
            desc = s.get("sample_description") or ""

            res = db.session.execute(text("""
                INSERT INTO testing_samples (
                    receipt_id, project_id, sample_code, location_name, borelog_no,
                    depth_from, depth_to, depth_unit, client_sample_reference,
                    sample_description, material_name, status, created_by, created_at, updated_at
                ) VALUES (
                    :rid, :pid, :code, :loc, :bh,
                    :df, :dt, :unit, :ref,
                    :desc, :mat, 'Active', :uid, :now, :now
                ) RETURNING testing_sample_id
            """), {
                "rid": receipt_id,
                "pid": receipt.project_id,
                "code": sample_code,
                "loc": location_name,
                "bh": borelog_no,
                "df": depth_from,
                "dt": depth_to,
                "unit": depth_unit,
                "ref": client_ref,
                "desc": desc,
                "mat": r_info.material_name,
                "uid": user_id,
                "now": _utc_now()
            })
            new_ts_id = res.fetchone()[0]
            created_ts.append({
                "testing_sample_id": new_ts_id,
                "sample_code": sample_code,
                "location_name": location_name,
                "borelog_no": borelog_no
            })

        _recalculate_receipt_allocation(receipt_id)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Successfully allocated {len(created_ts)} physical testing sample(s)",
            "data": created_ts
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@sample_entries_bp.route("/<int:receipt_id>", methods=["DELETE"])
@token_required
@permission_required("sample.manage")
def delete_sample_receipt(receipt_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        existing = _find_receipt(receipt_id, lab_id)
        if not existing:
            return jsonify({"success": False, "message": "Receipt not found"}), 404

        db.session.execute(text(f"DELETE FROM {RECEIPT_TABLE} WHERE sample_id = :rid"), {"rid": receipt_id})
        db.session.commit()
        return jsonify({"success": True, "message": "Receipt deleted successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
