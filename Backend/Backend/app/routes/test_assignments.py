from datetime import datetime, timezone, date
from flask import Blueprint, request, jsonify, g
from sqlalchemy import text
from app.extensions import db
from app.utils.auth_decorator import token_required
from app.utils.permissions import permission_required
import logging
import uuid

logger = logging.getLogger(__name__)

test_assignments_bp = Blueprint("test_assignments", __name__)


def _utc_now():
    return datetime.now(timezone.utc)


def _get_lab_id():
    return g.jwt_payload.get("lab_id")


def _get_user_id():
    return g.jwt_payload.get("user_id")


def _recalculate_receipt_allocation(receipt_id):
    """Calculates quantity_allocated based on unique physical testing_samples count."""
    try:
        alloc_count = db.session.execute(text("""
            SELECT COUNT(*) FROM testing_samples WHERE receipt_id = :rid
        """), {"rid": receipt_id}).scalar() or 0

        db.session.execute(text("""
            UPDATE sample_receipt_register 
            SET quantity_allocated = :alloc, updated_at = :now 
            WHERE sample_id = :rid
        """), {"alloc": alloc_count, "now": _utc_now(), "rid": receipt_id})
    except Exception as e:
        logger.warning(f"Failed to recalculate receipt allocation: {str(e)}")


# ========================================
# RECEIPT & EXISTING SAMPLE SELECTION ENDPOINTS
# ========================================

@test_assignments_bp.route("/eligible-receipts", methods=["GET"])
@token_required
@permission_required("test.view")
def get_eligible_receipts():
    """Get sample receipt lots for a project."""
    try:
        lab_id = _get_lab_id()
        project_id = request.args.get("project_id", "").strip()

        if not project_id:
            return jsonify({"success": False, "message": "project_id is required"}), 400

        rows = db.session.execute(text("""
            SELECT 
                srr.sample_id AS receipt_id,
                srr.sample_no AS receipt_no,
                srr.material_name,
                COALESCE(srr.quantity_received, 1) AS quantity_received,
                COALESCE(srr.quantity_allocated, 0) AS quantity_allocated,
                srr.quantity_unit,
                srr.received_date,
                srr.client_reference
            FROM sample_receipt_register srr
            JOIN projects p ON srr.project_id = p.project_id
            WHERE srr.project_id = :pid AND p.lab_id = :lab_id
            ORDER BY srr.sample_id DESC
        """), {"pid": project_id, "lab_id": lab_id}).mappings().all()

        receipts = []
        for r in rows:
            q_rec = r['quantity_received']
            q_alloc = r['quantity_allocated']
            q_rem = max(0, q_rec - q_alloc)
            receipts.append({
                "receipt_id": r['receipt_id'],
                "receipt_no": r['receipt_no'],
                "material_name": r['material_name'],
                "quantity_received": q_rec,
                "quantity_allocated": q_alloc,
                "quantity_remaining": q_rem,
                "quantity_unit": r['quantity_unit'] or 'Nos',
                "client_reference": r['client_reference'] or ''
            })

        return jsonify({"success": True, "data": receipts})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@test_assignments_bp.route("/existing-testing-samples", methods=["GET"])
@token_required
@permission_required("test.view")
def get_existing_testing_samples():
    """Get physical testing samples allocated for a receipt or project."""
    try:
        lab_id = _get_lab_id()
        receipt_id = request.args.get("receipt_id", "").strip()
        project_id = request.args.get("project_id", "").strip()

        query = """
            SELECT 
                ts.testing_sample_id,
                ts.receipt_id,
                ts.sample_code,
                ts.location_name,
                ts.borelog_no,
                ts.depth_from,
                ts.depth_to,
                ts.depth_unit,
                ts.client_sample_reference,
                ts.sample_description,
                ts.material_name,
                (SELECT COUNT(*) FROM sample_test_assignments sta WHERE sta.testing_sample_id = ts.testing_sample_id AND sta.status NOT IN ('Cancelled')) AS assigned_test_count
            FROM testing_samples ts
            JOIN projects p ON ts.project_id = p.project_id
            WHERE p.lab_id = :lab_id
        """
        params = {"lab_id": lab_id}

        if receipt_id:
            query += " AND ts.receipt_id = :receipt_id"
            params["receipt_id"] = receipt_id
        elif project_id:
            query += " AND ts.project_id = :project_id"
            params["project_id"] = project_id

        query += " ORDER BY ts.testing_sample_id ASC"
        rows = db.session.execute(text(query), params).mappings().all()

        samples = []
        for r in rows:
            df = float(r['depth_from']) if r['depth_from'] is not None else None
            dt = float(r['depth_to']) if r['depth_to'] is not None else None
            unit = r['depth_unit'] or 'm'
            dd = f"{df}–{dt} {unit}" if df is not None and dt is not None else (f"{df} {unit}" if df is not None else "")

            samples.append({
                "testing_sample_id": r['testing_sample_id'],
                "receipt_id": r['receipt_id'],
                "sample_code": r['sample_code'],
                "location_name": r['location_name'] or '',
                "borelog_no": r['borelog_no'] or '',
                "depth_from": df,
                "depth_to": dt,
                "depth_unit": unit,
                "depth_display": dd,
                "client_sample_reference": r['client_sample_reference'] or '',
                "sample_description": r['sample_description'] or '',
                "material_name": r['material_name'],
                "assigned_test_count": r['assigned_test_count']
            })

        return jsonify({"success": True, "data": samples})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@test_assignments_bp.route("/project-scope-tests", methods=["GET"])
