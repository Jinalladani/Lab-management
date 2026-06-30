from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from sqlalchemy import text
from app.extensions import db
from app.utils.auth_decorator import token_required
from flask import g

labs_bp = Blueprint("labs", __name__)

def _utcnow():
    return datetime.now(timezone.utc)

@labs_bp.route("/info", methods=["GET"])
@token_required
def get_lab_info():
    """Get lab information for the authenticated user's lab."""
    try:
        payload = g.jwt_payload
        lab_id = payload.get("lab_id")
        
        if not lab_id:
            return jsonify({
                "success": False,
                "message": "Lab ID not found in token"
            }), 400
        
        query = text("""
            SELECT 
                l.lab_id, l.lab_name, l.contact_person, l.email, l.phone, l.address, l.status, l.created_at, l.updated_at,
                COALESCE(ds.doc_no, '') as doc_no,
                COALESCE(ds.issue_no, '') as issue_no,
                COALESCE(ds.amend_no, '') as amend_no,
                COALESCE(ds.doc_name, '') as doc_name,
                COALESCE(ds.issue_date, NULL) as issue_date,
                COALESCE(ds.amend_date, NULL) as amend_date,
                COALESCE(ds.copy_no, '') as copy_no,
                COALESCE(ds.section_no, '') as section_no
            FROM labs l
            LEFT JOIN lab_document_services ds ON l.lab_id = ds.lab_id
            WHERE l.lab_id = :lab_id
        """)
        
        result = db.session.execute(query, {"lab_id": lab_id}).fetchone()
        
        if not result:
            return jsonify({
                "success": False,
                "message": "Lab not found"
            }), 404
        
        lab_data = dict(result._mapping)
        
        return jsonify({
            "success": True,
            "message": "Lab information retrieved successfully",
            "data": lab_data
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Server error",
            "error": str(e)
        }), 500

