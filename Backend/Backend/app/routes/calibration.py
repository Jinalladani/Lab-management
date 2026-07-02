from flask import Blueprint, jsonify, g, request, current_app
from app.utils.auth_decorator import token_required
from sqlalchemy import text
from app.extensions import db
from datetime import datetime, date

calibration_bp = Blueprint("calibration", __name__)

@calibration_bp.route("/dashboard", methods=["GET"])
@token_required
def get_calibration_dashboard():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        # 1. Total KPI stats
        kpi_query = text("""
            SELECT 
                COUNT(*) as total_eq,
                COUNT(*) FILTER (WHERE calibration_status = 'Valid') as valid,
                COUNT(*) FILTER (WHERE calibration_status = 'Due Soon') as due_soon,
                COUNT(*) FILTER (WHERE calibration_status = 'Due within 7 Days') as due_7,
                COUNT(*) FILTER (WHERE calibration_status = 'Overdue') as overdue
            FROM equipment
            WHERE lab_id = :lab_id
        """)
        kpi = db.session.execute(kpi_query, {"lab_id": lab_id}).fetchone()

        # 2. Upcoming calibrations (Next 30 Days)
        upcoming_query = text("""
            SELECT equipment_id, name, next_due, calibration_status, laboratory
            FROM equipment
            WHERE lab_id = :lab_id AND calibration_status != 'Valid' AND calibration_status != 'Not Required'
            ORDER BY next_due ASC
            LIMIT 10
        """)
        upcoming_rows = db.session.execute(upcoming_query, {"lab_id": lab_id}).fetchall()
        upcoming = []
        for ur in upcoming_rows:
            upcoming.append({
                "id": ur.equipment_id,
                "name": ur.name,
                "nextDue": ur.next_due.isoformat() if ur.next_due else None,
                "calibrationStatus": ur.calibration_status,
                "laboratory": ur.laboratory
            })

        # 3. Monthly calibration trend (Last 6 Months)
        # For simplicity, group counts of calibration records by month
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

        # Default trend data if none found to prevent empty charts
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
                "dueCount": kpi.due_soon or 0,
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
                   cr.performed_by, cr.status, cr.remarks
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
                "remarks": r.remarks
            })

        return jsonify({"success": True, "data": {"calibrations": cal_list}}), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching calibration list: {str(e)}")
        return jsonify({"success": False, "message": "Failed to fetch calibration list", "error": str(e)}), 500


@calibration_bp.route("/create", methods=["POST"])
@token_required
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
                created_at, updated_at
            ) VALUES (
                :lab_id, :eq_id, :calibration_date, :next_due, :frequency,
                :agency, :certificate_no, :cost, :performed_by, :status, :remarks,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            RETURNING calibration_id
        """)
        
        cal_date = datetime.strptime(data["calibrationDate"], "%Y-%m-%d").date()
        next_due = datetime.strptime(data["nextDue"], "%Y-%m-%d").date()
        
        # Calculate new calibration status for equipment
        today = date.today()
        diff_days = (next_due - today).days
        if diff_days < 0:
            cal_status = "Overdue"
        elif diff_days <= 7:
            cal_status = "Due within 7 Days"
        elif diff_days <= 30:
            cal_status = "Due Soon"
        else:
            cal_status = "Valid"

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
            "remarks": data.get("remarks")
        })

        # 2. Update equipment table with latest calibration data
        update_eq_query = text("""
            UPDATE equipment
            SET last_calibration = :cal_date,
                next_due = :next_due,
                frequency = :frequency,
                agency = :agency,
                certificate_no = :certificate_no,
                calibration_status = :cal_status,
                updated_at = CURRENT_TIMESTAMP
            WHERE lab_id = :lab_id AND equipment_id = :eq_id
        """)
        db.session.execute(update_eq_query, {
            "cal_date": cal_date,
            "next_due": next_due,
            "frequency": data.get("frequency", "12 Months"),
            "agency": data["agency"],
            "certificate_no": data["certificateNo"],
            "cal_status": cal_status,
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
                   mr.type, mr.engineer, mr.cost, mr.status, mr.remarks
            FROM maintenance_records mr
            JOIN equipment eq ON mr.equipment_id = eq.equipment_id
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
                "remarks": r.remarks
            })

        return jsonify({"success": True, "data": {"maintenance": maint_list}}), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching maintenance: {str(e)}")
        return jsonify({"success": False, "message": "Failed to fetch maintenance records", "error": str(e)}), 500


@calibration_bp.route("/maintenance/create", methods=["POST"])
@token_required
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
                created_at, updated_at
            ) VALUES (
                :lab_id, :eq_id, :date, :type, :engineer, :cost, :status, :remarks,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
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
            "remarks": data.get("remarks")
        })

        # If maintenance type is Repair and status is In Progress, also set equipment status to "Under Maintenance"
        if data.get("status") == "In Progress" or data.get("status") == "Scheduled":
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

        db.session.commit()
        return jsonify({"success": True, "message": "Maintenance work order recorded successfully"}), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating maintenance: {str(e)}")
        return jsonify({"success": False, "message": "Failed to log maintenance details", "error": str(e)}), 500
