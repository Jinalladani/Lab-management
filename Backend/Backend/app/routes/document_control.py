from flask import Blueprint, jsonify, request, g, send_from_directory, current_app, send_file
from app.utils.auth_decorator import token_required
from app.utils.permissions import permission_required
from sqlalchemy import text
from app.extensions import db
from datetime import datetime, date, timedelta
import os
import uuid

document_control_bp = Blueprint("document_control", __name__)

UPLOAD_SUBDIR = os.path.join("uploaded", "documents")

def get_upload_path():
    base_dir = current_app.root_path
    upload_path = os.path.join(base_dir, UPLOAD_SUBDIR)
    os.makedirs(upload_path, exist_ok=True)
    return upload_path


def format_revision_number(curr_rev_str):
    if not curr_rev_str:
        return "Rev 01"
    try:
        clean = curr_rev_str.replace("Rev", "").replace("rev", "").strip()
        num = int(clean)
        return f"Rev {num + 1:02d}"
    except Exception:
        return f"{curr_rev_str}-v2"


def log_document_action(doc_id, rev_id, user_name, action, description, metadata=None):
    try:
        query = text("""
            INSERT INTO document_audit_logs (document_id, revision_id, user_name, action, description, metadata)
            VALUES (:doc_id, :rev_id, :user_name, :action, :description, :metadata)
        """)
        db.session.execute(query, {
            "doc_id": doc_id,
            "rev_id": rev_id,
            "user_name": user_name or "System",
            "action": action,
            "description": description,
            "metadata": str(metadata or {})
        })
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print("Error writing audit log:", e)


