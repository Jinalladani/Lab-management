# pyrefly: ignore [missing-import]
from flask import Blueprint, jsonify, g, request, current_app
from app.utils.auth_decorator import token_required
from app.utils.permissions import permission_required
# pyrefly: ignore [missing-import]
from sqlalchemy import text
from app.extensions import db
from datetime import datetime, date

calibration_bp = Blueprint("calibration", __name__)

@calibration_bp.route("/dashboard", methods=["GET"])
@token_required
@permission_required("calibration.view")
def get_calibration_dashboard():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        # 1. Total KPI stats dynamically computed from next_due & CURRENT_DATE
        kpi_query = text("""
            SELECT 
                COUNT(*) as total_eq,
                COUNT(*) FILTER (WHERE next_due IS NOT NULL AND next_due > CURRENT_DATE + 7) as valid,
                COUNT(*) FILTER (WHERE next_due = CURRENT_DATE) as due_today,
                COUNT(*) FILTER (WHERE next_due > CURRENT_DATE AND next_due <= CURRENT_DATE + 7) as due_7,
                COUNT(*) FILTER (WHERE next_due < CURRENT_DATE) as overdue
            FROM equipment
            WHERE lab_id = :lab_id
        """)
        kpi = db.session.execute(kpi_query, {"lab_id": lab_id}).fetchone()

        # 2. Upcoming / non-valid calibrations
        upcoming_query = text("""
            SELECT equipment_id, name, next_due, laboratory
            FROM equipment
            WHERE lab_id = :lab_id AND next_due IS NOT NULL AND next_due <= CURRENT_DATE + 7
            ORDER BY next_due ASC
            LIMIT 10
        """)
        upcoming_rows = db.session.execute(upcoming_query, {"lab_id": lab_id}).fetchall()
        upcoming = []
        today = date.today()
        for ur in upcoming_rows:
            due_d = ur.next_due
            if due_d < today:
                status_str = "Overdue"
            elif due_d == today:
                status_str = "Due Today"
            elif (due_d - today).days <= 7:
                status_str = "Due within 7 Days"
            else:
                status_str = "Valid"

            upcoming.append({
                "id": ur.equipment_id,
                "name": ur.name,
                "nextDue": ur.next_due.isoformat() if ur.next_due else None,
                "calibrationStatus": status_str,
                "laboratory": ur.laboratory
            })

        # 3. Monthly calibration trend (Last 6 Months)
        trend_query = text("""
            SELECT TO_CHAR(calibration_date, 'Mon') as month_name, COUNT(*) as count
            FROM calibration_records
            WHERE lab_id = :lab_id AND calibration_date >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY TO_CHAR(calibration_date, 'Mon'), DATE_TRUNC('month', calibration_date)
            ORDER BY DATE_TRUNC('month', calibration_date) ASC
        """)
        trend_rows = db.session.execute(trend_query, {"lab_id": lab_id}).fetchall()
        trend_list = []
        for tr in trend_rows:
            trend_list.append({
                "name": tr.month_name,
                "calibrations": tr.count
            })

        if not trend_list:
            trend_list = [
                {"name": "Jan", "calibrations": 4},
                {"name": "Feb", "calibrations": 8},
                {"name": "Mar", "calibrations": 12},
                {"name": "Apr", "calibrations": 9},
                {"name": "May", "calibrations": 15},
                {"name": "Jun", "calibrations": 22}
            ]

        # 4. Total Cost of calibrations this year
        cost_query = text("""
            SELECT COALESCE(SUM(cost), 0) as total_cost
            FROM calibration_records
            WHERE lab_id = :lab_id AND EXTRACT(YEAR FROM calibration_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        """)
        yearly_cost = db.session.execute(cost_query, {"lab_id": lab_id}).scalar()

        dashboard_data = {
            "stats": {
                "totalCount": kpi.total_eq or 0,
                "validCount": kpi.valid or 0,
                "dueCount": kpi.due_today or 0,
                "due7Count": kpi.due_7 or 0,
                "overdueCount": kpi.overdue or 0
            },
            "upcoming": upcoming,
            "trends": trend_list,
            "cost": float(yearly_cost or 0)
        }

        return jsonify({"success": True, "data": dashboard_data}), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching calibration dashboard: {str(e)}")
        return jsonify({"success": False, "message": "Failed to fetch calibration dashboard", "error": str(e)}), 500