@labs_bp.route("/info", methods=["PUT"])
@token_required
def update_lab_info():
    """Update lab information for the authenticated user's lab."""
    try:
        payload = g.jwt_payload
        lab_id = payload.get("lab_id")
        user_id = payload.get("sub")
        
        if not lab_id:
            return jsonify({
                "success": False,
                "message": "Lab ID not found in token"
            }), 400
        
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "message": "Request body is required"
            }), 400
        
        # Extract fields
        lab_name = data.get("lab_name", "").strip()
        contact_person = data.get("contact_person", "").strip()
        email = data.get("email", "").strip().lower()
        phone = data.get("phone", "").strip()
        address = data.get("address", "").strip()
        status = data.get("status", "").strip().lower()
        
        # Extract document details
        doc_no = data.get("doc_no", "").strip()
        issue_no = data.get("issue_no", "").strip()
        amend_no = data.get("amend_no", "").strip()
        doc_name = data.get("doc_name", "").strip()
        issue_date = data.get("issue_date", "").strip()
        amend_date = data.get("amend_date", "").strip()
        copy_no = data.get("copy_no", "").strip()
        section_no = data.get("section_no", "").strip()
        
        # Validation
        errors = {}
        
        if not lab_name:
            errors["lab_name"] = ["Lab name is required"]
        
        if email and "@" not in email:
            errors["email"] = ["Valid email is required"]
        
        if status and status not in ["active", "inactive"]:
            errors["status"] = ["Status must be 'active' or 'inactive'"]
        
        if errors:
            return jsonify({
                "success": False,
                "message": "Validation failed",
                "errors": errors
            }), 400
        
        # Check if lab exists
        check_query = text("SELECT lab_id FROM labs WHERE lab_id = :lab_id")
        existing_lab = db.session.execute(check_query, {"lab_id": lab_id}).fetchone()
        
        if not existing_lab:
            return jsonify({
                "success": False,
                "message": "Lab not found"
            }), 404
        
        # Check if email is unique (if being updated)
        if email:
            email_check_query = text("""
                SELECT lab_id FROM labs 
                WHERE email = :email AND lab_id != :lab_id
            """)
            email_exists = db.session.execute(email_check_query, {
                "email": email,
                "lab_id": lab_id
            }).fetchone()
            
            if email_exists:
                errors["email"] = ["Email already exists in another lab"]
                return jsonify({
                    "success": False,
                    "message": "Validation failed",
                    "errors": errors
                }), 400
        
        # Update lab information
        update_query = text("""
            UPDATE labs
            SET 
                lab_name = :lab_name,
                contact_person = :contact_person,
                email = :email,
                phone = :phone,
                address = :address,
                status = :status,
                updated_at = :updated_at
            WHERE lab_id = :lab_id
        """)
        
        db.session.execute(update_query, {
            "lab_name": lab_name if lab_name else None,
            "contact_person": contact_person if contact_person else None,
            "email": email if email else None,
            "phone": phone if phone else None,
            "address": address if address else None,
            "status": status if status else "active",
            "lab_id": lab_id,
            "updated_at": _utcnow()
        })
        
        # Update or insert document services
        upsert_document_query = text("""
            INSERT INTO lab_document_services (
                lab_id, doc_no, issue_no, amend_no, doc_name, 
                issue_date, amend_date, copy_no, section_no, 
                status, created_at, updated_at
            )
            VALUES (
                :lab_id, :doc_no, :issue_no, :amend_no, :doc_name,
                :issue_date, :amend_date, :copy_no, :section_no,
                'active', :created_at, :updated_at
            )
            ON CONFLICT (lab_id) DO UPDATE SET
                doc_no = EXCLUDED.doc_no,
                issue_no = EXCLUDED.issue_no,
                amend_no = EXCLUDED.amend_no,
                doc_name = EXCLUDED.doc_name,
                issue_date = EXCLUDED.issue_date,
                amend_date = EXCLUDED.amend_date,
                copy_no = EXCLUDED.copy_no,
                section_no = EXCLUDED.section_no,
                updated_at = EXCLUDED.updated_at
        """)
        
        # Parse dates if provided
        parsed_issue_date = None
        parsed_amend_date = None
        
        if issue_date:
            try:
                parsed_issue_date = datetime.strptime(issue_date, '%Y-%m-%d').date()
            except ValueError:
                pass
                
        if amend_date:
            try:
                parsed_amend_date = datetime.strptime(amend_date, '%Y-%m-%d').date()
            except ValueError:
                pass
        
        db.session.execute(upsert_document_query, {
            "lab_id": lab_id,
            "doc_no": doc_no if doc_no else None,
            "issue_no": issue_no if issue_no else None,
            "amend_no": amend_no if amend_no else None,
            "doc_name": doc_name if doc_name else None,
            "issue_date": parsed_issue_date,
            "amend_date": parsed_amend_date,
            "copy_no": copy_no if copy_no else None,
            "section_no": section_no if section_no else None,
            "created_at": _utcnow(),
            "updated_at": _utcnow()
        })
        
        # Audit log
        db.session.execute(text("""
            INSERT INTO audit_logs (
                lab_id, user_id, module_name, record_type,
                record_id, action_type, action_note,
                created_at, updated_at
            )
            VALUES (
                :lab_id, :user_id, 'labs', 'labs',
                :record_id, 'update', :action_note,
                :created_at, :updated_at
            )
        """), {
            "lab_id": lab_id,
            "user_id": user_id,
            "record_id": lab_id,
            "action_note": f"Lab information updated - Name: {lab_name}",
            "created_at": _utcnow(),
            "updated_at": _utcnow()
        })
        
        db.session.commit()
        
        # Get updated lab data
        get_updated_query = text("""
            SELECT 
                l.lab_id, l.lab_name, l.contact_person, l.email, l.phone, l.address, l.status, l.created_at, l.updated_at,
                COALESCE(ds.doc_no, '') as doc_no,
                COALESCE(ds.issue_no, '') as issue_no,
                COALESCE(ds.amend_no, '') as amend_no,
                COALESCE(ds.doc_name, '') as doc_name,
                COALESCE(ds.issue_date, NULL) as issue_date,
                COALESCE(ds.amend_date, NULL) as amend_date,
                COALESCE(ds.copy_no, '') as copy_no,
                COALESCE(ds.section_no, '') as section_no
            FROM labs l
            LEFT JOIN lab_document_services ds ON l.lab_id = ds.lab_id
            WHERE l.lab_id = :lab_id
        """)
        
        updated_result = db.session.execute(get_updated_query, {"lab_id": lab_id}).fetchone()
        updated_lab_data = dict(updated_result._mapping)
        
        return jsonify({
            "success": True,
            "message": "Lab information updated successfully",
            "data": updated_lab_data
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Server error",
            "error": str(e)
        }), 500

@labs_bp.route("/all", methods=["GET"])
@token_required
def get_all_labs():
    """Get all labs (admin only endpoint)."""
    try:
        payload = g.jwt_payload
        user_role = payload.get("role", "")
        
        # Only allow admin to see all labs
        if user_role != "admin":
            return jsonify({
                "success": False,
                "message": "Access denied. Admin role required."
            }), 403
        
        query = text("""
            SELECT 
                l.lab_id, l.lab_name, l.contact_person, l.email, l.phone, l.address, l.status, l.created_at, l.updated_at,
                COALESCE(ds.doc_no, '') as doc_no,
                COALESCE(ds.issue_no, '') as issue_no,
                COALESCE(ds.amend_no, '') as amend_no,
                COALESCE(ds.doc_name, '') as doc_name,
                COALESCE(ds.issue_date, NULL) as issue_date,
                COALESCE(ds.amend_date, NULL) as amend_date,
                COALESCE(ds.copy_no, '') as copy_no,
                COALESCE(ds.section_no, '') as section_no
            FROM labs l
            LEFT JOIN lab_document_services ds ON l.lab_id = ds.lab_id
            ORDER BY l.lab_name
        """)
        
        results = db.session.execute(query).fetchall()
        
        labs_data = [dict(row._mapping) for row in results]
        
        return jsonify({
            "success": True,
            "message": "All labs retrieved successfully",
            "data": labs_data
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Server error",
            "error": str(e)
        }), 500