@token_required
@permission_required("test.view")
def get_project_scope_tests_for_assignment():
    """Get active tests configured in Project Scope."""
    try:
        lab_id = _get_lab_id()
        project_id = request.args.get("project_id", "").strip()

        if not project_id:
            return jsonify({"success": False, "message": "project_id is required"}), 400

        rows = db.session.execute(text("""
            SELECT 
                pst.project_scope_test_id,
                pst.scope_test_id,
                st.test_name,
                st.test_name AS test_code,
                st.test_method
            FROM project_scope_tests pst
            JOIN scope_tests st ON pst.scope_test_id = st.scope_test_id
            WHERE pst.project_id = :pid AND (pst.status = 'active' OR pst.is_active = TRUE)
            ORDER BY st.test_name ASC
        """), {"pid": project_id}).mappings().all()

        return jsonify({"success": True, "data": [dict(r) for r in rows]})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# Backward compatibility
@test_assignments_bp.route("/available-tests/<int:sample_id>", methods=["GET"])
@token_required
@permission_required("test.view")
def get_available_tests_for_sample(sample_id):
    try:
        lab_id = _get_lab_id()
        # Resolve project_id
        row = db.session.execute(text("""
            SELECT project_id FROM sample_receipt_register WHERE sample_id = :sid
        """), {"sid": sample_id}).fetchone()

        if not row:
            return jsonify({"success": False, "message": "Sample not found"}), 404

        rows = db.session.execute(text("""
            SELECT 
                pst.project_scope_test_id,
                pst.scope_test_id,
                st.test_name,
                st.test_name AS test_code,
                st.test_method
            FROM project_scope_tests pst
            JOIN scope_tests st ON pst.scope_test_id = st.scope_test_id
            WHERE pst.project_id = :pid AND (pst.status = 'active' OR pst.is_active = TRUE)
            ORDER BY st.test_name ASC
        """), {"pid": row.project_id}).mappings().all()

        return jsonify({"success": True, "data": [dict(r) for r in rows]})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ========================================
# BULK ATOMIC ASSIGNMENT CREATION
# ========================================