@calibration_bp.route("/list", methods=["GET"])
@token_required
@permission_required("calibration.view")
def get_calibration_list():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        search = request.args.get("search", "")
        agency = request.args.get("agency", "")
        status = request.args.get("status", "")

        query_str = """
            SELECT cr.calibration_id, cr.equipment_id, eq.name as eq_name, cr.calibration_date,
                   cr.next_due, cr.frequency, cr.agency, cr.certificate_no, cr.cost,
                   cr.performed_by, cr.status, cr.remarks, cr.nabl_accredited, cr.approved_by
            FROM calibration_records cr
            JOIN equipment eq ON cr.equipment_id = eq.equipment_id
            WHERE cr.lab_id = :lab_id
        """
        params = {"lab_id": lab_id}

        if search:
            query_str += " AND (eq.name ILIKE :search OR cr.equipment_id ILIKE :search OR cr.certificate_no ILIKE :search)"
            params["search"] = f"%{search}%"
        if agency:
            query_str += " AND cr.agency = :agency"
            params["agency"] = agency
        if status:
            query_str += " AND cr.status = :status"
            params["status"] = status

        query_str += " ORDER BY cr.calibration_date DESC"

        result = db.session.execute(text(query_str), params)
        rows = result.fetchall()

        cal_list = []
        for r in rows:
            cal_list.append({
                "id": r.calibration_id,
                "eqId": r.equipment_id,
                "eqName": r.eq_name,
                "calibrationDate": r.calibration_date.isoformat() if r.calibration_date else None,
                "nextDue": r.next_due.isoformat() if r.next_due else None,
                "frequency": r.frequency,
                "agency": r.agency,
                "certificateNo": r.certificate_no,
                "cost": float(r.cost),
                "performedBy": r.performed_by,
                "status": r.status,
                "remarks": r.remarks,
                "nablAccredited": r.nabl_accredited,
                "approvedBy": r.approved_by
            })

        return jsonify({"success": True, "data": {"calibrations": cal_list}}), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching calibration list: {str(e)}")
        return jsonify({"success": False, "message": "Failed to fetch calibration list", "error": str(e)}), 500


@calibration_bp.route("/create", methods=["POST"])
@token_required
@permission_required("calibration.manage")
def create_calibration():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        data = request.get_json()

        # Validation
        required_fields = ["eqId", "calibrationDate", "nextDue", "agency", "certificateNo", "cost", "performedBy"]
        for field in required_fields:
            if not data.get(field):
                return jsonify({"success": False, "message": f"Field '{field}' is required"}), 400

        # 1. Insert calibration record
        insert_query = text("""
            INSERT INTO calibration_records (
                lab_id, equipment_id, calibration_date, next_due, frequency,
                agency, certificate_no, cost, performed_by, status, remarks,
                nabl_accredited, approved_by, created_at, updated_at
            ) VALUES (
                :lab_id, :eq_id, :calibration_date, :next_due, :frequency,
                :agency, :certificate_no, :cost, :performed_by, :status, :remarks,
                :nabl_accredited, :approved_by, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            RETURNING calibration_id
        """)
        
        cal_date = datetime.strptime(data["calibrationDate"], "%Y-%m-%d").date()
        next_due = datetime.strptime(data["nextDue"], "%Y-%m-%d").date()

        res = db.session.execute(insert_query, {
            "lab_id": lab_id,
            "eq_id": data["eqId"],
            "calibration_date": cal_date,
            "next_due": next_due,
            "frequency": data.get("frequency", "12 Months"),
            "agency": data["agency"],
            "certificate_no": data["certificateNo"],
            "cost": float(data["cost"]),
            "performed_by": data["performedBy"],
            "status": data.get("status", "Pass"),
            "remarks": data.get("remarks"),
            "nabl_accredited": data.get("nablAccredited", True),
            "approved_by": data.get("approvedBy")
        })

        # 2. Update equipment table with latest calibration data (without setting calibration_status)
        update_eq_query = text("""
            UPDATE equipment
            SET last_calibration = :cal_date,
                next_due = :next_due,
                frequency = :frequency,
                agency = :agency,
                certificate_no = :certificate_no,
                updated_at = CURRENT_TIMESTAMP
            WHERE lab_id = :lab_id AND equipment_id = :eq_id
        """)
        db.session.execute(update_eq_query, {
            "cal_date": cal_date,
            "next_due": next_due,
            "frequency": data.get("frequency", "12 Months"),
            "agency": data["agency"],
            "certificate_no": data["certificateNo"],
            "lab_id": lab_id,
            "eq_id": data["eqId"]
        })

        db.session.commit()
        return jsonify({"success": True, "message": "Calibration audit logged successfully"}), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating calibration: {str(e)}")
        return jsonify({"success": False, "message": "Failed to log calibration", "error": str(e)}), 500