# -------------------------------------------------------------
# 1. NABL REFERENCES ENDPOINTS (Super Admin Managed)
# -------------------------------------------------------------
@document_control_bp.route("/nabl-references", methods=["GET"])
def get_nabl_references():
    try:
        search = request.args.get("search", "").strip()
        category = request.args.get("category", "all").strip()
        status = request.args.get("status", "all").strip()

        query_str = "SELECT * FROM nabl_references WHERE 1=1"
        params = {}

        if search:
            query_str += " AND (LOWER(document_number) LIKE :search OR LOWER(title) LIKE :search OR LOWER(description) LIKE :search)"
            params["search"] = f"%{search.lower()}%"

        if category != "all":
            query_str += " AND category = :category"
            params["category"] = category

        if status != "all":
            query_str += " AND status = :status"
            params["status"] = status

        query_str += " ORDER BY created_at DESC"

        result = db.session.execute(text(query_str), params).fetchall()

        docs = []
        for r in result:
            row = dict(r._mapping)
            # Fetch history amendments
            history_query = text("SELECT * FROM nabl_reference_amendments WHERE nabl_reference_id = :ref_id ORDER BY created_at DESC")
            hist_res = db.session.execute(history_query, {"ref_id": row["id"]}).fetchall()
            row["history"] = [dict(h._mapping) for h in hist_res]
            docs.append(row)

        return jsonify({"success": True, "data": docs}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/nabl-references/<int:ref_id>", methods=["GET"])
def get_single_nabl_reference(ref_id):
    try:
        res = db.session.execute(text("SELECT * FROM nabl_references WHERE id = :ref_id"), {"ref_id": ref_id}).fetchone()
        if not res:
            return jsonify({"success": False, "message": "NABL reference not found"}), 404
        
        row = dict(res._mapping)
        history_query = text("SELECT * FROM nabl_reference_amendments WHERE nabl_reference_id = :ref_id ORDER BY created_at DESC")
        hist_res = db.session.execute(history_query, {"ref_id": ref_id}).fetchall()
        row["history"] = [dict(h._mapping) for h in hist_res]
        return jsonify({"success": True, "data": row}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/nabl-references", methods=["POST"])
def create_nabl_reference():
    try:
        data = request.get_json() or {}
        doc_num = data.get("documentNumber") or f"NABL-{int(datetime.now().timestamp())}"
        title = data.get("title")

        if not title:
            return jsonify({"success": False, "message": "Document title is required"}), 400

        insert_query = text("""
            INSERT INTO nabl_references (
                document_number, title, category, issue_number, amendment_number,
                issue_date, amendment_date, description, file_name, file_size, file_url,
                status, version, created_by_name
            ) VALUES (
                :document_number, :title, :category, :issue_number, :amendment_number,
                :issue_date, :amendment_date, :description, :file_name, :file_size, :file_url,
                'LATEST', :version, :created_by_name
            ) RETURNING id
        """)

        issue_num = data.get("issueNumber", "01")
        amd_num = data.get("amendmentNumber", "00")
        ver = f"v{issue_num}.{amd_num}"

        res = db.session.execute(insert_query, {
            "document_number": doc_num,
            "title": title,
            "category": data.get("category", "Guidance"),
            "issue_number": issue_num,
            "amendment_number": amd_num,
            "issue_date": data.get("issueDate", date.today()),
            "amendment_date": data.get("amendmentDate", date.today()),
            "description": data.get("description", ""),
            "file_name": data.get("fileName", "NABL-Reference.pdf"),
            "file_size": data.get("fileSize", "1.5 MB"),
            "file_url": data.get("fileUrl", ""),
            "version": ver,
            "created_by_name": data.get("createdBy", "Super Admin")
        })
        new_id = res.scalar()

        # Insert initial amendment history
        hist_query = text("""
            INSERT INTO nabl_reference_amendments (
                nabl_reference_id, version, issue_number, amendment_number, amendment_date,
                change_reason, file_name, file_size, file_url, status, created_by_name
            ) VALUES (
                :ref_id, :version, :issue_number, :amendment_number, :amendment_date,
                'Initial publication of NABL reference', :file_name, :file_size, :file_url, 'LATEST', :created_by_name
            )
        """)
        db.session.execute(hist_query, {
            "ref_id": new_id,
            "version": ver,
            "issue_number": issue_num,
            "amendment_number": amd_num,
            "amendment_date": data.get("issueDate", date.today()),
            "file_name": data.get("fileName", "NABL-Reference.pdf"),
            "file_size": data.get("fileSize", "1.5 MB"),
            "file_url": data.get("fileUrl", ""),
            "created_by_name": data.get("createdBy", "Super Admin")
        })

        db.session.commit()
        return jsonify({"success": True, "id": new_id, "message": "NABL reference uploaded successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/nabl-references/<int:ref_id>", methods=["PUT"])
def update_nabl_reference(ref_id):
    try:
        data = request.get_json() or {}
        query = text("""
            UPDATE nabl_references SET
                title = COALESCE(:title, title),
                category = COALESCE(:category, category),
                description = COALESCE(:description, description),
                issue_number = COALESCE(:issue_number, issue_number),
                amendment_number = COALESCE(:amendment_number, amendment_number),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :ref_id
        """)
        db.session.execute(query, {
            "ref_id": ref_id,
            "title": data.get("title"),
            "category": data.get("category"),
            "description": data.get("description"),
            "issue_number": data.get("issueNumber"),
            "amendment_number": data.get("amendmentNumber")
        })
        db.session.commit()
        return jsonify({"success": True, "message": "NABL reference updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/nabl-references/<int:ref_id>/amendment", methods=["POST"])
def create_nabl_amendment(ref_id):
    try:
        data = request.get_json() or {}
        issue_num = data.get("issueNumber", "01")
        amd_num = data.get("amendmentNumber", "01")
        ver = f"v{issue_num}.{amd_num}"

        # Set older amendments to ARCHIVED
        db.session.execute(text("UPDATE nabl_reference_amendments SET status = 'ARCHIVED' WHERE nabl_reference_id = :ref_id"), {"ref_id": ref_id})

        # Insert new amendment
        hist_query = text("""
            INSERT INTO nabl_reference_amendments (
                nabl_reference_id, version, issue_number, amendment_number, amendment_date,
                change_reason, file_name, file_size, file_url, status, created_by_name
            ) VALUES (
                :ref_id, :version, :issue_number, :amendment_number, :amendment_date,
                :change_reason, :file_name, :file_size, :file_url, 'LATEST', :created_by_name
            )
        """)
        db.session.execute(hist_query, {
            "ref_id": ref_id,
            "version": ver,
            "issue_number": issue_num,
            "amendment_number": amd_num,
            "amendment_date": data.get("amendmentDate", date.today()),
            "change_reason": data.get("changeReason", "NABL Amendment"),
            "file_name": data.get("fileName", "NABL-Amendment.pdf"),
            "file_size": data.get("fileSize", "1.8 MB"),
            "file_url": data.get("fileUrl", ""),
            "created_by_name": data.get("createdBy", "Super Admin")
        })

        # Update parent record
        db.session.execute(text("""
            UPDATE nabl_references SET
                issue_number = :issue_num,
                amendment_number = :amd_num,
                amendment_date = :amd_date,
                version = :ver,
                file_name = :file_name,
                file_size = :file_size,
                file_url = :file_url,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :ref_id
        """), {
            "ref_id": ref_id,
            "issue_num": issue_num,
            "amd_num": amd_num,
            "amd_date": data.get("amendmentDate", date.today()),
            "ver": ver,
            "file_name": data.get("fileName", "NABL-Amendment.pdf"),
            "file_size": data.get("fileSize", "1.8 MB"),
            "file_url": data.get("fileUrl", "")
        })

        db.session.commit()
        return jsonify({"success": True, "message": "NABL amendment published successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/nabl-references/<int:ref_id>/archive", methods=["PUT"])
def archive_nabl_reference(ref_id):
    try:
        db.session.execute(text("UPDATE nabl_references SET status = 'ARCHIVED', updated_at = CURRENT_TIMESTAMP WHERE id = :ref_id"), {"ref_id": ref_id})
        db.session.commit()
        return jsonify({"success": True, "message": "NABL reference archived"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/nabl-references/<int:ref_id>", methods=["DELETE"])
def delete_nabl_reference(ref_id):
    try:
        db.session.execute(text("DELETE FROM nabl_references WHERE id = :ref_id"), {"ref_id": ref_id})
        db.session.commit()
        return jsonify({"success": True, "message": "NABL reference deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


# -------------------------------------------------------------
# 2. LAB DOCUMENTS ENDPOINTS (Lab Scoped)
# -------------------------------------------------------------
@document_control_bp.route("/lab-documents", methods=["GET"])
def get_lab_documents():
    try:
        lab_id = request.args.get("labId", "all")
        search = request.args.get("search", "").strip()
        category = request.args.get("category", "all").strip()
        status = request.args.get("status", "all").strip()

        query_str = "SELECT * FROM documents WHERE 1=1"
        params = {}

        if lab_id and lab_id != "all":
            query_str += " AND (lab_id = :lab_id OR lab_name = :lab_id)"
            params["lab_id"] = lab_id

        if search:
            query_str += " AND (LOWER(document_number) LIKE :search OR LOWER(title) LIKE :search OR LOWER(description) LIKE :search)"
            params["search"] = f"%{search.lower()}%"

        if category != "all":
            query_str += " AND category = :category"
            params["category"] = category

        if status != "all":
            query_str += " AND status = :status"
            params["status"] = status

        query_str += " ORDER BY created_at DESC"

        result = db.session.execute(text(query_str), params).fetchall()

        docs = []
        for r in result:
            row = dict(r._mapping)
            # Fetch revisions
            rev_query = text("SELECT * FROM document_revisions WHERE document_id = :doc_id ORDER BY created_at DESC")
            rev_res = db.session.execute(rev_query, {"doc_id": row["id"]}).fetchall()
            row["revisions"] = [dict(rv._mapping) for rv in rev_res]
            docs.append(row)

        return jsonify({"success": True, "data": docs}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/lab-documents/<int:doc_id>", methods=["GET"])
def get_single_lab_document(doc_id):
    try:
        res = db.session.execute(text("SELECT * FROM documents WHERE id = :doc_id"), {"doc_id": doc_id}).fetchone()
        if not res:
            return jsonify({"success": False, "message": "Document not found"}), 404
        
        row = dict(res._mapping)
        # Fetch Revisions
        revs = db.session.execute(text("SELECT * FROM document_revisions WHERE document_id = :doc_id ORDER BY created_at DESC"), {"doc_id": doc_id}).fetchall()
        row["revisions"] = [dict(rv._mapping) for rv in revs]
        
        # Fetch Approvals
        apps = db.session.execute(text("SELECT * FROM document_approvals WHERE document_id = :doc_id ORDER BY action_date DESC"), {"doc_id": doc_id}).fetchall()
        row["approvals"] = [dict(ap._mapping) for ap in apps]
        
        # Fetch Acknowledgements
        acks = db.session.execute(text("SELECT * FROM document_acknowledgements WHERE document_id = :doc_id ORDER BY assigned_date DESC"), {"doc_id": doc_id}).fetchall()
        row["acknowledgements"] = [dict(ak._mapping) for ak in acks]
        
        return jsonify({"success": True, "data": row}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/lab-documents", methods=["POST"])
def create_lab_document():
    try:
        data = request.get_json() or {}
        title = data.get("title")

        if not title:
            return jsonify({"success": False, "message": "Document title is required"}), 400

        doc_num = data.get("documentNumber") or f"SOP-{int(datetime.now().timestamp())}"
        initial_rev = data.get("currentRevision", "Rev 00")

        insert_query = text("""
            INSERT INTO documents (
                lab_id, lab_name, document_number, title, category, document_type,
                description, nabl_reference_id, nabl_reference_number, current_revision,
                effective_date, review_date, file_name, file_size, file_url, status, created_by_name
            ) VALUES (
                :lab_id, :lab_name, :document_number, :title, :category, :document_type,
                :description, :nabl_reference_id, :nabl_reference_number, :current_revision,
                :effective_date, :review_date, :file_name, :file_size, :file_url, 'Active', :created_by_name
            ) RETURNING id
        """)

        res = db.session.execute(insert_query, {
            "lab_id": data.get("labId", "LAB-001"),
            "lab_name": data.get("labName", "Central Lab"),
            "document_number": doc_num,
            "title": title,
            "category": data.get("category", "Controlled Document"),
            "document_type": data.get("documentType", "SOP"),
            "description": data.get("description", ""),
            "nabl_reference_id": data.get("nablReferenceId"),
            "nabl_reference_number": data.get("nablReferenceNumber", "-"),
            "current_revision": initial_rev,
            "effective_date": data.get("effectiveDate", date.today()),
            "review_date": data.get("reviewDate"),
            "file_name": data.get("fileName", "Document.pdf"),
            "file_size": data.get("fileSize", "1.2 MB"),
            "file_url": data.get("fileUrl", ""),
            "created_by_name": data.get("createdBy", "Authorized User")
        })
        new_id = res.scalar()

        # Insert initial revision entry
        rev_query = text("""
            INSERT INTO document_revisions (
                document_id, revision_number, file_name, file_size, file_url,
                change_reason, change_summary, effective_date, review_date, status, created_by_name
            ) VALUES (
                :doc_id, :revision_number, :file_name, :file_size, :file_url,
                'Initial document release', 'Original upload', :effective_date, :review_date, 'Current', :created_by_name
            ) RETURNING id
        """)
        rev_res = db.session.execute(rev_query, {
            "doc_id": new_id,
            "revision_number": initial_rev,
            "file_name": data.get("fileName", "Document.pdf"),
            "file_size": data.get("fileSize", "1.2 MB"),
            "file_url": data.get("fileUrl", ""),
            "effective_date": data.get("effectiveDate", date.today()),
            "review_date": data.get("reviewDate"),
            "created_by_name": data.get("createdBy", "Authorized User")
        })
        rev_id = rev_res.scalar()

        # Update current_revision_id on parent
        db.session.execute(text("UPDATE documents SET current_revision_id = :rev_id WHERE id = :doc_id"), {"rev_id": rev_id, "doc_id": new_id})

        log_document_action(new_id, rev_id, data.get("createdBy", "Authorized User"), "UPLOAD", f"Uploaded new document: {title}")

        db.session.commit()
        return jsonify({"success": True, "id": new_id, "message": "Document uploaded successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/lab-documents/<int:doc_id>", methods=["PUT"])
def update_lab_document(doc_id):
    try:
        data = request.get_json() or {}
        query = text("""
            UPDATE documents SET
                title = COALESCE(:title, title),
                category = COALESCE(:category, category),
                document_type = COALESCE(:document_type, document_type),
                description = COALESCE(:description, description),
                review_date = COALESCE(:review_date, review_date),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :doc_id
        """)
        db.session.execute(query, {
            "doc_id": doc_id,
            "title": data.get("title"),
            "category": data.get("category"),
            "document_type": data.get("documentType"),
            "description": data.get("description"),
            "review_date": data.get("reviewDate")
        })
        db.session.commit()
        return jsonify({"success": True, "message": "Document updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/lab-documents/<int:doc_id>/revision", methods=["POST"])
def create_lab_document_revision(doc_id):
    try:
        data = request.get_json() or {}
        new_rev = data.get("revisionNumber", "Rev 01")

        # Set older revisions to Archived
        db.session.execute(text("UPDATE document_revisions SET status = 'Archived' WHERE document_id = :doc_id"), {"doc_id": doc_id})

        # Insert new revision
        rev_query = text("""
            INSERT INTO document_revisions (
                document_id, revision_number, file_name, file_size, file_url,
                change_reason, change_summary, effective_date, review_date, status, created_by_name
            ) VALUES (
                :doc_id, :revision_number, :file_name, :file_size, :file_url,
                :change_reason, :change_summary, :effective_date, :review_date, 'Current', :created_by_name
            ) RETURNING id
        """)
        rev_res = db.session.execute(rev_query, {
            "doc_id": doc_id,
            "revision_number": new_rev,
            "file_name": data.get("fileName", "Document-Rev.pdf"),
            "file_size": data.get("fileSize", "1.5 MB"),
            "file_url": data.get("fileUrl", ""),
            "change_reason": data.get("changeReason", "Document Revision"),
            "change_summary": data.get("changeSummary", ""),
            "effective_date": data.get("effectiveDate", date.today()),
            "review_date": data.get("reviewDate"),
            "created_by_name": data.get("createdBy", "Authorized User")
        })
        rev_id = rev_res.scalar()

        # Update parent document
        db.session.execute(text("""
            UPDATE documents SET
                current_revision = :new_rev,
                current_revision_id = :rev_id,
                effective_date = :effective_date,
                review_date = :review_date,
                file_name = :file_name,
                file_size = :file_size,
                file_url = :file_url,
                status = 'Active',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :doc_id
        """), {
            "doc_id": doc_id,
            "new_rev": new_rev,
            "rev_id": rev_id,
            "effective_date": data.get("effectiveDate", date.today()),
            "review_date": data.get("reviewDate"),
            "file_name": data.get("fileName", "Document-Rev.pdf"),
            "file_size": data.get("fileSize", "1.5 MB"),
            "file_url": data.get("fileUrl", "")
        })

        log_document_action(doc_id, rev_id, data.get("createdBy", "Authorized User"), "REVISION", f"Created new revision {new_rev}")

        db.session.commit()
        return jsonify({"success": True, "message": "Revision created successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/lab-documents/<int:doc_id>/archive", methods=["PUT"])
def archive_lab_document(doc_id):
    try:
        db.session.execute(text("UPDATE documents SET status = 'Archived', updated_at = CURRENT_TIMESTAMP WHERE id = :doc_id"), {"doc_id": doc_id})
        log_document_action(doc_id, None, "Authorized User", "ARCHIVE", "Archived document")
        db.session.commit()
        return jsonify({"success": True, "message": "Document archived"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/lab-documents/<int:doc_id>/obsolete", methods=["PUT"])
def mark_lab_document_obsolete(doc_id):
    try:
        db.session.execute(text("UPDATE documents SET status = 'Obsolete', updated_at = CURRENT_TIMESTAMP WHERE id = :doc_id"), {"doc_id": doc_id})
        log_document_action(doc_id, None, "Authorized User", "OBSOLETE", "Marked document obsolete")
        db.session.commit()
        return jsonify({"success": True, "message": "Document marked as obsolete"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/lab-documents/<int:doc_id>", methods=["DELETE"])
def delete_lab_document(doc_id):
    try:
        db.session.execute(text("DELETE FROM documents WHERE id = :doc_id"), {"doc_id": doc_id})
        db.session.commit()
        return jsonify({"success": True, "message": "Document deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


# -------------------------------------------------------------
# 3. DOCUMENT CATEGORIES ENDPOINTS
# -------------------------------------------------------------
@document_control_bp.route("/categories", methods=["GET"])
def get_categories():
    try:
        status_param = request.args.get("status", "all")
        query_str = "SELECT * FROM document_categories"
        params = {}
        if status_param == "active":
            query_str += " WHERE active = TRUE"
        elif status_param == "inactive":
            query_str += " WHERE active = FALSE"

        query_str += " ORDER BY category_id ASC"

        result = db.session.execute(text(query_str), params).fetchall()
        cats = [dict(r._mapping) for r in result]
        return jsonify({"success": True, "data": cats}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/categories", methods=["POST"])
def create_category():
    try:
        data = request.get_json() or {}
        name = data.get("name")
        if not name:
            return jsonify({"success": False, "message": "Category name is required"}), 400

        query = text("""
            INSERT INTO document_categories (name, category_type, prefix, description, active)
            VALUES (:name, :category_type, :prefix, :description, :active)
            ON CONFLICT (name) DO UPDATE SET 
                category_type = EXCLUDED.category_type,
                prefix = EXCLUDED.prefix,
                description = EXCLUDED.description,
                active = EXCLUDED.active
            RETURNING category_id
        """)
        res = db.session.execute(query, {
            "name": name,
            "category_type": data.get("categoryType", "Controlled Document"),
            "prefix": data.get("prefix", name[:3].upper()),
            "description": data.get("description", ""),
            "active": data.get("active", True)
        })
        new_id = res.scalar()
        db.session.commit()
        return jsonify({"success": True, "id": new_id, "message": "Category saved successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/categories/<int:cat_id>", methods=["PUT"])
def update_category(cat_id):
    try:
        data = request.get_json() or {}
        query = text("""
            UPDATE document_categories SET
                name = COALESCE(:name, name),
                category_type = COALESCE(:category_type, category_type),
                prefix = COALESCE(:prefix, prefix),
                description = COALESCE(:description, description),
                active = COALESCE(:active, active)
            WHERE category_id = :cat_id
        """)
        db.session.execute(query, {
            "cat_id": cat_id,
            "name": data.get("name"),
            "category_type": data.get("categoryType"),
            "prefix": data.get("prefix"),
            "description": data.get("description"),
            "active": data.get("active")
        })
        db.session.commit()
        return jsonify({"success": True, "message": "Category updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/categories/<int:cat_id>/toggle-status", methods=["PUT"])
def toggle_category_status(cat_id):
    try:
        db.session.execute(text("UPDATE document_categories SET active = NOT active WHERE category_id = :cat_id"), {"cat_id": cat_id})
        db.session.commit()
        return jsonify({"success": True, "message": "Category status toggled"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/categories/<int:cat_id>", methods=["DELETE"])
def delete_category(cat_id):
    try:
        db.session.execute(text("DELETE FROM document_categories WHERE category_id = :cat_id"), {"cat_id": cat_id})
        db.session.commit()
        return jsonify({"success": True, "message": "Category deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


# -------------------------------------------------------------
# 4. APPROVALS, ACKNOWLEDGEMENTS & AUDIT LOGS
# -------------------------------------------------------------
@document_control_bp.route("/lab-documents/<int:doc_id>/approvals", methods=["POST"])
def add_document_approval(doc_id):
    try:
        data = request.get_json() or {}
        rev_id = data.get("revisionId")
        if not rev_id:
            curr = db.session.execute(text("SELECT current_revision_id FROM documents WHERE id = :doc_id"), {"doc_id": doc_id}).fetchone()
            rev_id = curr[0] if curr else None

        query = text("""
            INSERT INTO document_approvals (
                document_id, document_revision_id, reviewer_id, reviewer_name, reviewer_role, action, comments
            ) VALUES (
                :doc_id, :rev_id, :reviewer_id, :reviewer_name, :reviewer_role, :action, :comments
            ) RETURNING id
        """)
        res = db.session.execute(query, {
            "doc_id": doc_id,
            "rev_id": rev_id,
            "reviewer_id": data.get("reviewerId"),
            "reviewer_name": data.get("reviewerName", "Quality Manager"),
            "reviewer_role": data.get("reviewerRole", "Quality Manager"),
            "action": data.get("action", "Approved"),
            "comments": data.get("comments", "")
        })
        app_id = res.scalar()
        
        log_document_action(doc_id, rev_id, data.get("reviewerName", "Quality Manager"), f"APPROVAL_{data.get('action', 'APPROVED').upper()}", data.get("comments", ""))

        db.session.commit()
        return jsonify({"success": True, "id": app_id, "message": "Approval recorded successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/lab-documents/<int:doc_id>/acknowledgements", methods=["POST"])
def add_document_acknowledgement(doc_id):
    try:
        data = request.get_json() or {}
        rev_id = data.get("revisionId")
        if not rev_id:
            curr = db.session.execute(text("SELECT current_revision_id FROM documents WHERE id = :doc_id"), {"doc_id": doc_id}).fetchone()
            rev_id = curr[0] if curr else None

        query = text("""
            INSERT INTO document_acknowledgements (
                document_id, document_revision_id, user_id, user_name, user_role, department, status, acknowledged_date
            ) VALUES (
                :doc_id, :rev_id, :user_id, :user_name, :user_role, :department, :status, :acknowledged_date
            ) RETURNING id
        """)
        ack_status = data.get("status", "Acknowledged")
        ack_date = datetime.now() if ack_status == "Acknowledged" else None

        res = db.session.execute(query, {
            "doc_id": doc_id,
            "rev_id": rev_id,
            "user_id": data.get("userId"),
            "user_name": data.get("userName", "Authorized Staff"),
            "user_role": data.get("userRole", "Lab Technician"),
            "department": data.get("department", "Quality"),
            "status": ack_status,
            "acknowledged_date": ack_date
        })
        ack_id = res.scalar()

        log_document_action(doc_id, rev_id, data.get("userName", "Authorized Staff"), "ACKNOWLEDGEMENT", f"Status: {ack_status}")

        db.session.commit()
        return jsonify({"success": True, "id": ack_id, "message": "Acknowledgement recorded"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/lab-documents/<int:doc_id>/audit-logs", methods=["GET"])
@document_control_bp.route("/audit-trail", methods=["GET"])
def get_document_audit_logs(doc_id=None):
    try:
        if doc_id:
            query = text("SELECT * FROM document_audit_logs WHERE document_id = :doc_id ORDER BY created_at DESC")
            res = db.session.execute(query, {"doc_id": doc_id}).fetchall()
        else:
            query = text("SELECT * FROM document_audit_logs ORDER BY created_at DESC LIMIT 100")
            res = db.session.execute(query).fetchall()
        logs = [dict(r._mapping) for r in res]
        return jsonify({"success": True, "data": logs}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/obsolete-documents", methods=["GET"])
def get_obsolete_documents():
    try:
        res = db.session.execute(text("SELECT * FROM documents WHERE status = 'Obsolete' ORDER BY updated_at DESC")).fetchall()
        docs = [dict(r._mapping) for r in res]
        return jsonify({"success": True, "data": docs}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/review-due", methods=["GET"])
def get_review_due_documents():
    try:
        res = db.session.execute(text("SELECT * FROM documents WHERE status = 'Review Due' OR review_date <= CURRENT_DATE ORDER BY review_date ASC")).fetchall()
        docs = [dict(r._mapping) for r in res]
        return jsonify({"success": True, "data": docs}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/review-approvals", methods=["GET"])
def get_review_approvals():
    try:
        res = db.session.execute(text("SELECT * FROM document_approvals ORDER BY action_date DESC")).fetchall()
        apps = [dict(r._mapping) for r in res]
        return jsonify({"success": True, "data": apps}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/staff-acknowledgements", methods=["GET"])
def get_staff_acknowledgements():
    try:
        res = db.session.execute(text("SELECT * FROM document_acknowledgements ORDER BY assigned_date DESC")).fetchall()
        acks = [dict(r._mapping) for r in res]
        return jsonify({"success": True, "data": acks}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@document_control_bp.route("/acknowledgements/<int:ack_id>/acknowledge", methods=["POST"])
def acknowledge_document(ack_id):
    try:
        db.session.execute(text("UPDATE document_acknowledgements SET status = 'Acknowledged', acknowledged_date = CURRENT_TIMESTAMP WHERE id = :ack_id"), {"ack_id": ack_id})
        db.session.commit()
        return jsonify({"success": True, "message": "Document acknowledged"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
