from flask import Blueprint, jsonify, g, request, current_app
from app.utils.auth_decorator import token_required
from sqlalchemy import text
from app.extensions import db
from datetime import datetime
import os
import uuid
from werkzeug.utils import secure_filename

equipment_bp = Blueprint("equipment", __name__)

@equipment_bp.route("/list", methods=["GET"])
@token_required
def get_equipment_list():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        search = request.args.get("search", "")
        category = request.args.get("category", "")
        laboratory = request.args.get("laboratory", "")
        status = request.args.get("status", "")

        query_str = """
            SELECT equipment_id, lab_id, name, category, laboratory, status,
                   calibration_status, next_due, last_calibration, frequency,
                   agency, certificate_no, model, serial_no, location,
                   responsible_person, manufacturer, supplier, purchase_date,
                   installation_date, measurement_range, least_count, accuracy,
                   power_supply, description, remarks, created_at, updated_at,
                   asset_tag, warranty_expiry_date, invoice_no, purchase_cost,
                   capacity, unit, software, other_specification,
                   internal_check_frequency, nabl_accredited, traceability_details,
                   calibration_method, next_internal_check_date, reminder_before_days
            FROM equipment
            WHERE lab_id = :lab_id
        """
        params = {"lab_id": lab_id}

        if search:
            query_str += " AND (name ILIKE :search OR equipment_id ILIKE :search OR model ILIKE :search OR serial_no ILIKE :search OR asset_tag ILIKE :search)"
            params["search"] = f"%{search}%"
        if category:
            query_str += " AND category = :category"
            params["category"] = category
        if laboratory:
            query_str += " AND laboratory = :laboratory"
            params["laboratory"] = laboratory
        if status:
            query_str += " AND status = :status"
            params["status"] = status

        query_str += " ORDER BY created_at DESC"

        result = db.session.execute(text(query_str), params)
        rows = result.fetchall()

        eq_list = []
        for r in rows:
            eq_list.append({
                "id": r.equipment_id,
                "lab_id": r.lab_id,
                "name": r.name,
                "category": r.category,
                "laboratory": r.laboratory,
                "status": r.status,
                "calibrationStatus": r.calibration_status,
                "nextDue": r.next_due.isoformat() if r.next_due else None,
                "lastCalibration": r.last_calibration.isoformat() if r.last_calibration else None,
                "frequency": r.frequency,
                "agency": r.agency,
                "certificateNo": r.certificate_no,
                "model": r.model,
                "serialNo": r.serial_no,
                "location": r.location,
                "responsiblePerson": r.responsible_person,
                "manufacturer": r.manufacturer,
                "supplier": r.supplier,
                "purchaseDate": r.purchase_date.isoformat() if r.purchase_date else None,
                "installationDate": r.installation_date.isoformat() if r.installation_date else None,
                "measurementRange": r.measurement_range,
                "leastCount": r.least_count,
                "accuracy": r.accuracy,
                "powerSupply": r.power_supply,
                "description": r.description,
                "remarks": r.remarks,
                "assetTag": r.asset_tag,
                "warrantyExpiryDate": r.warranty_expiry_date.isoformat() if r.warranty_expiry_date else None,
                "invoiceNo": r.invoice_no,
                "purchaseCost": float(r.purchase_cost) if r.purchase_cost is not None else 0.0,
                "capacity": r.capacity,
                "unit": r.unit,
                "software": r.software,
                "otherSpecification": r.other_specification,
                "internalCheckFrequency": r.internal_check_frequency,
                "nablAccredited": r.nabl_accredited,
                "traceabilityDetails": r.traceability_details,
                "calibrationMethod": r.calibration_method,
                "nextInternalCheckDate": r.next_internal_check_date.isoformat() if r.next_internal_check_date else None,
                "reminderBeforeDays": r.reminder_before_days
            })

        return jsonify({
            "success": True,
            "data": {
                "equipment": eq_list,
                "total_count": len(eq_list)
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching equipment list: {str(e)}")
        return jsonify({"success": False, "message": "Failed to fetch equipment", "error": str(e)}), 500


@equipment_bp.route("/create", methods=["POST"])
@token_required
def create_equipment():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        data = request.get_json()

        # Validation
        required_fields = ["id", "name", "category", "laboratory", "nextDue"]
        for field in required_fields:
            if not data.get(field):
                return jsonify({"success": False, "message": f"Field '{field}' is required"}), 400

        # Check if ID already exists
        check_query = text("SELECT COUNT(*) FROM equipment WHERE equipment_id = :eq_id")
        check_res = db.session.execute(check_query, {"eq_id": data["id"]}).scalar()
        if check_res > 0:
            return jsonify({"success": False, "message": f"Equipment ID '{data['id']}' already exists"}), 400

        insert_query = text("""
            INSERT INTO equipment (
                equipment_id, lab_id, name, category, laboratory, status,
                calibration_status, next_due, last_calibration, frequency,
                agency, certificate_no, model, serial_no, location,
                responsible_person, manufacturer, supplier, purchase_date,
                installation_date, measurement_range, least_count, accuracy,
                power_supply, description, remarks, created_at, updated_at,
                asset_tag, warranty_expiry_date, invoice_no, purchase_cost,
                capacity, unit, software, other_specification,
                internal_check_frequency, nabl_accredited, traceability_details,
                calibration_method, next_internal_check_date, reminder_before_days
            ) VALUES (
                :eq_id, :lab_id, :name, :category, :laboratory, :status,
                :calibration_status, :next_due, :last_calibration, :frequency,
                :agency, :certificate_no, :model, :serial_no, :location,
                :responsible_person, :manufacturer, :supplier, :purchase_date,
                :installation_date, :measurement_range, :least_count, :accuracy,
                :power_supply, :description, :remarks, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                :asset_tag, :warranty_expiry_date, :invoice_no, :purchase_cost,
                :capacity, :unit, :software, :other_specification,
                :internal_check_frequency, :nabl_accredited, :traceability_details,
                :calibration_method, :next_internal_check_date, :reminder_before_days
            )
        """)

        db.session.execute(insert_query, {
            "eq_id": data["id"],
            "lab_id": lab_id,
            "name": data["name"],
            "category": data["category"],
            "laboratory": data["laboratory"],
            "status": data.get("status", "Active"),
            "calibration_status": data.get("calibrationStatus", "Valid"),
            "next_due": datetime.strptime(data["nextDue"], "%Y-%m-%d").date() if data.get("nextDue") else None,
            "last_calibration": datetime.strptime(data["lastCalibration"], "%Y-%m-%d").date() if data.get("lastCalibration") else None,
            "frequency": data.get("frequency", "12 Months"),
            "agency": data.get("agency"),
            "certificate_no": data.get("certificateNo"),
            "model": data.get("model"),
            "serial_no": data.get("serialNo"),
            "location": data.get("location"),
            "responsible_person": data.get("responsiblePerson"),
            "manufacturer": data.get("manufacturer"),
            "supplier": data.get("supplier"),
            "purchase_date": datetime.strptime(data["purchaseDate"], "%Y-%m-%d").date() if data.get("purchaseDate") else None,
            "installation_date": datetime.strptime(data["installationDate"], "%Y-%m-%d").date() if data.get("installationDate") else None,
            "measurement_range": data.get("measurementRange"),
            "least_count": data.get("leastCount"),
            "accuracy": data.get("accuracy"),
            "power_supply": data.get("powerSupply"),
            "description": data.get("description"),
            "remarks": data.get("remarks"),
            "asset_tag": data.get("assetTag"),
            "warranty_expiry_date": datetime.strptime(data["warrantyExpiryDate"], "%Y-%m-%d").date() if data.get("warrantyExpiryDate") else None,
            "invoice_no": data.get("invoiceNo"),
            "purchase_cost": float(data["purchaseCost"]) if data.get("purchaseCost") else 0.00,
            "capacity": data.get("capacity"),
            "unit": data.get("unit"),
            "software": data.get("software"),
            "other_specification": data.get("otherSpecification"),
            "internal_check_frequency": data.get("internalCheckFrequency", "12 Months"),
            "nabl_accredited": data.get("nablAccredited", True),
            "traceability_details": data.get("traceabilityDetails"),
            "calibration_method": data.get("calibrationMethod"),
            "next_internal_check_date": datetime.strptime(data["nextInternalCheckDate"], "%Y-%m-%d").date() if data.get("nextInternalCheckDate") else None,
            "reminder_before_days": int(data["reminderBeforeDays"]) if data.get("reminderBeforeDays") else 30
        })

        db.session.commit()
        return jsonify({"success": True, "message": "Equipment registered successfully", "id": data["id"]}), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating equipment: {str(e)}")
        return jsonify({"success": False, "message": "Failed to register equipment", "error": str(e)}), 500


@equipment_bp.route("/view/<eq_id>", methods=["GET"])
@token_required
def view_equipment(eq_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        # Query Equipment
        eq_query = text("""
            SELECT equipment_id, lab_id, name, category, laboratory, status,
                   calibration_status, next_due, last_calibration, frequency,
                   agency, certificate_no, model, serial_no, location,
                   responsible_person, manufacturer, supplier, purchase_date,
                   installation_date, measurement_range, least_count, accuracy,
                   power_supply, description, remarks,
                   asset_tag, warranty_expiry_date, invoice_no, purchase_cost,
                   capacity, unit, software, other_specification,
                   internal_check_frequency, nabl_accredited, traceability_details,
                   calibration_method, next_internal_check_date, reminder_before_days
            FROM equipment
            WHERE lab_id = :lab_id AND equipment_id = :eq_id
        """)
        eq_row = db.session.execute(eq_query, {"lab_id": lab_id, "eq_id": eq_id}).fetchone()

        if not eq_row:
            return jsonify({"success": False, "message": "Equipment not found"}), 404

        # Query Calibration History
        cal_query = text("""
            SELECT calibration_id, calibration_date, next_due, frequency,
                   agency, certificate_no, cost, performed_by, status, remarks
            FROM calibration_records
            WHERE lab_id = :lab_id AND equipment_id = :eq_id
            ORDER BY calibration_date DESC
        """)
        cal_rows = db.session.execute(cal_query, {"lab_id": lab_id, "eq_id": eq_id}).fetchall()
        cal_history = []
        for cr in cal_rows:
            cal_history.append({
                "id": cr.calibration_id,
                "calibrationDate": cr.calibration_date.isoformat() if cr.calibration_date else None,
                "nextDue": cr.next_due.isoformat() if cr.next_due else None,
                "frequency": cr.frequency,
                "agency": cr.agency,
                "certificateNo": cr.certificate_no,
                "cost": float(cr.cost),
                "performedBy": cr.performed_by,
                "status": cr.status,
                "remarks": cr.remarks
            })

        # Query Maintenance History
        maint_query = text("""
            SELECT maintenance_id, date, type, engineer, cost, status, remarks
            FROM maintenance_records
            WHERE lab_id = :lab_id AND equipment_id = :eq_id
            ORDER BY date DESC
        """)
        maint_rows = db.session.execute(maint_query, {"lab_id": lab_id, "eq_id": eq_id}).fetchall()
        maint_history = []
        for mr in maint_rows:
            maint_history.append({
                "id": mr.maintenance_id,
                "date": mr.date.isoformat() if mr.date else None,
                "type": mr.type,
                "engineer": mr.engineer,
                "cost": float(mr.cost),
                "status": mr.status,
                "remarks": mr.remarks
            })

        # Query Equipment Documents
        doc_query = text("""
            SELECT doc_id, document_type, file_name, file_path, file_size, mime_type, created_at
            FROM equipment_documents
            WHERE equipment_id = :eq_id
            ORDER BY created_at DESC
        """)
        doc_rows = db.session.execute(doc_query, {"eq_id": eq_id}).fetchall()
        documents = []
        for dr in doc_rows:
            documents.append({
                "id": dr.doc_id,
                "documentType": dr.document_type,
                "fileName": dr.file_name,
                "filePath": dr.file_path,
                "fileSize": dr.file_size,
                "mimeType": dr.mime_type,
                "createdAt": dr.created_at.isoformat()
            })

        eq_data = {
            "id": eq_row.equipment_id,
            "lab_id": eq_row.lab_id,
            "name": eq_row.name,
            "category": eq_row.category,
            "laboratory": eq_row.laboratory,
            "status": eq_row.status,
            "calibrationStatus": eq_row.calibration_status,
            "nextDue": eq_row.next_due.isoformat() if eq_row.next_due else None,
            "lastCalibration": eq_row.last_calibration.isoformat() if eq_row.last_calibration else None,
            "frequency": eq_row.frequency,
            "agency": eq_row.agency,
            "certificateNo": eq_row.certificate_no,
            "model": eq_row.model,
            "serialNo": eq_row.serial_no,
            "location": eq_row.location,
            "responsiblePerson": eq_row.responsible_person,
            "manufacturer": eq_row.manufacturer,
            "supplier": eq_row.supplier,
            "purchaseDate": eq_row.purchase_date.isoformat() if eq_row.purchase_date else None,
            "installationDate": eq_row.installation_date.isoformat() if eq_row.installation_date else None,
            "measurementRange": eq_row.measurement_range,
            "leastCount": eq_row.least_count,
            "accuracy": eq_row.accuracy,
            "powerSupply": eq_row.power_supply,
            "description": eq_row.description,
            "remarks": eq_row.remarks,
            "assetTag": eq_row.asset_tag,
            "warrantyExpiryDate": eq_row.warranty_expiry_date.isoformat() if eq_row.warranty_expiry_date else None,
            "invoiceNo": eq_row.invoice_no,
            "purchaseCost": float(eq_row.purchase_cost) if eq_row.purchase_cost is not None else 0.0,
            "capacity": eq_row.capacity,
            "unit": eq_row.unit,
            "software": eq_row.software,
            "otherSpecification": eq_row.other_specification,
            "internalCheckFrequency": eq_row.internal_check_frequency,
            "nablAccredited": eq_row.nabl_accredited,
            "traceabilityDetails": eq_row.traceability_details,
            "calibrationMethod": eq_row.calibration_method,
            "nextInternalCheckDate": eq_row.next_internal_check_date.isoformat() if eq_row.next_internal_check_date else None,
            "reminderBeforeDays": eq_row.reminder_before_days,
            "calibrationHistory": cal_history,
            "maintenanceHistory": maint_history,
            "documents": documents
        }

        return jsonify({"success": True, "data": eq_data}), 200

    except Exception as e:
        current_app.logger.error(f"Error viewing equipment: {str(e)}")
        return jsonify({"success": False, "message": "Failed to view equipment details", "error": str(e)}), 500


@equipment_bp.route("/update/<eq_id>", methods=["PUT"])
@token_required
def update_equipment(eq_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        data = request.get_json()

        update_query = text("""
            UPDATE equipment
            SET name = :name, category = :category, laboratory = :laboratory, status = :status,
                calibration_status = :calibration_status, next_due = :next_due, last_calibration = :last_calibration,
                frequency = :frequency, agency = :agency, certificate_no = :certificate_no, model = :model,
                serial_no = :serial_no, location = :location, responsible_person = :responsible_person,
                manufacturer = :manufacturer, supplier = :supplier, purchase_date = :purchase_date,
                installation_date = :installation_date, measurement_range = :measurement_range,
                least_count = :least_count, accuracy = :accuracy, power_supply = :power_supply,
                description = :description, remarks = :remarks, asset_tag = :asset_tag,
                warranty_expiry_date = :warranty_expiry_date, invoice_no = :invoice_no,
                purchase_cost = :purchase_cost, capacity = :capacity, unit = :unit, software = :software,
                other_specification = :other_specification, internal_check_frequency = :internal_check_frequency,
                nabl_accredited = :nabl_accredited, traceability_details = :traceability_details,
                calibration_method = :calibration_method, next_internal_check_date = :next_internal_check_date,
                reminder_before_days = :reminder_before_days, updated_at = CURRENT_TIMESTAMP
            WHERE lab_id = :lab_id AND equipment_id = :eq_id
        """)

        db.session.execute(update_query, {
            "name": data["name"],
            "category": data["category"],
            "laboratory": data["laboratory"],
            "status": data.get("status", "Active"),
            "calibration_status": data.get("calibrationStatus", "Valid"),
            "next_due": datetime.strptime(data["nextDue"], "%Y-%m-%d").date() if data.get("nextDue") else None,
            "last_calibration": datetime.strptime(data["lastCalibration"], "%Y-%m-%d").date() if data.get("lastCalibration") else None,
            "frequency": data.get("frequency", "12 Months"),
            "agency": data.get("agency"),
            "certificate_no": data.get("certificateNo"),
            "model": data.get("model"),
            "serial_no": data.get("serialNo"),
            "location": data.get("location"),
            "responsible_person": data.get("responsiblePerson"),
            "manufacturer": data.get("manufacturer"),
            "supplier": data.get("supplier"),
            "purchase_date": datetime.strptime(data["purchaseDate"], "%Y-%m-%d").date() if data.get("purchaseDate") else None,
            "installation_date": datetime.strptime(data["installationDate"], "%Y-%m-%d").date() if data.get("installationDate") else None,
            "measurement_range": data.get("measurementRange"),
            "least_count": data.get("leastCount"),
            "accuracy": data.get("accuracy"),
            "power_supply": data.get("powerSupply"),
            "description": data.get("description"),
            "remarks": data.get("remarks"),
            "asset_tag": data.get("assetTag"),
            "warranty_expiry_date": datetime.strptime(data["warrantyExpiryDate"], "%Y-%m-%d").date() if data.get("warrantyExpiryDate") else None,
            "invoice_no": data.get("invoiceNo"),
            "purchase_cost": float(data["purchaseCost"]) if data.get("purchaseCost") else 0.00,
            "capacity": data.get("capacity"),
            "unit": data.get("unit"),
            "software": data.get("software"),
            "other_specification": data.get("otherSpecification"),
            "internal_check_frequency": data.get("internalCheckFrequency", "12 Months"),
            "nabl_accredited": data.get("nablAccredited", True),
            "traceability_details": data.get("traceabilityDetails"),
            "calibration_method": data.get("calibrationMethod"),
            "next_internal_check_date": datetime.strptime(data["nextInternalCheckDate"], "%Y-%m-%d").date() if data.get("nextInternalCheckDate") else None,
            "reminder_before_days": int(data["reminderBeforeDays"]) if data.get("reminderBeforeDays") else 30,
            "lab_id": lab_id,
            "eq_id": eq_id
        })

        db.session.commit()
        return jsonify({"success": True, "message": "Equipment details updated successfully", "id": eq_id}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating equipment: {str(e)}")
        return jsonify({"success": False, "message": "Failed to update equipment details", "error": str(e)}), 500


@equipment_bp.route("/delete/<eq_id>", methods=["DELETE"])
@token_required
def delete_equipment(eq_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        del_query = text("DELETE FROM equipment WHERE lab_id = :lab_id AND equipment_id = :eq_id")
        db.session.execute(del_query, {"lab_id": lab_id, "eq_id": eq_id})
        db.session.commit()

        return jsonify({"success": True, "message": "Equipment deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting equipment: {str(e)}")
        return jsonify({"success": False, "message": "Failed to delete equipment", "error": str(e)}), 500


@equipment_bp.route("/locations", methods=["GET"])
@token_required
def get_locations():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        # Query locations
        loc_query = text("""
            SELECT el.location_id, el.name, el.laboratory, el.building, el.floor, el.room_no,
                   (SELECT COUNT(*) FROM equipment eq WHERE eq.location = el.name AND eq.lab_id = el.lab_id) as total_equipment
            FROM equipment_locations el
            WHERE el.lab_id = :lab_id
            ORDER BY el.name ASC
        """)
        rows = db.session.execute(loc_query, {"lab_id": lab_id}).fetchall()

        loc_list = []
        for r in rows:
            loc_list.append({
                "id": r.location_id,
                "name": r.name,
                "laboratory": r.laboratory,
                "building": r.building,
                "floor": r.floor,
                "roomNo": r.room_no,
                "totalEquipment": r.total_equipment
            })

        return jsonify({"success": True, "data": {"locations": loc_list}}), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching locations: {str(e)}")
        return jsonify({"success": False, "message": "Failed to fetch locations", "error": str(e)}), 500


@equipment_bp.route("/locations/create", methods=["POST"])
@token_required
def create_location():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        data = request.get_json()

        # Validation
        if not data.get("name") or not data.get("roomNo"):
            return jsonify({"success": False, "message": "Name and Room Number are required"}), 400

        insert_query = text("""
            INSERT INTO equipment_locations (
                lab_id, name, laboratory, building, floor, room_no, created_at, updated_at
            ) VALUES (
                :lab_id, :name, :laboratory, :building, :floor, :room_no, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            RETURNING location_id
        """)
        res = db.session.execute(insert_query, {
            "lab_id": lab_id,
            "name": data["name"],
            "laboratory": data.get("laboratory", "General"),
            "building": data.get("building"),
            "floor": data.get("floor"),
            "room_no": data["roomNo"]
        })
        db.session.commit()

        return jsonify({"success": True, "message": "Location created successfully"}), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating location: {str(e)}")
        return jsonify({"success": False, "message": "Failed to create location", "error": str(e)}), 500


@equipment_bp.route("/<eq_id>/documents", methods=["POST"])
@token_required
def upload_equipment_document(eq_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        # Verify equipment exists
        eq_query = text("SELECT equipment_id FROM equipment WHERE lab_id = :lab_id AND equipment_id = :eq_id")
        eq = db.session.execute(eq_query, {"lab_id": lab_id, "eq_id": eq_id}).fetchone()
        if not eq:
            return jsonify({"success": False, "message": "Equipment not found"}), 404

        if 'file' not in request.files:
            return jsonify({"success": False, "message": "No file provided"}), 400

        file = request.files['file']
        document_type = request.form.get('document_type', 'Other Document')
        file_name = request.form.get('file_name', file.filename)

        if file.filename == '':
            return jsonify({"success": False, "message": "No file selected"}), 400

        # Create upload directory structure
        lab_result = db.session.execute(text("SELECT email FROM labs WHERE lab_id = :lab_id"), {"lab_id": lab_id}).fetchone()
        lab_name = lab_result[0].split('@')[0] if lab_result else f"lab_{lab_id}"
        
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "..", "uploaded", lab_name, "equipment", eq_id)
        os.makedirs(upload_dir, exist_ok=True)

        filename = secure_filename(file.filename)
        if filename:
            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            file_path = os.path.join(upload_dir, unique_filename)
            file.save(file_path)

            relative_path = f"uploaded/{lab_name}/equipment/{eq_id}/{unique_filename}"
            
            insert_query = text("""
                INSERT INTO equipment_documents (
                    equipment_id, document_type, file_name, file_path, file_size, mime_type, created_at, updated_at
                ) VALUES (
                    :eq_id, :document_type, :file_name, :file_path, :file_size, :mime_type, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                RETURNING doc_id
            """)
            doc_id = db.session.execute(insert_query, {
                "eq_id": eq_id,
                "document_type": document_type,
                "file_name": file_name,
                "file_path": relative_path,
                "file_size": os.path.getsize(file_path),
                "mime_type": file.content_type or 'application/octet-stream'
            }).scalar()

            db.session.commit()

            return jsonify({
                "success": True,
                "message": "Document uploaded successfully",
                "data": {
                    "doc_id": doc_id,
                    "file_name": file_name,
                    "file_path": relative_path,
                    "document_type": document_type
                }
            }), 201

        return jsonify({"success": False, "message": "Invalid filename"}), 400

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error uploading equipment document: {str(e)}")
        return jsonify({"success": False, "message": "Failed to upload document", "error": str(e)}), 500


@equipment_bp.route("/<eq_id>/documents", methods=["GET"])
@token_required
def get_equipment_documents(eq_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        # Verify equipment exists
        eq_query = text("SELECT equipment_id FROM equipment WHERE lab_id = :lab_id AND equipment_id = :eq_id")
        eq = db.session.execute(eq_query, {"lab_id": lab_id, "eq_id": eq_id}).fetchone()
        if not eq:
            return jsonify({"success": False, "message": "Equipment not found"}), 404

        doc_query = text("""
            SELECT doc_id, document_type, file_name, file_path, file_size, mime_type, created_at
            FROM equipment_documents
            WHERE equipment_id = :eq_id
            ORDER BY created_at DESC
        """)
        rows = db.session.execute(doc_query, {"eq_id": eq_id}).fetchall()

        docs_list = []
        for r in rows:
            docs_list.append({
                "id": r.doc_id,
                "documentType": r.document_type,
                "fileName": r.file_name,
                "filePath": r.file_path,
                "fileSize": r.file_size,
                "mimeType": r.mime_type,
                "createdAt": r.created_at.isoformat()
            })

        return jsonify({"success": True, "data": {"documents": docs_list}}), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching equipment documents: {str(e)}")
        return jsonify({"success": False, "message": "Failed to fetch documents", "error": str(e)}), 500


@equipment_bp.route("/documents/delete/<int:doc_id>", methods=["DELETE"])
@token_required
def delete_equipment_document(doc_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if not lab_id:
            return jsonify({"success": False, "message": "Lab ID not found in token"}), 400

        # Find document and verify ownership
        doc_query = text("""
            SELECT ed.file_path, eq.lab_id, ed.doc_id
            FROM equipment_documents ed
            JOIN equipment eq ON ed.equipment_id = eq.equipment_id
            WHERE ed.doc_id = :doc_id AND eq.lab_id = :lab_id
        """)
        doc = db.session.execute(doc_query, {"doc_id": doc_id, "lab_id": lab_id}).fetchone()
        if not doc:
            return jsonify({"success": False, "message": "Document not found"}), 404

        file_path = doc[0]

        # Delete database record
        del_query = text("DELETE FROM equipment_documents WHERE doc_id = :doc_id")
        db.session.execute(del_query, {"doc_id": doc_id})
        db.session.commit()

        # Optionally delete physical file
        try:
            full_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "..", file_path)
            if os.path.exists(full_path):
                os.remove(full_path)
        except Exception as file_err:
            current_app.logger.warning(f"Could not delete physical file: {str(file_err)}")

        return jsonify({"success": True, "message": "Document deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting equipment document: {str(e)}")
        return jsonify({"success": False, "message": "Failed to delete document", "error": str(e)}), 500