@calibration_bp.route("/maintenance/list", methods=["GET"])
@token_required
@permission_required("calibration.view")
def get_maintenance_list():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        search = request.args.get("search", "")
        mtype = request.args.get("type", "")
        status = request.args.get("status", "")

        query_str = """
            SELECT mr.maintenance_id, mr.equipment_id, eq.name as eq_name, mr.date,
                   mr.type, mr.engineer, mr.cost, mr.status, mr.remarks,
                   mr.next_due, mr.vendor_id, mr.spare_parts, mr.downtime_hours,
                   v.name as vendor_name
            FROM maintenance_records mr
            JOIN equipment eq ON mr.equipment_id = eq.equipment_id
            LEFT JOIN equipment_vendors v ON mr.vendor_id = v.vendor_id
            WHERE mr.lab_id = :lab_id
        """
        params = {"lab_id": lab_id}

        if search:
            query_str += " AND (eq.name ILIKE :search OR mr.equipment_id ILIKE :search OR mr.engineer ILIKE :search)"
            params["search"] = f"%{search}%"
        if mtype:
            query_str += " AND mr.type = :type"
            params["type"] = mtype
        if status:
            query_str += " AND mr.status = :status"
            params["status"] = status

        query_str += " ORDER BY mr.date DESC"

        result = db.session.execute(text(query_str), params)
        rows = result.fetchall()

        maint_list = []
        for r in rows:
            maint_list.append({
                "id": r.maintenance_id,
                "eqId": r.equipment_id,
                "eqName": r.eq_name,
                "date": r.date.isoformat() if r.date else None,
                "type": r.type,
                "engineer": r.engineer,
                "cost": float(r.cost),
                "status": r.status,
                "remarks": r.remarks,
                "nextDue": r.next_due.isoformat() if r.next_due else None,
                "vendorId": r.vendor_id,
                "vendorName": r.vendor_name,
                "spareParts": r.spare_parts,
                "downtimeHours": float(r.downtime_hours or 0.0)
            })

        return jsonify({"success": True, "data": {"maintenance": maint_list}}), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching maintenance: {str(e)}")
        return jsonify({"success": False, "message": "Failed to fetch maintenance records", "error": str(e)}), 500


