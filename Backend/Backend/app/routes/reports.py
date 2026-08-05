from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import text
import hashlib
from app.extensions import db
from app.utils.auth_decorator import token_required
from app.utils.permissions import permission_required
import logging
import json

# Configure logging
logger = logging.getLogger(__name__)

reports_bp = Blueprint("reports", __name__)

def _utc_now():
    return datetime.now(timezone.utc)

# Helper: Generate QR verification hash
def generate_verification_hash(report_id, report_number):
    hash_str = f"SMARTLAB-RPT-{report_id}-{report_number}-SECURE"
    return hashlib.sha256(hash_str.encode()).hexdigest()


# ========================================
# REPORTS MANAGEMENT API
# ========================================

# 1. Get all reports (with searching and filtering)
@reports_bp.route("/", methods=["GET"])
@token_required
def get_reports():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Get query parameters
        search = request.args.get("search", "").strip()
        status = request.args.get("status", "").strip()
        project_id = request.args.get("project_id", "").strip()
        sample_id = request.args.get("sample_id", "").strip()
        
        # Build base query joining projects, samples, and users
        query = """
            SELECT
                r.report_id,
                r.lab_id,
                r.project_id,
                p.project_name,
                r.report_number,
                r.report_title,
                r.report_create_date,
                r.report_date,
                r.status,
                r.remarks,
                r.created_by,
                r.approved_by,
                r.prepared_by,
                r.reviewed_by,
                r.created_at,
                r.updated_at,
                r.sample_id,
                srr.sample_no,
                srr.material_name as sample_desc,
                c.client_name,
                u_prep.first_name || ' ' || COALESCE(u_prep.last_name, '') as prepared_by_name,
                u_rev.first_name || ' ' || COALESCE(u_rev.last_name, '') as reviewed_by_name,
                u_app.first_name || ' ' || COALESCE(u_app.last_name, '') as approved_by_name
            FROM reports r
            LEFT JOIN projects p ON r.project_id = p.project_id
            LEFT JOIN clients c ON p.client_id = c.client_id
            LEFT JOIN sample_receipt_register srr ON r.sample_id = srr.sample_id
            LEFT JOIN users u_prep ON r.prepared_by = u_prep.user_id
            LEFT JOIN users u_rev ON r.reviewed_by = u_rev.user_id
            LEFT JOIN users u_app ON r.approved_by = u_app.user_id
            WHERE r.lab_id = :lab_id
        """
        
        params = {"lab_id": lab_id}
        
        # Add search
        if search:
            query += """ AND (
                r.report_number ILIKE :search OR
                p.project_name ILIKE :search OR
                c.client_name ILIKE :search OR
                srr.sample_no ILIKE :search OR
                r.report_title ILIKE :search
            )"""
            params["search"] = f"%{search}%"
        
        # Add filters
        if status:
            query += " AND r.status = :status"
            params["status"] = status
            
        if project_id:
            query += " AND r.project_id = :project_id"
            params["project_id"] = project_id

        if sample_id:
            query += " AND r.sample_id = :sample_id"
            params["sample_id"] = sample_id
        
        query += " ORDER BY r.created_at DESC"
        
        results = db.session.execute(text(query), params).fetchall()
        
        reports_data = []
        for r in results:
            reports_data.append({
                "report_id": r.report_id,
                "lab_id": r.lab_id,
                "project_id": r.project_id,
                "project_name": r.project_name,
                "client_name": r.client_name,
                "report_number": r.report_number,
                "report_title": r.report_title,
                "report_create_date": r.report_create_date.isoformat() if r.report_create_date else None,
                "report_date": r.report_date.isoformat() if r.report_date else None,
                "status": r.status,
                "remarks": r.remarks,
                "sample_id": r.sample_id,
                "sample_no": r.sample_no,
                "sample_desc": r.sample_desc,
                "prepared_by": r.prepared_by,
                "prepared_by_name": r.prepared_by_name,
                "reviewed_by": r.reviewed_by,
                "reviewed_by_name": r.reviewed_by_name,
                "approved_by": r.approved_by,
                "approved_by_name": r.approved_by_name,
                "created_at": r.created_at.isoformat(),
                "updated_at": r.updated_at.isoformat()
            })
        
        return jsonify({
            "success": True,
            "data": reports_data
        })
        
    except Exception as e:
        logger.error(f"Error fetching reports: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Error fetching reports: {str(e)}"
        }), 500