@test_assignments_bp.route("/bulk-create", methods=["POST"])
@token_required
@permission_required("test.assign")
def bulk_create_test_assignments():
    """Creates atomic test assignments, supporting existing testing samples OR allocating new samples from receipt."""
    try:
        lab_id = _get_lab_id()
        user_id = _get_user_id()
        data = request.get_json() or {}

        project_id = data.get("project_id")
        receipt_id = data.get("receipt_id")
        project_scope_test_id = data.get("project_scope_test_id") or data.get("project_scope_test_ids", [None])[0]
        
        # Mode: 'existing' vs 'new'
        assignment_mode = data.get("assignment_mode") or "existing"
        existing_testing_sample_ids = data.get("existing_testing_sample_ids") or data.get("testing_sample_ids") or []
        new_samples = data.get("new_samples") or []

        assigned_to = data.get("assigned_to")
        target_date_str = data.get("target_date")
        priority = data.get("priority") or "Normal"
        remarks = data.get("remarks") or ""

        if not project_id or not project_scope_test_id:
            return jsonify({"success": False, "message": "project_id and project_scope_test_id are required"}), 400

        target_date = None
        if target_date_str:
            try:
                target_date = datetime.strptime(str(target_date_str), "%Y-%m-%d").date()
            except ValueError:
                target_date = None

        batch_id = f"BATCH-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        # Scope Test Info
        st_info = db.session.execute(text("""
            SELECT pst.project_scope_test_id, pst.scope_test_id, st.test_name, st.test_method
            FROM project_scope_tests pst
            JOIN scope_tests st ON pst.scope_test_id = st.scope_test_id
            WHERE pst.project_scope_test_id = :pst_id
        """), {"pst_id": project_scope_test_id}).mappings().fetchone()

        if not st_info:
            return jsonify({"success": False, "message": "Project scope test not found"}), 404

        target_testing_sample_ids = []

        # MODE A: EXISTING SAMPLES
        if assignment_mode == "existing" or (existing_testing_sample_ids and not new_samples):
            if not existing_testing_sample_ids:
                return jsonify({"success": False, "message": "Please select at least one existing sample"}), 400
            target_testing_sample_ids = existing_testing_sample_ids

        # MODE B: NEW SAMPLES FROM RECEIPT
        else:
            if not receipt_id:
                return jsonify({"success": False, "message": "receipt_id is required to allocate new samples"}), 400
            if not new_samples:
                return jsonify({"success": False, "message": "new_samples list is required"}), 400

            # Lock receipt and validate remaining quantity
            r_info = db.session.execute(text("""
                SELECT quantity_received, quantity_allocated, material_name FROM sample_receipt_register 
                WHERE sample_id = :rid FOR UPDATE
            """), {"rid": receipt_id}).fetchone()

            if not r_info:
                return jsonify({"success": False, "message": "Receipt No. not found"}), 404

            qty_rec = r_info.quantity_received or 1
            qty_alloc = r_info.quantity_allocated or 0
            qty_rem = max(0, qty_rec - qty_alloc)

            if len(new_samples) > qty_rem:
                return jsonify({
                    "success": False,
                    "message": f"Only {qty_rem} unallocated sample(s) remain in this receipt (requested {len(new_samples)})"
                }), 400

            # Create physical testing samples
            for idx, s in enumerate(new_samples):
                cnt = db.session.execute(text("SELECT COUNT(*) FROM testing_samples WHERE receipt_id = :rid"), {"rid": receipt_id}).scalar() or 0
                sample_code = s.get("sample_code") or f"TS-{str(cnt + idx + 1).zfill(3)}"

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
                    "pid": project_id,
                    "code": sample_code,
                    "loc": (s.get("location_name") or "").strip(),
                    "bh": (s.get("borelog_no") or "").strip(),
                    "df": float(s["depth_from"]) if s.get("depth_from") is not None else None,
                    "dt": float(s["depth_to"]) if s.get("depth_to") is not None else None,
                    "unit": s.get("depth_unit") or "m",
                    "ref": (s.get("client_sample_reference") or s.get("client_reference") or "").strip(),
                    "desc": s.get("sample_description") or "",
                    "mat": r_info.material_name,
                    "uid": user_id,
                    "now": _utc_now()
                })
                target_testing_sample_ids.append(res.fetchone()[0])

            _recalculate_receipt_allocation(receipt_id)

        # Create Atomic Test Assignments for each physical testing_sample_id
        created_assignments = []
        skipped_count = 0

        for ts_id in target_testing_sample_ids:
            # Check for existing active assignment
            exists = db.session.execute(text("""
                SELECT 1 FROM sample_test_assignments
                WHERE testing_sample_id = :ts_id AND project_scope_test_id = :pst_id AND status NOT IN ('Cancelled')
            """), {"ts_id": ts_id, "pst_id": project_scope_test_id}).scalar()

            if exists:
                skipped_count += 1
                continue

            # Fetch receipt_id from testing_sample
            ts_row = db.session.execute(text("SELECT receipt_id FROM testing_samples WHERE testing_sample_id = :ts_id"), {"ts_id": ts_id}).fetchone()
            sample_id_ref = ts_row.receipt_id if ts_row else receipt_id

            res = db.session.execute(text("""
                INSERT INTO sample_test_assignments (
                    testing_sample_id, sample_id, project_scope_test_id, assigned_to, assigned_by,
                    assigned_date, target_date, priority, status, remarks,
                    assignment_batch_id, created_by, created_at, updated_at
                ) VALUES (
                    :ts_id, :sid, :pst_id, :assigned_to, :assigned_by,
                    :assigned_date, :target_date, :priority, 'Assigned', :remarks,
                    :batch_id, :created_by, :now, :now
                ) RETURNING assignment_id
            """), {
                "ts_id": ts_id,
                "sid": sample_id_ref,
                "pst_id": project_scope_test_id,
                "assigned_to": assigned_to,
                "assigned_by": user_id,
                "assigned_date": date.today(),
                "target_date": target_date,
                "priority": priority,
                "remarks": remarks,
                "batch_id": batch_id,
                "created_by": user_id,
                "now": _utc_now()
            })
            new_assign_id = res.fetchone()[0]

            # Upsert sample_test_results
            db.session.execute(text("""
                INSERT INTO sample_test_results (
                    lab_id, project_id, sample_id, project_scope_test_id, scope_test_id,
                    test_name, test_method, entered_by, updated_by, created_at, updated_at
                ) VALUES (
                    :lab_id, :project_id, :sid, :pst_id, :mst_id,
                    :test_name, :test_method, :uid, :uid, :now, :now
                ) ON CONFLICT (sample_id, project_scope_test_id) WHERE project_scope_test_id IS NOT NULL
                DO UPDATE SET is_active = TRUE, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at
            """), {
                "lab_id": lab_id,
                "project_id": project_id,
                "sid": sample_id_ref,
                "pst_id": project_scope_test_id,
                "mst_id": st_info['scope_test_id'],
                "test_name": st_info['test_name'],
                "test_method": st_info['test_method'],
                "uid": user_id,
                "now": _utc_now()
            })

            created_assignments.append(new_assign_id)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Successfully created {len(created_assignments)} test assignment(s)",
            "data": {
                "batch_id": batch_id,
                "created_count": len(created_assignments),
                "skipped_count": skipped_count,
                "physical_samples_count": len(target_testing_sample_ids)
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


# ========================================
# LIST & DASHBOARD ENDPOINTS
# ========================================

@test_assignments_bp.route("/", methods=["GET"])
@token_required
@permission_required("test.view")
def get_assignments_list():
    """List atomic test assignments with full physical testing sample & receipt details."""
    try:
        lab_id = _get_lab_id()
        project_id = request.args.get("project_id", "").strip()
        location_name = request.args.get("location_name", "").strip()
        borelog_no = request.args.get("borelog_no", "").strip()
        test_id = request.args.get("test_id", "").strip()
        assigned_to = request.args.get("assigned_to", "").strip()
        status = request.args.get("status", "").strip()
        priority = request.args.get("priority", "").strip()
        search = request.args.get("search", "").strip()

        query = """
            SELECT 
                sta.assignment_id,
                sta.testing_sample_id,
                ts.sample_code,
                ts.location_name,
                ts.borelog_no,
                ts.depth_from,
                ts.depth_to,
                ts.depth_unit,
                ts.client_sample_reference,
                srr.sample_id AS receipt_id,
                srr.sample_no AS receipt_no,
                p.project_id,
                p.project_name,
                p.project_code,
                sta.project_scope_test_id,
                st.scope_test_id,
                st.test_name,
                st.test_name AS test_code,
                st.test_method,
                sta.assigned_to,
                TRIM(CONCAT(u.first_name, ' ', COALESCE(u.last_name, ''))) AS technician_name,
                sta.assigned_by,
                TRIM(CONCAT(u_by.first_name, ' ', COALESCE(u_by.last_name, ''))) AS assigned_by_name,
                sta.assigned_date,
                sta.target_date,
                sta.priority,
                sta.status,
                sta.remarks,
                sta.assignment_batch_id,
                sta.created_at
            FROM sample_test_assignments sta
            LEFT JOIN testing_samples ts ON sta.testing_sample_id = ts.testing_sample_id
            LEFT JOIN sample_receipt_register srr ON COALESCE(ts.receipt_id, sta.sample_id) = srr.sample_id
            LEFT JOIN projects p ON COALESCE(srr.project_id, ts.project_id) = p.project_id
            LEFT JOIN project_scope_tests pst ON sta.project_scope_test_id = pst.project_scope_test_id
            LEFT JOIN scope_tests st ON pst.scope_test_id = st.scope_test_id
            LEFT JOIN users u ON sta.assigned_to = u.user_id
            LEFT JOIN users u_by ON sta.assigned_by = u_by.user_id
            WHERE (p.lab_id = :lab_id OR p.lab_id IS NULL) AND sta.status NOT IN ('Cancelled')
        """
        params = {"lab_id": lab_id}

        if project_id and project_id != "all":
            query += " AND COALESCE(srr.project_id, ts.project_id) = :project_id"
            params["project_id"] = project_id
        if location_name:
            query += " AND ts.location_name ILIKE :loc"
            params["loc"] = f"%{location_name}%"
        if borelog_no:
            query += " AND ts.borelog_no ILIKE :bh"
            params["bh"] = f"%{borelog_no}%"
        if test_id:
            query += " AND (sta.project_scope_test_id = :tid OR st.scope_test_id = :tid)"
            params["tid"] = test_id
        if assigned_to and assigned_to != "all":
            query += " AND sta.assigned_to = :assigned_to"
            params["assigned_to"] = assigned_to
        if status and status != "all":
            query += " AND sta.status ILIKE :status"
            params["status"] = status
        if priority:
            query += " AND sta.priority = :priority"
            params["priority"] = priority
        if search:
            query += """ AND (
                ts.sample_code ILIKE :search OR
                srr.sample_no ILIKE :search OR
                ts.client_sample_reference ILIKE :search OR
                st.test_name ILIKE :search OR
                CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) ILIKE :search OR
                ts.location_name ILIKE :search OR
                ts.borelog_no ILIKE :search
            )"""
            params["search"] = f"%{search}%"

        query += " ORDER BY sta.assignment_id DESC"
        rows = db.session.execute(text(query), params).mappings().all()

        assignments = []
        for r in rows:
            df = float(r['depth_from']) if r.get('depth_from') is not None else None
            dt = float(r['depth_to']) if r.get('depth_to') is not None else None
            unit = r.get('depth_unit') or 'm'
            dd = f"{df}–{dt} {unit}" if df is not None and dt is not None else (f"{df} {unit}" if df is not None else "")

            assignments.append({
                "assignment_id": r['assignment_id'],
                "testing_sample_id": r['testing_sample_id'],
                "sample_code": r['sample_code'] or f"TS-{r['assignment_id']}",
                "sample_no": r['sample_code'] or f"TS-{r['assignment_id']}",
                "receipt_id": r['receipt_id'],
                "receipt_no": r['receipt_no'],
                "location_name": r['location_name'] or '',
                "borelog_no": r['borelog_no'] or '',
                "depth_display": dd,
                "client_sample_reference": r['client_sample_reference'] or '',
                "project_id": r['project_id'],
                "project_name": r['project_name'],
                "project_code": r['project_code'],
                "project_scope_test_id": r['project_scope_test_id'],
                "scope_test_id": r['scope_test_id'],
                "test_name": r['test_name'] or "General Test",
                "test_code": r['test_code'],
                "test_method": r['test_method'],
                "assigned_to": r['assigned_to'],
                "technician_name": r['technician_name'] or "Unassigned",
                "assigned_by_name": r['assigned_by_name'],
                "assigned_date": _iso_date(r['assigned_date']),
                "target_date": _iso_date(r['target_date']),
                "priority": r['priority'],
                "status": r['status'],
                "remarks": r['remarks'],
                "assignment_batch_id": r['assignment_batch_id'],
                "created_at": r['created_at'].isoformat() if r.get('created_at') else None,
            })

        return jsonify({"success": True, "data": assignments})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@test_assignments_bp.route("/by-project/<int:project_id>", methods=["GET"])
@token_required
@permission_required("test.view")
def get_assignments_by_project(project_id):
    request.args = dict(request.args)
    request.args["project_id"] = str(project_id)
    return get_assignments_list()


@test_assignments_bp.route("/by-sample/<int:sample_id>", methods=["GET"])
@token_required
@permission_required("test.view")
def get_assignments_by_sample(sample_id):
    try:
        lab_id = _get_lab_id()
        rows = db.session.execute(text("""
            SELECT sta.*, st.test_name, st.test_name AS test_code, TRIM(CONCAT(u.first_name, ' ', COALESCE(u.last_name, ''))) AS technician_name
            FROM sample_test_assignments sta
            JOIN sample_receipt_register srr ON sta.sample_id = srr.sample_id
            JOIN projects p ON srr.project_id = p.project_id
            LEFT JOIN project_scope_tests pst ON sta.project_scope_test_id = pst.project_scope_test_id
            LEFT JOIN scope_tests st ON pst.scope_test_id = st.scope_test_id
            LEFT JOIN users u ON sta.assigned_to = u.user_id
            WHERE sta.sample_id = :sid AND p.lab_id = :lab_id AND sta.status NOT IN ('Cancelled')
            ORDER BY sta.assignment_id ASC
        """), {"sid": sample_id, "lab_id": lab_id}).mappings().all()

        return jsonify({"success": True, "data": [dict(r) for r in rows]})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@test_assignments_bp.route("/dashboard-summary", methods=["GET"])
@token_required
@permission_required("test.view")
def get_dashboard_summary():
    try:
        lab_id = _get_lab_id()
        project_id = request.args.get("project_id", "").strip()

        where_clause = "WHERE p.lab_id = :lab_id AND sta.status NOT IN ('Cancelled')"
        params = {"lab_id": lab_id, "today": date.today()}
        if project_id and project_id != "all":
            where_clause += " AND srr.project_id = :project_id"
            params["project_id"] = project_id

        summary = db.session.execute(text(f"""
            SELECT 
                COUNT(sta.assignment_id) AS total_assigned,
                COUNT(CASE WHEN sta.status IN ('In Progress', 'Testing') THEN 1 END) AS in_progress,
                COUNT(CASE WHEN sta.target_date = :today AND sta.status NOT IN ('Completed', 'Approved') THEN 1 END) AS due_today,
                COUNT(CASE WHEN sta.target_date < :today AND sta.status NOT IN ('Completed', 'Approved') THEN 1 END) AS overdue,
                COUNT(CASE WHEN sta.status IN ('Completed', 'Observation Completed', 'Result Generated', 'Reviewed', 'Approved') THEN 1 END) AS completed
            FROM sample_test_assignments sta
            LEFT JOIN testing_samples ts ON sta.testing_sample_id = ts.testing_sample_id
            LEFT JOIN sample_receipt_register srr ON COALESCE(ts.receipt_id, sta.sample_id) = srr.sample_id
            LEFT JOIN projects p ON COALESCE(srr.project_id, ts.project_id) = p.project_id
            {where_clause}
        """), params).mappings().one()

        return jsonify({"success": True, "data": dict(summary)})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@test_assignments_bp.route("/<int:assignment_id>/status", methods=["PATCH"])
@token_required
@permission_required("test.assign")
def update_assignment_status(assignment_id):
    try:
        lab_id = _get_lab_id()
        data = request.get_json() or {}
        new_status = data.get("status")
        remarks = data.get("remarks", "")

        if not new_status:
            return jsonify({"success": False, "message": "status is required"}), 400

        assign_row = db.session.execute(text("""
            SELECT sta.assignment_id, sta.sample_id, sta.status
            FROM sample_test_assignments sta
            JOIN sample_receipt_register srr ON sta.sample_id = srr.sample_id
            JOIN projects p ON srr.project_id = p.project_id
            WHERE sta.assignment_id = :aid AND p.lab_id = :lab_id
        """), {"aid": assignment_id, "lab_id": lab_id}).fetchone()

        if not assign_row:
            return jsonify({"success": False, "message": "Assignment not found"}), 404

        db.session.execute(text("""
            UPDATE sample_test_assignments SET status = :status, remarks = COALESCE(NULLIF(:remarks, ''), remarks), updated_at = :now
            WHERE assignment_id = :aid
        """), {"status": new_status, "remarks": remarks, "now": _utc_now(), "aid": assignment_id})

        db.session.commit()
        return jsonify({"success": True, "message": "Status updated successfully", "data": {"status": new_status}})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@test_assignments_bp.route("/<int:assignment_id>", methods=["DELETE"])
@token_required
@permission_required("test.assign")
def delete_assignment(assignment_id):
    try:
        lab_id = _get_lab_id()
        assign_row = db.session.execute(text("""
            SELECT sta.assignment_id, sta.sample_id
            FROM sample_test_assignments sta
            JOIN sample_receipt_register srr ON sta.sample_id = srr.sample_id
            JOIN projects p ON srr.project_id = p.project_id
            WHERE sta.assignment_id = :aid AND p.lab_id = :lab_id
        """), {"aid": assignment_id, "lab_id": lab_id}).fetchone()

        if not assign_row:
            return jsonify({"success": False, "message": "Assignment not found"}), 404

        db.session.execute(text("UPDATE sample_test_assignments SET status = 'Cancelled', updated_at = :now WHERE assignment_id = :aid"), {
            "now": _utc_now(), "aid": assignment_id
        })
        db.session.commit()
        return jsonify({"success": True, "message": "Assignment cancelled successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


def _iso_date(val):
    if not val:
        return None
    if hasattr(val, 'isoformat'):
        return val.isoformat()
    return str(val)