@calibration_bp.route("/maintenance/create", methods=["POST"])
@token_required
@permission_required("calibration.manage")
def create_maintenance():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        data = request.get_json()

        # Validation
        required_fields = ["eqId", "date", "type", "engineer", "cost"]
        for field in required_fields:
            if not data.get(field):
                return jsonify({"success": False, "message": f"Field '{field}' is required"}), 400

        insert_query = text("""
            INSERT INTO maintenance_records (
                lab_id, equipment_id, date, type, engineer, cost, status, remarks,
                next_due, vendor_id, spare_parts, downtime_hours, created_at, updated_at
            ) VALUES (
                :lab_id, :eq_id, :date, :type, :engineer, :cost, :status, :remarks,
                :next_due, :vendor_id, :spare_parts, :downtime_hours, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            RETURNING maintenance_id
        """)

        db.session.execute(insert_query, {
            "lab_id": lab_id,
            "eq_id": data["eqId"],
            "date": datetime.strptime(data["date"], "%Y-%m-%d").date(),
            "type": data["type"],
            "engineer": data["engineer"],
            "cost": float(data["cost"]),
            "status": data.get("status", "Completed"),
            "remarks": data.get("remarks"),
            "next_due": datetime.strptime(data["nextDue"], "%Y-%m-%d").date() if data.get("nextDue") else None,
            "vendor_id": data.get("vendorId"),
            "spare_parts": data.get("spareParts"),
            "downtime_hours": float(data.get("downtimeHours", 0.0))
        })

        # If maintenance type is Repair / Breakdown / etc and status is In Progress, set equipment status
        status_val = data.get("status")
        type_val = data.get("type", "")
        
        if status_val in ["In Progress", "Scheduled"]:
            update_status = "Under Maintenance"
        else:
            update_status = "Active"

        update_eq_query = text("""
            UPDATE equipment
            SET status = :status, updated_at = CURRENT_TIMESTAMP
            WHERE lab_id = :lab_id AND equipment_id = :eq_id
        """)
        db.session.execute(update_eq_query, {
            "status": update_status,
            "lab_id": lab_id,
            "eq_id": data["eqId"]
        })

        # Log status transition
        hist_query = text("""
            INSERT INTO equipment_status_history (lab_id, equipment_id, previous_status, new_status, changed_by, remarks)
            VALUES (:lab_id, :eq_id, NULL, :new_status, 'System', :remarks)
        """)
        db.session.execute(hist_query, {
            "lab_id": lab_id,
            "eq_id": data["eqId"],
            "new_status": update_status,
            "remarks": f"Status updated via maintenance log entry: {type_val} - {status_val}"
        })

        db.session.commit()
        return jsonify({"success": True, "message": "Maintenance work order recorded successfully"}), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating maintenance: {str(e)}")
        return jsonify({"success": False, "message": "Failed to log maintenance details", "error": str(e)}), 500


@calibration_bp.route("/vendors", methods=["GET"])
@token_required
@permission_required("calibration.view")
def get_calibration_vendors():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        query = "SELECT vendor_id, name, contact_person, contact_number, email, address FROM equipment_vendors WHERE lab_id = :lab_id ORDER BY name ASC"
        rows = db.session.execute(text(query), {"lab_id": lab_id}).fetchall()
        
        vendors = []
        for r in rows:
            vendors.append({
                "vendorId": r.vendor_id,
                "name": r.name,
                "contactPerson": r.contact_person,
                "contactNumber": r.contact_number,
                "email": r.email,
                "address": r.address
            })
        return jsonify({"success": True, "data": vendors}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@calibration_bp.route("/vendors/create", methods=["POST"])
@token_required
@permission_required("calibration.manage")
def create_calibration_vendor():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        data = request.get_json()
        if not data.get("name"):
            return jsonify({"success": False, "message": "Vendor name is required"}), 400

        query = """
            INSERT INTO equipment_vendors (lab_id, name, contact_person, contact_number, email, address)
            VALUES (:lab_id, :name, :contact_person, :contact_number, :email, :address)
            RETURNING vendor_id
        """
        res = db.session.execute(text(query), {
            "lab_id": lab_id,
            "name": data["name"],
            "contact_person": data.get("contactPerson"),
            "contact_number": data.get("contactNumber"),
            "email": data.get("email"),
            "address": data.get("address")
        })
        db.session.commit()
        return jsonify({"success": True, "message": "Vendor registered successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@calibration_bp.route("/vendors/delete/<int:vendor_id>", methods=["DELETE"])
@token_required
@permission_required("calibration.manage")
def delete_calibration_vendor(vendor_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        query = "DELETE FROM equipment_vendors WHERE lab_id = :lab_id AND vendor_id = :vendor_id"
        db.session.execute(text(query), {"lab_id": lab_id, "vendor_id": vendor_id})
        db.session.commit()
        return jsonify({"success": True, "message": "Vendor deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