# 2. Get report by ID
@reports_bp.route("/<int:report_id>", methods=["GET"])
@token_required
def get_report_by_id(report_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Get main report details
        query = """
            SELECT
                r.report_id,
                r.lab_id,
                r.project_id,
                p.project_name,
                p.project_code,
                c.client_name,
                r.report_number,
                r.report_title,
                r.report_create_date,
                r.report_date,
                r.status,
                r.remarks,
                r.extra_fields,
                r.created_by,
                r.approved_by,
                r.prepared_by,
                r.reviewed_by,
                r.created_at,
                r.updated_at,
                r.sample_id,
                srr.sample_no,
                srr.material_name as sample_desc,
                srr.received_date,
                '' as srr_test_method,
                u_prep.first_name || ' ' || COALESCE(u_prep.last_name, '') as prepared_by_name,
                u_rev.first_name || ' ' || COALESCE(u_rev.last_name, '') as reviewed_by_name,
                u_app.first_name || ' ' || COALESCE(u_app.last_name, '') as approved_by_name
            FROM reports r
            LEFT JOIN projects p ON r.project_id = p.project_id
            LEFT JOIN clients c ON p.client_id = c.client_id
            LEFT JOIN sample_receipt_register srr ON r.sample_id = srr.sample_id
            LEFT JOIN users u_prep ON r.prepared_by = u_prep.user_id
            LEFT JOIN users u_rev ON r.reviewed_by = u_rev.user_id
            LEFT JOIN users u_app ON r.approved_by = u_app.user_id
            WHERE r.report_id = :report_id AND r.lab_id = :lab_id
        """
        
        result = db.session.execute(text(query), {
            "report_id": report_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not result:
            return jsonify({
                "success": False,
                "message": "Report not found"
            }), 404
        
        qr_hash = generate_verification_hash(result.report_id, result.report_number)
        
        report_data = {
            "report_id": result.report_id,
            "lab_id": result.lab_id,
            "project_id": result.project_id,
            "project_name": result.project_name,
            "project_code": result.project_code,
            "client_name": result.client_name,
            "report_number": result.report_number,
            "report_title": result.report_title,
            "report_create_date": result.report_create_date.isoformat() if result.report_create_date else None,
            "report_date": result.report_date.isoformat() if result.report_date else None,
            "status": result.status,
            "remarks": result.remarks,
            "extra_fields": result.extra_fields or {},
            "created_by": result.created_by,
            "prepared_by": result.prepared_by,
            "prepared_by_name": result.prepared_by_name,
            "reviewed_by": result.reviewed_by,
            "reviewed_by_name": result.reviewed_by_name,
            "approved_by": result.approved_by,
            "approved_by_name": result.approved_by_name,
            "sample_id": result.sample_id,
            "sample_no": result.sample_no,
            "sample_desc": result.sample_desc,
            "sample_received_date": result.received_date.isoformat() if result.received_date else None,
            "test_method": result.srr_test_method,
            "qr_hash": qr_hash,
            "created_at": result.created_at.isoformat(),
            "updated_at": result.updated_at.isoformat()
        }
        
        # Get scope test results
        scope_results_query = """
            SELECT
                rtr.report_test_result_id,
                rtr.report_id,
                rtr.project_scope_test_id,
                rtr.scope_test_id,
                rtr.test_name,
                rtr.test_method,
                rtr.unit,
                rtr.result_value,
                rtr.remark,
                rtr.raw_observation_data
            FROM report_test_results rtr
            WHERE rtr.report_id = :report_id
            ORDER BY rtr.sequence_no, rtr.test_name
        """
        
        scope_results = db.session.execute(text(scope_results_query), {
            "report_id": report_id
        }).fetchall()
        
        results_data = []
        for sr in scope_results:
            results_data.append({
                "report_test_result_id": sr.report_test_result_id,
                "report_id": sr.report_id,
                "project_scope_test_id": sr.project_scope_test_id,
                "scope_test_id": sr.scope_test_id,
                "test_name": sr.test_name,
                "test_method": sr.test_method,
                "unit": sr.unit,
                "result_value": sr.result_value,
                "remark": sr.remark,
                "raw_observation_data": sr.raw_observation_data or {}
            })
        
        report_data["test_results"] = results_data
        
        # Get approvals history
        approvals_query = """
            SELECT ra.*, u.first_name || ' ' || COALESCE(u.last_name, '') as user_name
            FROM report_approvals ra
            LEFT JOIN users u ON ra.user_id = u.user_id
            WHERE ra.report_id = :report_id
            ORDER BY ra.created_at ASC
        """
        approvals = db.session.execute(text(approvals_query), {"report_id": report_id}).fetchall()
        report_data["approvals"] = [{
            "approval_id": a.approval_id,
            "user_id": a.user_id,
            "user_name": a.user_name,
            "role": a.role,
            "status": a.status,
            "remarks": a.remarks,
            "created_at": a.created_at.isoformat()
        } for a in approvals]
        
        # Get attachments
        attachments_query = """
            SELECT * FROM report_attachments WHERE report_id = :report_id ORDER BY created_at DESC
        """
        attachments = db.session.execute(text(attachments_query), {"report_id": report_id}).fetchall()
        report_data["attachments"] = [{
            "attachment_id": att.attachment_id,
            "file_name": att.file_name,
            "file_path": att.file_path,
            "file_type": att.file_type,
            "created_at": att.created_at.isoformat()
        } for att in attachments]

        # Get revision versions history
        versions_query = """
            SELECT rv.*, u.first_name || ' ' || COALESCE(u.last_name, '') as creator_name
            FROM report_versions rv
            LEFT JOIN users u ON rv.created_by = u.user_id
            WHERE rv.report_id = :report_id
            ORDER BY rv.version_number DESC
        """
        versions = db.session.execute(text(versions_query), {"report_id": report_id}).fetchall()
        report_data["versions"] = [{
            "version_id": v.version_id,
            "version_number": v.version_number,
            "pdf_file_path": v.pdf_file_path,
            "change_log": v.change_log,
            "creator_name": v.creator_name,
            "created_at": v.created_at.isoformat()
        } for v in versions]

        return jsonify({
            "success": True,
            "data": report_data
        })
        
    except Exception as e:
        logger.error(f"Error fetching report: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Error fetching report: {str(e)}"
        }), 500


# 3. Generate report dynamically from sample observation calculations
@reports_bp.route("/generate", methods=["POST"])
@token_required
def generate_report():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        user_id = g.jwt_payload.get("user_id")
        data = request.get_json() or {}
        
        sample_id = data.get("sample_id")
        if not sample_id:
            return jsonify({"success": False, "message": "sample_id is required"}), 400
            
        # Fetch sample specs
        sample = db.session.execute(text("""
            SELECT sample_id, project_id, sample_no, material_name as sample_desc
            FROM sample_receipt_register
            WHERE sample_id = :sample_id
        """), {"sample_id": sample_id}).fetchone()
        
        if not sample:
            return jsonify({"success": False, "message": "Sample not found"}), 404
            
        # Fetch completed observations for sample
        obs_list = db.session.execute(text("""
            SELECT observation_id, scope_test_id, test_name, test_method, sheets_data, merges_data, operator_name
            FROM sample_observations
            WHERE sample_id = :sample_id AND status = 'Completed'
        """), {"sample_id": sample_id}).fetchall()
        
        if not obs_list:
            return jsonify({
                "success": False, 
                "message": "No 'Completed' observation entries found for this sample. Enter observations first."
            }), 400

        # Generate report number
        report_number = f"SL-RPT-{datetime.now().strftime('%Y%m%d')}-{sample.sample_no}"
        
        # Check if report already exists for this sample to avoid duplicates
        existing_report = db.session.execute(text("""
            SELECT report_id FROM reports WHERE sample_id = :sample_id AND lab_id = :lab_id LIMIT 1
        """), {"sample_id": sample_id, "lab_id": lab_id}).fetchone()
        
        if existing_report:
            return jsonify({
                "success": False,
                "message": "A report has already been generated for this sample.",
                "data": {"report_id": existing_report.report_id}
            }), 200

        # Insert main report
        insert_query = """
            INSERT INTO reports (
                lab_id, project_id, sample_id, report_number, report_title,
                status, report_status, prepared_by, created_by, created_at, updated_at
            ) VALUES (
                :lab_id, :project_id, :sample_id, :report_number, :report_title,
                'draft', 'draft', :user_id, :user_id, :now, :now
            ) RETURNING report_id
        """
        
        new_report_id = db.session.execute(text(insert_query), {
            "lab_id": lab_id,
            "project_id": sample.project_id,
            "sample_id": sample_id,
            "report_number": report_number,
            "report_title": f"Test Report: {sample.sample_desc}",
            "user_id": user_id,
            "now": _utc_now()
        }).fetchone()[0]

        # Insert test results from observations sheets_data
        for obs in obs_list:
            # Extract final calculated value if possible (or default to raw observation sheets reference)
            result_val = "Calculated in observations matrix"
            
            # Insert result spec row
            db.session.execute(text("""
                INSERT INTO report_test_results (
                    report_id, scope_test_id, test_name, test_method, 
                    sequence_no, result_value, raw_observation_data, created_at, updated_at
                ) VALUES (
                    :report_id, :scope_test_id, :test_name, :test_method,
                    1, :result_value, :raw_observation_data, :now, :now
                )
            """), {
                "report_id": new_report_id,
                "scope_test_id": obs.scope_test_id,
                "test_name": obs.test_name,
                "test_method": obs.test_method,
                "result_value": result_val,
                "raw_observation_data": json.dumps(obs.sheets_data), # serialize the sheets matrix
                "now": _utc_now()
            })

        db.session.commit()
        
        # Log Audit Trail
        db.session.execute(text("""
            INSERT INTO audit_logs (lab_id, user_id, module_name, record_type, record_id, action_type, action_note, created_at, updated_at)
            VALUES (:lab_id, :user_id, 'Reports', 'Report', :record_id, 'Create', :note, :now, :now)
        """), {
            "lab_id": lab_id,
            "user_id": user_id,
            "record_id": new_report_id,
            "note": f"Generated report ID {new_report_id} / {report_number} for Sample {sample.sample_no}",
            "now": _utc_now()
        })
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Report generated successfully!",
            "data": {"report_id": new_report_id, "report_number": report_number}
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error generating report: {str(e)}")
        return jsonify({"success": False, "message": f"Failed to generate report: {str(e)}"}), 500


# 4. Approve / Verify Report
@reports_bp.route("/<int:report_id>/approve", methods=["POST"])
@token_required
@permission_required("report.approve")
def approve_report(report_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        user_id = g.jwt_payload.get("user_id")
        user_role = g.jwt_payload.get("role_name", "Worker")
        data = request.get_json() or {}
        remarks = data.get("remarks", "Approved")

        # Fetch report details
        report = db.session.execute(text("""
            SELECT status, report_number FROM reports WHERE report_id = :report_id AND lab_id = :lab_id
        """), {"report_id": report_id, "lab_id": lab_id}).fetchone()

        if not report:
            return jsonify({"success": False, "message": "Report not found"}), 404

        current_status = report.status
        next_status = current_status
        role_label = "Worker"

        # Approval Workflow States: Draft -> Pending Verification -> Verified -> Approved
        if current_status == "draft":
            next_status = "Pending Verification"
            role_label = "Engineer"
            update_query = "UPDATE reports SET status = 'Pending Verification', prepared_by = :user_id, updated_at = :now WHERE report_id = :report_id"
        elif current_status == "Pending Verification":
            next_status = "Verified"
            role_label = "Quality Manager"
            update_query = "UPDATE reports SET status = 'Verified', reviewed_by = :user_id, updated_at = :now WHERE report_id = :report_id"
        elif current_status == "Verified":
            next_status = "Approved"
            role_label = "Admin"
            update_query = "UPDATE reports SET status = 'Approved', approved_by = :user_id, approved_at = :now, updated_at = :now WHERE report_id = :report_id"
        else:
            return jsonify({"success": False, "message": "Report is already Approved or Locked."}), 400

        # Update report status
        db.session.execute(text(update_query), {"report_id": report_id, "user_id": user_id, "now": _utc_now()})

        # Insert approval log
        db.session.execute(text("""
            INSERT INTO report_approvals (report_id, user_id, role, status, remarks, signature_hash, created_at)
            VALUES (:report_id, :user_id, :role, 'Approved', :remarks, :hash, :now)
        """), {
            "report_id": report_id,
            "user_id": user_id,
            "role": role_label,
            "remarks": remarks,
            "hash": generate_verification_hash(report_id, report.report_number),
            "now": _utc_now()
        })

        # Log Audit Trail
        db.session.execute(text("""
            INSERT INTO audit_logs (lab_id, user_id, module_name, record_type, record_id, action_type, action_note, created_at, updated_at)
            VALUES (:lab_id, :user_id, 'Reports', 'Report', :record_id, 'Approve', :note, :now, :now)
        """), {
            "lab_id": lab_id,
            "user_id": user_id,
            "record_id": report_id,
            "note": f"Approved report {report.report_number} to state: {next_status}",
            "now": _utc_now()
        })

        db.session.commit()
        return jsonify({"success": True, "message": f"Report approved and advanced to {next_status}."})

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error approving report: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


# 5. Reject / Return Report to Previous Stage
@reports_bp.route("/<int:report_id>/reject", methods=["POST"])
@token_required
@permission_required("report.approve")
def reject_report(report_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        user_id = g.jwt_payload.get("user_id")
        data = request.get_json() or {}
        remarks = data.get("remarks", "Rejected")

        # Fetch report details
        report = db.session.execute(text("""
            SELECT status, report_number FROM reports WHERE report_id = :report_id AND lab_id = :lab_id
        """), {"report_id": report_id, "lab_id": lab_id}).fetchone()

        if not report:
            return jsonify({"success": False, "message": "Report not found"}), 404

        current_status = report.status
        next_status = "draft" # Default revert to draft

        if current_status == "Pending Verification":
            next_status = "draft"
        elif current_status == "Verified":
            next_status = "Pending Verification"
        else:
            return jsonify({"success": False, "message": "Cannot reject report in its current state."}), 400

        # Update status
        db.session.execute(text("""
            UPDATE reports SET status = :status, updated_at = :now WHERE report_id = :report_id
        """), {"status": next_status, "report_id": report_id, "now": _utc_now()})

        # Insert approval rejection log
        db.session.execute(text("""
            INSERT INTO report_approvals (report_id, user_id, role, status, remarks, created_at)
            VALUES (:report_id, :user_id, 'Reviewer', 'Rejected', :remarks, :now)
        """), {
            "report_id": report_id,
            "user_id": user_id,
            "remarks": remarks,
            "now": _utc_now()
        })

        # Log Audit Trail
        db.session.execute(text("""
            INSERT INTO audit_logs (lab_id, user_id, module_name, record_type, record_id, action_type, action_note, created_at, updated_at)
            VALUES (:lab_id, :user_id, 'Reports', 'Report', :record_id, 'Reject', :note, :now, :now)
        """), {
            "lab_id": lab_id,
            "user_id": user_id,
            "record_id": report_id,
            "note": f"Rejected report {report.report_number}. Status reverted to: {next_status}",
            "now": _utc_now()
        })

        db.session.commit()
        return jsonify({"success": True, "message": f"Report returned to {next_status} successfully."})

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error rejecting report: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


# 6. Create Report Revision (Incremental Version control)
@reports_bp.route("/<int:report_id>/revision", methods=["POST"])
@token_required
def create_revision(report_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        user_id = g.jwt_payload.get("user_id")
        data = request.get_json() or {}
        change_log = data.get("change_log", "Revised observations")

        # Fetch report details
        report = db.session.execute(text("""
            SELECT status, report_number, pdf_file_path FROM reports WHERE report_id = :report_id AND lab_id = :lab_id
        """), {"report_id": report_id, "lab_id": lab_id}).fetchone()

        if not report:
            return jsonify({"success": False, "message": "Report not found"}), 404

        # Get latest version count
        latest_version = db.session.execute(text("""
            SELECT COALESCE(MAX(version_number), 0) FROM report_versions WHERE report_id = :report_id
        """), {"report_id": report_id}).fetchone()[0]

        next_version = latest_version + 1

        # Store historical version log
        db.session.execute(text("""
            INSERT INTO report_versions (report_id, version_number, pdf_file_path, change_log, created_by, created_at)
            VALUES (:report_id, :version_number, :path, :change_log, :user_id, :now)
        """), {
            "report_id": report_id,
            "version_number": next_version,
            "path": report.pdf_file_path or "Initial Draft",
            "change_log": change_log,
            "user_id": user_id,
            "now": _utc_now()
        })

        # Revert report status back to draft for modifications
        db.session.execute(text("""
            UPDATE reports SET status = 'draft', updated_at = :now WHERE report_id = :report_id
        """), {"report_id": report_id, "now": _utc_now()})

        # Log Audit Trail
        db.session.execute(text("""
            INSERT INTO audit_logs (lab_id, user_id, module_name, record_type, record_id, action_type, action_note, created_at, updated_at)
            VALUES (:lab_id, :user_id, 'Reports', 'Report', :record_id, 'Revision', :note, :now, :now)
        """), {
            "lab_id": lab_id,
            "user_id": user_id,
            "record_id": report_id,
            "note": f"Created report revision version {next_version} for report {report.report_number}",
            "now": _utc_now()
        })

        db.session.commit()
        return jsonify({"success": True, "message": f"Created new draft revision version {next_version}."})

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating revision: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


# 7. QR Code Public Verification route
@reports_bp.route("/verify-qr/<string:qr_hash>", methods=["GET"])
def verify_qr(qr_hash):
    try:
        # Find report by checking verification hash match
        reports = db.session.execute(text("""
            SELECT r.report_id, r.report_number, r.status, r.created_at, p.project_name, c.client_name
            FROM reports r
            LEFT JOIN projects p ON r.project_id = p.project_id
            LEFT JOIN clients c ON p.client_id = c.client_id
        """)).fetchall()

        matched_report = None
        for r in reports:
            if generate_verification_hash(r.report_id, r.report_number) == qr_hash:
                matched_report = r
                break

        if not matched_report:
            return jsonify({"success": False, "message": "Invalid report QR signature."}), 404

        return jsonify({
            "success": True,
            "data": {
                "report_number": matched_report.report_number,
                "status": matched_report.status,
                "project_name": matched_report.project_name,
                "client_name": matched_report.client_name,
                "generated_date": matched_report.created_at.strftime("%d %b %Y"),
                "hash_valid": True
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# 8. Upload PDF/Image Attachment to Report
@reports_bp.route("/<int:report_id>/attachments", methods=["POST"])
@token_required
def upload_attachment(report_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        if 'file' not in request.files:
            return jsonify({"success": False, "message": "No file uploaded"}), 400
            
        file = request.files['file']
        file_name = file.filename
        file_type = request.form.get("file_type", "Other")

        # Save file locally
        import os
        upload_folder = os.path.join("uploaded", "reports")
        os.makedirs(upload_folder, exist_ok=True)
        file_path = os.path.join(upload_folder, f"rpt_{report_id}_{int(_utc_now().timestamp())}_{file_name}")
        file.save(file_path)

        # Save DB record
        db.session.execute(text("""
            INSERT INTO report_attachments (report_id, file_name, file_path, file_type, created_at)
            VALUES (:report_id, :name, :path, :type, :now)
        """), {
            "report_id": report_id,
            "name": file_name,
            "path": file_path,
            "type": file_type,
            "now": _utc_now()
        })
        db.session.commit()

        return jsonify({"success": True, "message": "Attachment uploaded successfully."})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
