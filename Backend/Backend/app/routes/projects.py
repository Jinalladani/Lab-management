from datetime import datetime, timezone
import os
import uuid
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, g
from sqlalchemy import text
from app.extensions import db
from app.utils.auth_decorator import token_required

projects_bp = Blueprint("projects", __name__)


def _utc_now():
    return datetime.now(timezone.utc)


# Test endpoint without authentication for CORS testing
@projects_bp.route("/test", methods=["GET"])
def test_projects():
    return jsonify({
        "success": True,
        "message": "Projects API is working!",
        "data": []
    })


@projects_bp.route("/", methods=["GET"])
@token_required
def get_projects():
    try:
        lab_id = g.jwt_payload.get("lab_id")

        status = request.args.get("status", "").strip()
        search = request.args.get("search", "").strip()
        client_id = request.args.get("client_id", "").strip()

        query = """
            SELECT
                p.project_id,
                p.lab_id,
                p.client_id,
                c.client_name,
                p.project_code,
                p.project_name,
                p.name_of_work_and_other_details,
                p.nabl_scope,
                p.location_name,
                p.site_address,
                p.city,
                p.state,
                p.pincode,
                p.dispatch_mode,
                p.client_representative_name,
                p.request_collected_by,
                CONCAT(rc_user.first_name, ' ', rc_user.last_name) as request_collected_by_name,
                p.test_assigned_to,
                CONCAT(ta_user.first_name, ' ', ta_user.last_name) as test_assigned_to_name,
                p.reviewed_by,
                CONCAT(rv_user.first_name, ' ', rv_user.last_name) as reviewed_by_name,
                COALESCE(report_counts.report_count, 0) as total_reports,
                COALESCE(sample_counts.sample_count, 0) as total_samples,
                p.status,
                p.created_at,
                p.updated_at
            FROM projects p
            LEFT JOIN clients c ON c.client_id = p.client_id
            LEFT JOIN users rc_user ON rc_user.user_id = p.request_collected_by
            LEFT JOIN users ta_user ON ta_user.user_id = p.test_assigned_to
            LEFT JOIN users rv_user ON rv_user.user_id = p.reviewed_by
            LEFT JOIN (
                SELECT 
                    project_id, 
                    COUNT(report_id) as report_count
                FROM reports 
                GROUP BY project_id
            ) report_counts ON report_counts.project_id = p.project_id
            LEFT JOIN (
                SELECT 
                    project_id, 
                    COUNT(sample_id) as sample_count
                FROM sample_receipt_register 
                GROUP BY project_id
            ) sample_counts ON sample_counts.project_id = p.project_id
            WHERE p.lab_id = :lab_id
        """

        params = {"lab_id": lab_id}

        if status:
            query += " AND p.status = :status"
            params["status"] = status

        if client_id:
            query += " AND p.client_id = :client_id"
            params["client_id"] = int(client_id)

        if search:
            query += """
                AND (
                    LOWER(p.project_code) LIKE LOWER(:search)
                    OR LOWER(p.project_name) LIKE LOWER(:search)
                    OR LOWER(COALESCE(c.client_name, '')) LIKE LOWER(:search)
                    OR LOWER(COALESCE(p.location_name, '')) LIKE LOWER(:search)
                )
            """
            params["search"] = f"%{search}%"

        query += " ORDER BY p.project_id DESC"

        result = db.session.execute(text(query), params).mappings().all()

        return jsonify({
            "success": True,
            "message": "Projects fetched successfully",
            "data": [dict(row) for row in result]
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to fetch projects",
            "errors": {"server": [str(e)]}
        }), 500


@projects_bp.route("/", methods=["POST"])
@token_required
def create_project():
    try:
        # Handle both JSON and FormData requests
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Handle FormData with file uploads
            data = request.form.to_dict()
            files = request.files.getlist('documents')
            # Parse scope tests from form data if present
            scope_tests_str = data.get('scope_tests', '[]')
            try:
                import json
                scope_tests = json.loads(scope_tests_str)
            except:
                scope_tests = []
        else:
            # Handle regular JSON request
            data = request.get_json() or {}
            files = []
            scope_tests = data.get('scope_tests', [])

        user_id = g.jwt_payload.get("user_id")
        lab_id = g.jwt_payload.get("lab_id")

        # Get lab name for directory structure
        lab_result = db.session.execute(text("""
            SELECT email FROM labs WHERE lab_id = :lab_id
        """), {"lab_id": lab_id}).fetchone()
        
        lab_name = lab_result[0].split('@')[0] if lab_result else f"lab_{lab_id}"

        client_id = data.get("client_id")
        project_code = (data.get("project_code") or "").strip()
        project_name = (data.get("project_name") or "").strip()
        name_of_work_and_other_details = (data.get("name_of_work_and_other_details") or "").strip()
        nabl_scope = data.get("nabl_scope", False)
        location_name = (data.get("location_name") or "").strip()
        site_address = (data.get("site_address") or "").strip()
        city = (data.get("city") or "").strip()
        state = (data.get("state") or "").strip()
        pincode = (data.get("pincode") or "").strip()
        dispatch_mode = (data.get("dispatch_mode") or "").strip()
        client_representative_name = (data.get("client_representative_name") or "").strip()
        request_collected_by = data.get("request_collected_by")
        test_assigned_to = data.get("test_assigned_to")
        reviewed_by = data.get("reviewed_by")
        status = (data.get("status") or "draft").strip().lower()

        allowed_status = [
            "draft",
            "active",
            "in_progress",
            "completed",
            "on_hold",
            "cancelled",
        ]

        errors = {}

        if not project_code:
            errors["project_code"] = ["Project code is required"]

        if not project_name:
            errors["project_name"] = ["Project name is required"]

        if status not in allowed_status:
            errors["status"] = ["Invalid status"]

        if client_id:
            client_exists = db.session.execute(text("""
                SELECT client_id
                FROM clients
                WHERE client_id = :client_id
                  AND lab_id = :lab_id
            """), {
                "client_id": client_id,
                "lab_id": lab_id
            }).fetchone()

            if not client_exists:
                errors["client_id"] = ["Invalid client for this lab"]

        duplicate = db.session.execute(text("""
            SELECT project_id
            FROM projects
            WHERE lab_id = :lab_id
              AND project_code = :project_code
        """), {
            "lab_id": lab_id,
            "project_code": project_code
        }).fetchone()

        if duplicate:
            return jsonify({
                "success": False,
                "message": "Project code already exists for this lab"
            }), 409

        now = _utc_now()

        result = db.session.execute(text("""
            INSERT INTO projects (
                lab_id,
                client_id,
                project_code,
                project_name,
                name_of_work_and_other_details,
                nabl_scope,
                location_name,
                site_address,
                city,
                state,
                pincode,
                dispatch_mode,
                client_representative_name,
                request_collected_by,
                test_assigned_to,
                reviewed_by,
                status,
                created_at,
                updated_at
            )
            VALUES (
                :lab_id,
                :client_id,
                :project_code,
                :project_name,
                :name_of_work_and_other_details,
                :nabl_scope,
                :location_name,
                :site_address,
                :city,
                :state,
                :pincode,
                :dispatch_mode,
                :client_representative_name,
                :request_collected_by,
                :test_assigned_to,
                :reviewed_by,
                :status,
                :created_at,
                :updated_at
            )
            RETURNING project_id
        """), {
            "lab_id": lab_id,
            "client_id": client_id,
            "project_code": project_code,
            "project_name": project_name,
            "name_of_work_and_other_details": name_of_work_and_other_details or None,
            "nabl_scope": nabl_scope,
            "location_name": location_name or None,
            "site_address": site_address or None,
            "city": city or None,
            "state": state or None,
            "pincode": pincode or None,
            "dispatch_mode": dispatch_mode or None,
            "client_representative_name": client_representative_name or None,
            "request_collected_by": request_collected_by,
            "test_assigned_to": test_assigned_to,
            "reviewed_by": reviewed_by,
            "status": status,
            "created_at": now,
            "updated_at": now
        }).fetchone()

        project_id = result[0]

        # Create upload directory structure: /Backend/uploaded/lab_name/project_code/
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "..", "uploaded", lab_name, project_code)
        os.makedirs(upload_dir, exist_ok=True)

        # Handle file uploads
        uploaded_files = []
        upload_errors = []
        
        # File validation settings
        ALLOWED_EXTENSIONS = {
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 
            'txt', 'rtf', 'csv', 'jpg', 'jpeg', 'png', 'gif', 
            'zip', 'rar', '7z', 'dwg', 'dxf'
        }
        MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB per file
        
        for file in files:
            if file and file.filename:
                try:
                    # Validate file size
                    file.seek(0, os.SEEK_END)
                    file_size = file.tell()
                    file.seek(0)  # Reset file pointer
                    
                    if file_size > MAX_FILE_SIZE:
                        upload_errors.append(f"File '{file.filename}' exceeds maximum size limit (50MB)")
                        continue
                    
                    if file_size == 0:
                        upload_errors.append(f"File '{file.filename}' is empty")
                        continue
                    
                    # Generate secure filename
                    filename = secure_filename(file.filename)
                    if not filename:
                        upload_errors.append(f"Invalid filename: '{file.filename}'")
                        continue
                    
                    # Validate file extension
                    file_extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
                    if file_extension not in ALLOWED_EXTENSIONS:
                        upload_errors.append(f"File type '.{file_extension}' not allowed for '{filename}'")
                        continue
                    
                    # Add UUID to prevent filename conflicts
                    unique_filename = f"{uuid.uuid4().hex}_{filename}"
                    file_path = os.path.join(upload_dir, unique_filename)
                    
                    # Save file
                    file.save(file_path)
                    
                    # Verify file was saved successfully
                    if not os.path.exists(file_path):
                        upload_errors.append(f"Failed to save file: '{filename}'")
                        continue
                    
                    # Store relative path in database
                    relative_path = f"uploaded/{lab_name}/{project_code}/{unique_filename}"
                    
                    # Insert document record
                    doc_result = db.session.execute(text("""
                        INSERT INTO project_documents (
                            project_id,
                            document_type,
                            file_name,
                            file_path,
                            file_size,
                            mime_type,
                            created_by,
                            updated_by,
                            created_at,
                            updated_at
                        )
                        VALUES (
                            :project_id,
                            :document_type,
                            :file_name,
                            :file_path,
                            :file_size,
                            :mime_type,
                            :created_by,
                            :updated_by,
                            :created_at,
                            :updated_at
                        )
                        RETURNING doc_id
                    """), {
                        "project_id": project_id,
                        "document_type": "project_document",
                        "file_name": filename,
                        "file_path": relative_path,
                        "file_size": os.path.getsize(file_path),
                        "mime_type": file.content_type or 'application/octet-stream',
                        "created_by": user_id,
                        "updated_by": user_id,
                        "created_at": now,
                        "updated_at": now
                    }).fetchone()
                    
                    uploaded_files.append({
                        "doc_id": doc_result[0],
                        "file_name": filename,
                        "file_path": relative_path,
                        "file_size": os.path.getsize(file_path)
                    })
                    
                except Exception as file_error:
                    upload_errors.append(f"Error processing file '{file.filename}': {str(file_error)}")
                    continue

        db.session.execute(text("""
            INSERT INTO project_status_history (
                project_id,
                lab_id,
                old_status,
                new_status,
                changed_by,
                change_note,
                created_at,
                updated_at
            )
            VALUES (
                :project_id,
                :lab_id,
                NULL,
                :new_status,
                :changed_by,
                :change_note,
                :created_at,
                :updated_at
            )
        """), {
            "project_id": project_id,
            "lab_id": lab_id,
            "new_status": status,
            "changed_by": user_id,
            "change_note": f"Project created with {len(uploaded_files)} document(s)",
            "created_at": now,
            "updated_at": now
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
                'projects',
                'projects',
                :record_id,
                'create',
                :action_note,
                :created_at,
                :updated_at
            )
        """), {
            "lab_id": lab_id,
            "user_id": user_id,
            "record_id": project_id,
            "action_note": f"Project created: {project_code} - {project_name} ({len(uploaded_files)} documents uploaded)",
            "created_at": now,
            "updated_at": now
        })

        # Add project scopes if provided
        added_scopes = []
        scope_errors = []
        if scope_tests and len(scope_tests) > 0:
            for scope_data in scope_tests:
                try:
                    group_id = scope_data.get("group_id")
                    material_id = scope_data.get("material_id")
                    scope_test_id = scope_data.get("scope_test_id")
                    sample_required = scope_data.get("sample_required", True)
                    test_quantity = scope_data.get("test_quantity", 1)
                    remarks = (scope_data.get("remarks") or "").strip()
                    status = (scope_data.get("status") or "active").strip().lower()

                    # Validate required fields
                    if not all([group_id, material_id, scope_test_id]):
                        scope_errors.append(f"Missing required fields for scope test {scope_test_id}")
                        continue

                    # Verify the scope test belongs to this lab
                    scope_test = db.session.execute(text("""
                        SELECT st.scope_test_id, st.group_id, st.material_id
                        FROM scope_tests st
                        JOIN scope_groups sg ON sg.group_id = st.group_id
                        WHERE st.scope_test_id = :scope_test_id
                          AND st.group_id = :group_id
                          AND st.material_id = :material_id
                          AND sg.lab_id = :lab_id
                    """), {
                        "scope_test_id": scope_test_id,
                        "group_id": group_id,
                        "material_id": material_id,
                        "lab_id": lab_id
                    }).fetchone()

                    if not scope_test:
                        scope_errors.append(f"Invalid scope test {scope_test_id}")
                        continue

                    # Insert the scope test
                    result = db.session.execute(text("""
                        INSERT INTO project_scope_tests (
                            lab_id,
                            project_id,
                            group_id,
                            material_id,
                            scope_test_id,
                            sample_required,
                            test_quantity,
                            remarks,
                            status,
                            created_at,
                            updated_at
                        )
                        VALUES (
                            :lab_id,
                            :project_id,
                            :group_id,
                            :material_id,
                            :scope_test_id,
                            :sample_required,
                            :test_quantity,
                            :remarks,
                            :status,
                            :created_at,
                            :updated_at
                        )
                        RETURNING project_scope_test_id
                    """), {
                        "lab_id": lab_id,
                        "project_id": project_id,
                        "group_id": group_id,
                        "material_id": material_id,
                        "scope_test_id": scope_test_id,
                        "sample_required": sample_required,
                        "test_quantity": test_quantity,
                        "remarks": remarks or None,
                        "status": status,
                        "created_at": now,
                        "updated_at": now
                    }).fetchone()

                    added_scopes.append({
                        "project_scope_test_id": result[0],
                        "scope_test_id": scope_test_id
                    })

                except Exception as e:
                    scope_errors.append(f"Error adding scope test {scope_data.get('scope_test_id', 'unknown')}: {str(e)}")

        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Project created successfully with {len(uploaded_files)} document(s) and {len(added_scopes)} scope(s)" + (f" ({len(upload_errors)} upload error(s))" if upload_errors else ""),
            "data": {
                "project_id": project_id,
                "project_code": project_code,
                "project_name": project_name,
                "uploaded_files": uploaded_files,
                "upload_errors": upload_errors,
                "added_scopes": added_scopes,
                "scope_errors": scope_errors
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Failed to create project: {str(e)}"
        }), 500


@projects_bp.route("/<int:project_id>", methods=["GET"])
@token_required
def get_project_by_id(project_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")

        result = db.session.execute(text("""
            SELECT
                p.project_id,
                p.lab_id,
                p.client_id,
                c.client_name,
                p.project_code,
                p.project_name,
                p.name_of_work_and_other_details,
                p.location_name,
                p.site_address,
                p.city,
                p.state,
                p.pincode,
                p.dispatch_mode,
                p.client_representative_name,
                p.request_collected_by,
                CONCAT(rc_user.first_name, ' ', rc_user.last_name) as request_collected_by_name,
                p.test_assigned_to,
                CONCAT(ta_user.first_name, ' ', ta_user.last_name) as test_assigned_to_name,
                p.reviewed_by,
                CONCAT(rv_user.first_name, ' ', rv_user.last_name) as reviewed_by_name,
                COALESCE(report_counts.report_count, 0) as total_reports,
                COALESCE(sample_counts.sample_count, 0) as total_samples,
                p.status,
                p.created_at,
                p.updated_at
            FROM projects p
            LEFT JOIN clients c ON c.client_id = p.client_id
            LEFT JOIN users rc_user ON rc_user.user_id = p.request_collected_by
            LEFT JOIN users ta_user ON ta_user.user_id = p.test_assigned_to
            LEFT JOIN users rv_user ON rv_user.user_id = p.reviewed_by
            LEFT JOIN (
                SELECT 
                    project_id, 
                    COUNT(report_id) as report_count
                FROM reports 
                GROUP BY project_id
            ) report_counts ON report_counts.project_id = p.project_id
            LEFT JOIN (
                SELECT 
                    project_id, 
                    COUNT(sample_id) as sample_count
                FROM sample_receipt_register 
                GROUP BY project_id
            ) sample_counts ON sample_counts.project_id = p.project_id
            WHERE p.project_id = :project_id
              AND p.lab_id = :lab_id
        """), {
            "project_id": project_id,
            "lab_id": lab_id
        }).mappings().fetchone()

        if not result:
            return jsonify({
                "success": False,
                "message": "Project not found"
            }), 404

        # Get project scopes
        scopes_result = db.session.execute(text("""
            SELECT
                pst.project_scope_test_id,
                pst.project_id,
                pst.group_id,
                pst.material_id,
                pst.scope_test_id,
                pst.sample_required,
                pst.test_quantity,
                pst.remarks,
                pst.status,
                pst.created_at,
                pst.updated_at,
                sg.group_name,
                sg.testing_scope_type,
                sm.material_name,
                st.test_name,
                st.test_method
            FROM project_scope_tests pst
            JOIN scope_groups sg ON sg.group_id = pst.group_id
            JOIN scope_materials sm ON sm.material_id = pst.material_id
            JOIN scope_tests st ON st.scope_test_id = pst.scope_test_id
            WHERE pst.project_id = :project_id
            ORDER BY sg.testing_scope_type, sg.group_name, sm.material_name, st.test_name
        """), {
            "project_id": project_id
        }).mappings().all()

        # Get project documents
        documents_result = db.session.execute(text("""
            SELECT
                doc_id,
                project_id,
                document_type,
                file_name,
                file_path,
                file_size,
                mime_type,
                created_by,
                updated_by,
                created_at,
                updated_at
            FROM project_documents
            WHERE project_id = :project_id
            ORDER BY created_at DESC
        """), {
            "project_id": project_id
        }).mappings().all()

        project_data = dict(result)
        project_data["scopes"] = [dict(row) for row in scopes_result]
        project_data["documents"] = [dict(row) for row in documents_result]

        return jsonify({
            "success": True,
            "message": "Project fetched successfully",
            "data": project_data
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to fetch project",
            "errors": {"server": [str(e)]}
        }), 500


@projects_bp.route("/<int:project_id>", methods=["PUT"])
@token_required
def update_project(project_id):
    try:
        # Handle both JSON and FormData requests
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Handle FormData with file uploads
            data = request.form.to_dict()
            files = request.files.getlist('documents')
            # Parse scope tests from form data if present
            scope_tests_str = data.get('scope_tests', '[]')
            try:
                import json
                scope_tests = json.loads(scope_tests_str)
            except:
                scope_tests = []
        else:
            # Handle regular JSON request
            data = request.get_json() or {}
            files = []
            scope_tests = data.get("scope_tests", [])

        user_id = g.jwt_payload.get("user_id")
        lab_id = g.jwt_payload.get("lab_id")

        client_id = data.get("client_id")
        project_code = (data.get("project_code") or "").strip()
        project_name = (data.get("project_name") or "").strip()
        name_of_work_and_other_details = (data.get("name_of_work_and_other_details") or "").strip()
        nabl_scope = data.get("nabl_scope", False)
        location_name = (data.get("location_name") or "").strip()
        site_address = (data.get("site_address") or "").strip()
        city = (data.get("city") or "").strip()
        state = (data.get("state") or "").strip()
        pincode = (data.get("pincode") or "").strip()
        dispatch_mode = (data.get("dispatch_mode") or "").strip()
        client_representative_name = (data.get("client_representative_name") or "").strip()
        request_collected_by = data.get("request_collected_by")
        test_assigned_to = data.get("test_assigned_to")
        reviewed_by = data.get("reviewed_by")
        status = (data.get("status") or "draft").strip().lower()

        allowed_status = [
            "draft",
            "active",
            "in_progress",
            "completed",
            "on_hold",
            "cancelled",
        ]

        errors = {}

        if not project_code:
            errors["project_code"] = ["Project code is required"]

        if not project_name:
            errors["project_name"] = ["Project name is required"]

        if status not in allowed_status:
            errors["status"] = ["Invalid status"]

        existing_project = db.session.execute(text("""
            SELECT project_id
            FROM projects
            WHERE project_id = :project_id
              AND lab_id = :lab_id
        """), {
            "project_id": project_id,
            "lab_id": lab_id
        }).fetchone()

        if not existing_project:
            return jsonify({
                "success": False,
                "message": "Project not found"
            }), 404

        if client_id:
            client_exists = db.session.execute(text("""
                SELECT client_id
                FROM clients
                WHERE client_id = :client_id
                  AND lab_id = :lab_id
            """), {
                "client_id": client_id,
                "lab_id": lab_id
            }).fetchone()

            if not client_exists:
                errors["client_id"] = ["Invalid client for this lab"]

        duplicate = db.session.execute(text("""
            SELECT project_id
            FROM projects
            WHERE lab_id = :lab_id
              AND project_code = :project_code
              AND project_id != :project_id
        """), {
            "lab_id": lab_id,
            "project_code": project_code,
            "project_id": project_id
        }).fetchone()

        if duplicate:
            errors["project_code"] = ["Another project with this code already exists"]

        if errors:
            return jsonify({
                "success": False,
                "message": "Validation failed",
                "errors": errors
            }), 400

        now = _utc_now()

        db.session.execute(text("""
            UPDATE projects
            SET
                client_id = :client_id,
                project_code = :project_code,
                project_name = :project_name,
                name_of_work_and_other_details = :name_of_work_and_other_details,
                nabl_scope = :nabl_scope,
                location_name = :location_name,
                site_address = :site_address,
                city = :city,
                state = :state,
                pincode = :pincode,
                dispatch_mode = :dispatch_mode,
                client_representative_name = :client_representative_name,
                request_collected_by = :request_collected_by,
                test_assigned_to = :test_assigned_to,
                reviewed_by = :reviewed_by,
                status = :status,
                updated_at = :updated_at
            WHERE project_id = :project_id
              AND lab_id = :lab_id
        """), {
            "client_id": client_id,
            "project_code": project_code,
            "project_name": project_name,
            "name_of_work_and_other_details": name_of_work_and_other_details or None,
            "nabl_scope": nabl_scope,
            "location_name": location_name or None,
            "site_address": site_address or None,
            "city": city or None,
            "state": state or None,
            "pincode": pincode or None,
            "dispatch_mode": dispatch_mode or None,
            "client_representative_name": client_representative_name or None,
            "request_collected_by": request_collected_by,
            "test_assigned_to": test_assigned_to,
            "reviewed_by": reviewed_by,
            "status": status,
            "updated_at": now,
            "project_id": project_id,
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
                'projects',
                'projects',
                :record_id,
                'update',
                :action_note,
                :created_at,
                :updated_at
            )
        """), {
            "lab_id": lab_id,
            "user_id": user_id,
            "record_id": project_id,
            "action_note": f"Project updated: {project_code} - {project_name}",
            "created_at": now,
            "updated_at": now
        })

        # Handle file uploads if present
        uploaded_files = []
        upload_errors = []
        
        # File validation settings
        ALLOWED_EXTENSIONS = {
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 
            'txt', 'rtf', 'csv', 'jpg', 'jpeg', 'png', 'gif', 
            'zip', 'rar', '7z', 'dwg', 'dxf'
        }
        MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB per file
        
        if files and len(files) > 0:
            try:
                # Get lab name for directory structure
                lab_result = db.session.execute(text("""
                    SELECT email FROM labs WHERE lab_id = :lab_id
                """), {"lab_id": lab_id}).fetchone()
                
                lab_name = lab_result[0].split('@')[0] if lab_result else f"lab_{lab_id}"
                
                # Get project code for directory structure
                project_result = db.session.execute(text("""
                    SELECT project_code FROM projects WHERE project_id = :project_id
                """), {"project_id": project_id}).fetchone()
                
                project_code = project_result[0] if project_result else f"project_{project_id}"

                # Create upload directory structure: /Backend/uploaded/lab_name/project_code/
                # Use the same path calculation as POST function for consistency
                upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "..", "uploaded", lab_name, project_code)
                os.makedirs(upload_dir, exist_ok=True)

                # Handle file uploads
                for file in files:
                    if file and file.filename:
                        try:
                            # Validate file size
                            file.seek(0, os.SEEK_END)
                            file_size = file.tell()
                            file.seek(0)  # Reset file pointer
                            
                            if file_size > MAX_FILE_SIZE:
                                upload_errors.append(f"File '{file.filename}' exceeds maximum size limit (50MB)")
                                continue
                            
                            if file_size == 0:
                                upload_errors.append(f"File '{file.filename}' is empty")
                                continue
                            
                            # Generate secure filename
                            filename = secure_filename(file.filename)
                            if not filename:
                                upload_errors.append(f"Invalid filename: '{file.filename}'")
                                continue
                            
                            # Validate file extension
                            file_extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
                            if file_extension not in ALLOWED_EXTENSIONS:
                                upload_errors.append(f"File type '.{file_extension}' not allowed for '{filename}'")
                                continue
                            
                            # Add UUID to prevent filename conflicts
                            unique_filename = f"{uuid.uuid4().hex}_{filename}"
                            file_path = os.path.join(upload_dir, unique_filename)
                            
                            # Save file
                            file.save(file_path)
                            
                            # Verify file was saved successfully
                            if not os.path.exists(file_path):
                                upload_errors.append(f"Failed to save file: '{filename}'")
                                continue
                            
                            # Store relative path in database
                            relative_path = f"uploaded/{lab_name}/{project_code}/{unique_filename}"
                            
                            # Insert document record
                            doc_result = db.session.execute(text("""
                                INSERT INTO project_documents (
                                    project_id,
                                    document_type,
                                    file_name,
                                    file_path,
                                    file_size,
                                    mime_type,
                                    created_by,
                                    updated_by,
                                    created_at,
                                    updated_at
                                )
                                VALUES (
                                    :project_id,
                                    :document_type,
                                    :file_name,
                                    :file_path,
                                    :file_size,
                                    :mime_type,
                                    :created_by,
                                    :updated_by,
                                    :created_at,
                                    :updated_at
                                )
                                RETURNING doc_id
                            """), {
                                "project_id": project_id,
                                "document_type": "project_document",
                                "file_name": filename,
                                "file_path": relative_path,
                                "file_size": os.path.getsize(file_path),
                                "mime_type": file.content_type or 'application/octet-stream',
                                "created_by": user_id,
                                "updated_by": user_id,
                                "created_at": now,
                                "updated_at": now
                            }).fetchone()
                            
                            uploaded_files.append({
                                "doc_id": doc_result[0],
                                "file_name": filename,
                                "file_path": relative_path,
                                "file_size": os.path.getsize(file_path)
                            })
                            
                        except Exception as file_error:
                            upload_errors.append(f"Error processing file '{file.filename}': {str(file_error)}")
                            continue
            except Exception as file_error:
                print(f"File upload error: {str(file_error)}")
                # Continue without file uploads if there's an error
                pass

        # Handle project scopes if provided
        added_scopes = []
        scope_errors = []
        if scope_tests is not None:
            # For project updates, scope_tests can be:
            # - null/undefined: don't modify existing scopes
            # - []: clear all existing scopes
            # - [...]: replace all existing scopes with new ones
            
            # First, delete all existing scopes for this project
            db.session.execute(text("""
                DELETE FROM project_scope_tests
                WHERE project_id = :project_id
            """), {
                "project_id": project_id
            })
            
            # Add new scopes if provided
            if scope_tests and len(scope_tests) > 0:
                # Ensure scope_tests is a list, not a string
                if isinstance(scope_tests, str):
                    try:
                        import json
                        scope_tests = json.loads(scope_tests)
                    except json.JSONDecodeError:
                        scope_errors.append("Invalid scope_tests format - expected JSON array")
                        scope_tests = []
                
                for scope_data in scope_tests:
                    try:
                        # Ensure scope_data is a dictionary
                        if isinstance(scope_data, str):
                            try:
                                import json
                                scope_data = json.loads(scope_data)
                            except json.JSONDecodeError:
                                scope_errors.append(f"Invalid scope data format: {scope_data}")
                                continue
                        
                        group_id = scope_data.get("group_id")
                        material_id = scope_data.get("material_id")
                        scope_test_id = scope_data.get("scope_test_id")
                        sample_required = scope_data.get("sample_required", True)
                        test_quantity = scope_data.get("test_quantity", 1)
                        remarks = (scope_data.get("remarks") or "").strip()
                        status = (scope_data.get("status") or "active").strip().lower()

                        # Validate required fields
                        if not all([group_id, material_id, scope_test_id]):
                            scope_errors.append(f"Missing required fields for scope test {scope_test_id}")
                            continue

                        # Verify the scope test belongs to this lab
                        scope_test = db.session.execute(text("""
                            SELECT st.scope_test_id, st.group_id, st.material_id
                            FROM scope_tests st
                            JOIN scope_groups sg ON sg.group_id = st.group_id
                            WHERE st.scope_test_id = :scope_test_id
                              AND st.group_id = :group_id
                              AND st.material_id = :material_id
                              AND sg.lab_id = :lab_id
                        """), {
                            "scope_test_id": scope_test_id,
                            "group_id": group_id,
                            "material_id": material_id,
                            "lab_id": lab_id
                        }).fetchone()

                        if not scope_test:
                            scope_errors.append(f"Invalid scope test {scope_test_id}")
                            continue

                        # Insert the scope test
                        result = db.session.execute(text("""
                            INSERT INTO project_scope_tests (
                                lab_id,
                                project_id,
                                group_id,
                                material_id,
                                scope_test_id,
                                sample_required,
                                test_quantity,
                                remarks,
                                status,
                                created_at,
                                updated_at
                            )
                            VALUES (
                                :lab_id,
                                :project_id,
                                :group_id,
                                :material_id,
                                :scope_test_id,
                                :sample_required,
                                :test_quantity,
                                :remarks,
                                :status,
                                :created_at,
                                :updated_at
                            )
                            RETURNING project_scope_test_id
                        """), {
                            "lab_id": lab_id,
                            "project_id": project_id,
                            "group_id": group_id,
                            "material_id": material_id,
                            "scope_test_id": scope_test_id,
                            "sample_required": sample_required,
                            "test_quantity": test_quantity,
                            "remarks": remarks or None,
                            "status": status,
                            "created_at": now,
                            "updated_at": now
                        }).fetchone()

                        added_scopes.append({
                            "project_scope_test_id": result[0],
                            "scope_test_id": scope_test_id
                        })

                    except Exception as e:
                        scope_errors.append(f"Error adding scope test {scope_data.get('scope_test_id', 'unknown') if isinstance(scope_data, dict) else 'invalid'}: {str(e)}")

        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Project updated successfully with {len(uploaded_files)} document(s) and {len(added_scopes)} scope(s)" + (f" ({len(upload_errors)} upload error(s))" if upload_errors else ""),
            "data": {
                "uploaded_files": uploaded_files,
                "upload_errors": upload_errors,
                "added_scopes": added_scopes,
                "scope_errors": scope_errors
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"PUT Project Error: {str(e)}")  # Debug print
        import traceback
        traceback.print_exc()  # Print full traceback
        return jsonify({
            "success": False,
            "message": f"Failed to update project: {str(e)}",
            "errors": {"server": [str(e)]}
        }), 500


@projects_bp.route("/<int:project_id>/status", methods=["PATCH"])
@token_required
def update_project_status(project_id):
    try:
        data = request.get_json() or {}

        user_id = g.jwt_payload.get("user_id")
        lab_id = g.jwt_payload.get("lab_id")
        new_status = (data.get("status") or "").strip().lower()
        change_note = (data.get("change_note") or "").strip()

        allowed_status = [
            "draft",
            "active",
            "in_progress",
            "completed",
            "on_hold",
            "cancelled",
        ]

        if new_status not in allowed_status:
            return jsonify({
                "success": False,
                "message": "Invalid status"
            }), 400

        project = db.session.execute(text("""
            SELECT project_id, project_name, status
            FROM projects
            WHERE project_id = :project_id
              AND lab_id = :lab_id
        """), {
            "project_id": project_id,
            "lab_id": lab_id
        }).mappings().fetchone()

        if not project:
            return jsonify({
                "success": False,
                "message": "Project not found"
            }), 404

        old_status = project["status"]
        now = _utc_now()

        db.session.execute(text("""
            UPDATE projects
            SET
                status = :status,
                updated_by = :updated_by,
                approved_by = :approved_by,
                updated_at = :updated_at
            WHERE project_id = :project_id
              AND lab_id = :lab_id
        """), {
            "status": new_status,
            "updated_by": user_id,
            "approved_by": user_id if new_status in ["active", "completed"] else None,
            "updated_at": now,
            "project_id": project_id,
            "lab_id": lab_id
        })

        db.session.execute(text("""
            INSERT INTO project_status_history (
                project_id,
                lab_id,
                old_status,
                new_status,
                changed_by,
                change_note,
                created_at,
                updated_at
            )
            VALUES (
                :project_id,
                :lab_id,
                :old_status,
                :new_status,
                :changed_by,
                :change_note,
                :created_at,
                :updated_at
            )
        """), {
            "project_id": project_id,
            "lab_id": lab_id,
            "old_status": old_status,
            "new_status": new_status,
            "changed_by": user_id,
            "change_note": change_note or f"Project status changed from {old_status} to {new_status}",
            "created_at": now,
            "updated_at": now
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
                'projects',
                'projects',
                :record_id,
                'status_update',
                :action_note,
                :created_at,
                :updated_at
            )
        """), {
            "lab_id": lab_id,
            "user_id": user_id,
            "record_id": project_id,
            "action_note": f"Project status changed to {new_status}: {project['project_name']}",
            "created_at": now,
            "updated_at": now
        })

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Project status updated successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to update project status",
            "errors": {"server": [str(e)]}
        }), 500


# Document Management Endpoints

@projects_bp.route("/<int:project_id>/documents", methods=["GET"])
@token_required
def get_project_documents(project_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")

        # Verify project belongs to this lab
        project_exists = db.session.execute(text("""
            SELECT project_id FROM projects 
            WHERE project_id = :project_id AND lab_id = :lab_id
        """), {
            "project_id": project_id,
            "lab_id": lab_id
        }).fetchone()

        if not project_exists:
            return jsonify({
                "success": False,
                "message": "Project not found"
            }), 404

        result = db.session.execute(text("""
            SELECT
                doc_id,
                project_id,
                document_type,
                file_name,
                file_path,
                file_size,
                mime_type,
                created_by,
                updated_by,
                created_at,
                updated_at
            FROM project_documents
            WHERE project_id = :project_id
            ORDER BY created_at DESC
        """), {
            "project_id": project_id
        }).mappings().all()

        return jsonify({
            "success": True,
            "message": "Documents fetched successfully",
            "data": [dict(row) for row in result]
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to fetch documents",
            "errors": {"server": [str(e)]}
        }), 500


@projects_bp.route("/<int:project_id>/documents", methods=["POST"])
@token_required
def upload_project_document(project_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        user_id = g.jwt_payload.get("user_id")

        # Verify project belongs to this lab
        project_result = db.session.execute(text("""
            SELECT project_code, lab_id FROM projects 
            WHERE project_id = :project_id AND lab_id = :lab_id
        """), {
            "project_id": project_id,
            "lab_id": lab_id
        }).fetchone()

        if not project_result:
            return jsonify({
                "success": False,
                "message": "Project not found"
            }), 404

        project_code = project_result[0]
        
        # Get lab name for directory structure
        lab_result = db.session.execute(text("""
            SELECT email FROM labs WHERE lab_id = :lab_id
        """), {"lab_id": lab_id}).fetchone()
        
        lab_name = lab_result[0].split('@')[0] if lab_result else f"lab_{lab_id}"

        if 'file' not in request.files:
            return jsonify({
                "success": False,
                "message": "No file provided"
            }), 400

        file = request.files['file']
        document_type = request.form.get('document_type', 'project_document')
        file_name = request.form.get('file_name', file.filename)

        if file.filename == '':
            return jsonify({
                "success": False,
                "message": "No file selected"
            }), 400

        # Create upload directory structure
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "..", "uploaded", lab_name, project_code)
        os.makedirs(upload_dir, exist_ok=True)

        # Generate secure filename
        filename = secure_filename(file.filename)
        if filename:
            # Add UUID to prevent filename conflicts
            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            file_path = os.path.join(upload_dir, unique_filename)
            
            # Save file
            file.save(file_path)
            
            # Store relative path in database
            relative_path = f"uploaded/{lab_name}/{project_code}/{unique_filename}"
            
            now = _utc_now()

            # Insert document record
            doc_result = db.session.execute(text("""
                INSERT INTO project_documents (
                    project_id,
                    document_type,
                    file_name,
                    file_path,
                    file_size,
                    mime_type,
                    created_by,
                    updated_by,
                    created_at,
                    updated_at
                )
                VALUES (
                    :project_id,
                    :document_type,
                    :file_name,
                    :file_path,
                    :file_size,
                    :mime_type,
                    :created_by,
                    :updated_by,
                    :created_at,
                    :updated_at
                )
                RETURNING doc_id
            """), {
                "project_id": project_id,
                "document_type": document_type,
                "file_name": file_name,
                "file_path": relative_path,
                "file_size": os.path.getsize(file_path),
                "mime_type": file.content_type or 'application/octet-stream',
                "created_by": user_id,
                "updated_by": user_id,
                "created_at": now,
                "updated_at": now
            }).fetchone()

            db.session.commit()

            return jsonify({
                "success": True,
                "message": "Document uploaded successfully",
                "data": {
                    "doc_id": doc_result[0],
                    "file_name": file_name,
                    "file_path": relative_path
                }
            }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to upload document",
            "errors": {"server": [str(e)]}
        }), 500


@projects_bp.route("/<int:project_id>/documents/<int:doc_id>", methods=["DELETE"])
@token_required
def delete_project_document(project_id, doc_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        user_id = g.jwt_payload.get("user_id")

        # Verify project belongs to this lab and get document info
        doc_result = db.session.execute(text("""
            SELECT pd.doc_id, pd.file_path, p.project_id, p.lab_id
            FROM project_documents pd
            JOIN projects p ON p.project_id = pd.project_id
            WHERE pd.doc_id = :doc_id 
              AND pd.project_id = :project_id
              AND p.lab_id = :lab_id
        """), {
            "doc_id": doc_id,
            "project_id": project_id,
            "lab_id": lab_id
        }).fetchone()

        if not doc_result:
            return jsonify({
                "success": False,
                "message": "Document not found"
            }), 404

        file_path = doc_result[1]

        # Delete file from filesystem
        if file_path:
            full_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "..", file_path)
            try:
                if os.path.exists(full_path):
                    os.remove(full_path)
            except Exception as e:
                print(f"Warning: Could not delete file {full_path}: {e}")

        # Delete from database
        db.session.execute(text("""
            DELETE FROM project_documents 
            WHERE doc_id = :doc_id AND project_id = :project_id
        """), {
            "doc_id": doc_id,
            "project_id": project_id
        })

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Document deleted successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to delete document",
            "errors": {"server": [str(e)]}
        }), 500


@projects_bp.route("/<int:project_id>/documents/<int:doc_id>/download", methods=["GET"])
@token_required
def download_project_document(project_id, doc_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")

        # Verify project belongs to this lab and get document info
        doc_result = db.session.execute(text("""
            SELECT pd.doc_id, pd.file_path, pd.file_name, pd.mime_type, p.project_id, p.lab_id
            FROM project_documents pd
            JOIN projects p ON p.project_id = pd.project_id
            WHERE pd.doc_id = :doc_id 
              AND pd.project_id = :project_id
              AND p.lab_id = :lab_id
        """), {
            "doc_id": doc_id,
            "project_id": project_id,
            "lab_id": lab_id
        }).fetchone()

        if not doc_result:
            return jsonify({
                "success": False,
                "message": "Document not found"
            }), 404

        file_path = doc_result[1]
        file_name = doc_result[2]
        mime_type = doc_result[3]

        # Get full file path
        full_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "..", file_path)
        
        if not os.path.exists(full_path):
            return jsonify({
                "success": False,
                "message": "File not found on server"
            }), 404

        from flask import send_file
        return send_file(
            full_path,
            as_attachment=True,
            download_name=file_name,
            mimetype=mime_type
        )

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to download document",
            "errors": {"server": [str(e)]}
        }), 500


@projects_bp.route("/<int:project_id>/documents/<int:doc_id>/view", methods=["GET"])
@token_required
def view_project_document(project_id, doc_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")

        # Verify project belongs to this lab and get document info
        doc_result = db.session.execute(text("""
            SELECT pd.doc_id, pd.file_path, pd.file_name, pd.mime_type, p.project_id, p.lab_id
            FROM project_documents pd
            JOIN projects p ON p.project_id = pd.project_id
            WHERE pd.doc_id = :doc_id 
              AND pd.project_id = :project_id
              AND p.lab_id = :lab_id
        """), {
            "doc_id": doc_id,
            "project_id": project_id,
            "lab_id": lab_id
        }).fetchone()

        if not doc_result:
            return jsonify({
                "success": False,
                "message": "Document not found"
            }), 404

        file_path = doc_result[1]
        file_name = doc_result[2]
        mime_type = doc_result[3]

        # Get full file path
        full_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "..", file_path)
        
        if not os.path.exists(full_path):
            return jsonify({
                "success": False,
                "message": "File not found on server"
            }), 404

        from flask import send_file
        return send_file(
            full_path,
            as_attachment=False,
            download_name=file_name,
            mimetype=mime_type
        )

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to view document",
            "errors": {"server": [str(e)]}
        }), 500


# Project Scope Management Endpoints

@projects_bp.route("/<int:project_id>/scopes", methods=["GET"])
@token_required
def get_project_scopes(project_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")

        # Verify project belongs to this lab
        project_exists = db.session.execute(text("""
            SELECT project_id FROM projects 
            WHERE project_id = :project_id AND lab_id = :lab_id
        """), {
            "project_id": project_id,
            "lab_id": lab_id
        }).fetchone()

        if not project_exists:
            return jsonify({
                "success": False,
                "message": "Project not found"
            }), 404

        result = db.session.execute(text("""
            SELECT
                pst.project_scope_test_id,
                pst.project_id,
                pst.group_id,
                pst.material_id,
                pst.scope_test_id,
                pst.sample_required,
                pst.test_quantity,
                pst.remarks,
                pst.status,
                pst.created_at,
                pst.updated_at,
                sg.group_name,
                sg.testing_scope_type,
                sm.material_name,
                st.test_name,
                st.test_method
            FROM project_scope_tests pst
            JOIN scope_groups sg ON sg.group_id = pst.group_id
            JOIN scope_materials sm ON sm.material_id = pst.material_id
            JOIN scope_tests st ON st.scope_test_id = pst.scope_test_id
            WHERE pst.project_id = :project_id
            ORDER BY sg.testing_scope_type, sg.group_name, sm.material_name, st.test_name
        """), {
            "project_id": project_id
        }).mappings().all()

        return jsonify({
            "success": True,
            "message": "Project scopes fetched successfully",
            "data": [dict(row) for row in result]
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to fetch project scopes",
            "errors": {"server": [str(e)]}
        }), 500


@projects_bp.route("/<int:project_id>/scopes", methods=["POST"])
@token_required
def add_project_scope(project_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        user_id = g.jwt_payload.get("user_id")
        data = request.get_json() or {}

        # Verify project belongs to this lab
        project_exists = db.session.execute(text("""
            SELECT project_id FROM projects 
            WHERE project_id = :project_id AND lab_id = :lab_id
        """), {
            "project_id": project_id,
            "lab_id": lab_id
        }).fetchone()

        if not project_exists:
            return jsonify({
                "success": False,
                "message": "Project not found"
            }), 404

        # Validate required fields
        group_id = data.get("group_id")
        material_id = data.get("material_id")
        scope_test_id = data.get("scope_test_id")
        sample_required = data.get("sample_required", True)
        test_quantity = data.get("test_quantity", 1)
        remarks = (data.get("remarks") or "").strip()
        status = (data.get("status") or "active").strip().lower()

        errors = {}

        if not group_id:
            errors["group_id"] = ["Group ID is required"]

        if not material_id:
            errors["material_id"] = ["Material ID is required"]

        if not scope_test_id:
            errors["scope_test_id"] = ["Scope Test ID is required"]

        if status not in ["active", "inactive"]:
            errors["status"] = ["Invalid status"]

        # Verify the scope test belongs to this lab and matches the group/material
        scope_test = db.session.execute(text("""
            SELECT st.scope_test_id, st.group_id, st.material_id
            FROM scope_tests st
            JOIN scope_groups sg ON sg.group_id = st.group_id
            WHERE st.scope_test_id = :scope_test_id
              AND st.group_id = :group_id
              AND st.material_id = :material_id
              AND sg.lab_id = :lab_id
        """), {
            "scope_test_id": scope_test_id,
            "group_id": group_id,
            "material_id": material_id,
            "lab_id": lab_id
        }).fetchone()

        if not scope_test:
            errors["scope_test_id"] = ["Invalid scope test for this lab"]

        # Check if scope test already exists for this project
        existing = db.session.execute(text("""
            SELECT project_scope_test_id FROM project_scope_tests
            WHERE project_id = :project_id AND scope_test_id = :scope_test_id
        """), {
            "project_id": project_id,
            "scope_test_id": scope_test_id
        }).fetchone()

        if existing:
            errors["scope_test_id"] = ["This scope test is already added to the project"]

        if errors:
            return jsonify({
                "success": False,
                "message": "Validation failed",
                "errors": errors
            }), 400

        now = _utc_now()

        result = db.session.execute(text("""
            INSERT INTO project_scope_tests (
                lab_id,
                project_id,
                group_id,
                material_id,
                scope_test_id,
                sample_required,
                test_quantity,
                remarks,
                status,
                created_at,
                updated_at
            )
            VALUES (
                :lab_id,
                :project_id,
                :group_id,
                :material_id,
                :scope_test_id,
                :sample_required,
                :test_quantity,
                :remarks,
                :status,
                :created_at,
                :updated_at
            )
            RETURNING project_scope_test_id
        """), {
            "lab_id": lab_id,
            "project_id": project_id,
            "group_id": group_id,
            "material_id": material_id,
            "scope_test_id": scope_test_id,
            "sample_required": sample_required,
            "test_quantity": test_quantity,
            "remarks": remarks or None,
            "status": status,
            "created_at": now,
            "updated_at": now
        }).fetchone()

        project_scope_test_id = result[0]

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
                'projects',
                'project_scope_tests',
                :record_id,
                'create',
                :action_note,
                :created_at,
                :updated_at
            )
        """), {
            "lab_id": lab_id,
            "user_id": user_id,
            "record_id": project_scope_test_id,
            "action_note": f"Project scope added: Project {project_id}, Test {scope_test_id}",
            "created_at": now,
            "updated_at": now
        })

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Project scope added successfully",
            "data": {
                "project_scope_test_id": project_scope_test_id,
                "project_id": project_id,
                "scope_test_id": scope_test_id
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to add project scope",
            "errors": {"server": [str(e)]}
        }), 500


@projects_bp.route("/<int:project_id>/scopes/<int:project_scope_test_id>", methods=["PUT"])
@token_required
def update_project_scope(project_id, project_scope_test_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        user_id = g.jwt_payload.get("user_id")
        data = request.get_json() or {}

        # Verify project scope belongs to this lab and project
        existing_scope = db.session.execute(text("""
            SELECT pst.project_scope_test_id, pst.project_id
            FROM project_scope_tests pst
            JOIN projects p ON p.project_id = pst.project_id
            WHERE pst.project_scope_test_id = :project_scope_test_id
              AND pst.project_id = :project_id
              AND p.lab_id = :lab_id
        """), {
            "project_scope_test_id": project_scope_test_id,
            "project_id": project_id,
            "lab_id": lab_id
        }).fetchone()

        if not existing_scope:
            return jsonify({
                "success": False,
                "message": "Project scope not found"
            }), 404

        sample_required = data.get("sample_required")
        test_quantity = data.get("test_quantity")
        remarks = data.get("remarks")
        status = data.get("status")

        errors = {}

        if status is not None and status not in ["active", "inactive"]:
            errors["status"] = ["Invalid status"]

        if test_quantity is not None and (not isinstance(test_quantity, int) or test_quantity < 0):
            errors["test_quantity"] = ["Test quantity must be a positive integer"]

        if errors:
            return jsonify({
                "success": False,
                "message": "Validation failed",
                "errors": errors
            }), 400

        now = _utc_now()

        db.session.execute(text("""
            UPDATE project_scope_tests
            SET
                sample_required = COALESCE(:sample_required, sample_required),
                test_quantity = COALESCE(:test_quantity, test_quantity),
                remarks = COALESCE(:remarks, remarks),
                status = COALESCE(:status, status),
                updated_at = :updated_at
            WHERE project_scope_test_id = :project_scope_test_id
              AND project_id = :project_id
        """), {
            "sample_required": sample_required,
            "test_quantity": test_quantity,
            "remarks": remarks if remarks is not None else None,
            "status": status,
            "updated_at": now,
            "project_scope_test_id": project_scope_test_id,
            "project_id": project_id
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
                'projects',
                'project_scope_tests',
                :record_id,
                'update',
                :action_note,
                :created_at,
                :updated_at
            )
        """), {
            "lab_id": lab_id,
            "user_id": user_id,
            "record_id": project_scope_test_id,
            "action_note": f"Project scope updated: Project {project_id}, Scope {project_scope_test_id}",
            "created_at": now,
            "updated_at": now
        })

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Project scope updated successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to update project scope",
            "errors": {"server": [str(e)]}
        }), 500


@projects_bp.route("/<int:project_id>/scopes/<int:project_scope_test_id>", methods=["DELETE"])
@token_required
def delete_project_scope(project_id, project_scope_test_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        user_id = g.jwt_payload.get("user_id")

        # Verify project scope belongs to this lab and project
        existing_scope = db.session.execute(text("""
            SELECT pst.project_scope_test_id, pst.project_id
            FROM project_scope_tests pst
            JOIN projects p ON p.project_id = pst.project_id
            WHERE pst.project_scope_test_id = :project_scope_test_id
              AND pst.project_id = :project_id
              AND p.lab_id = :lab_id
        """), {
            "project_scope_test_id": project_scope_test_id,
            "project_id": project_id,
            "lab_id": lab_id
        }).fetchone()

        if not existing_scope:
            return jsonify({
                "success": False,
                "message": "Project scope not found"
            }), 404

        now = _utc_now()

        db.session.execute(text("""
            DELETE FROM project_scope_tests
            WHERE project_scope_test_id = :project_scope_test_id
              AND project_id = :project_id
        """), {
            "project_scope_test_id": project_scope_test_id,
            "project_id": project_id
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
                'projects',
                'project_scope_tests',
                :record_id,
                'delete',
                :action_note,
                :created_at,
                :updated_at
            )
        """), {
            "lab_id": lab_id,
            "user_id": user_id,
            "record_id": project_scope_test_id,
            "action_note": f"Project scope deleted: Project {project_id}, Scope {project_scope_test_id}",
            "created_at": now,
            "updated_at": now
        })

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Project scope deleted successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to delete project scope",
            "errors": {"server": [str(e)]}
        }), 500


@projects_bp.route("/<int:project_id>/scopes/batch", methods=["POST"])
@token_required
def add_project_scopes_batch(project_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        user_id = g.jwt_payload.get("user_id")
        data = request.get_json() or {}

        # Verify project belongs to this lab
        project_exists = db.session.execute(text("""
            SELECT project_id FROM projects 
            WHERE project_id = :project_id AND lab_id = :lab_id
        """), {
            "project_id": project_id,
            "lab_id": lab_id
        }).fetchone()

        if not project_exists:
            return jsonify({
                "success": False,
                "message": "Project not found"
            }), 404

        scope_tests = data.get("scope_tests", [])
        if not scope_tests:
            return jsonify({
                "success": False,
                "message": "No scope tests provided"
            }), 400

        now = _utc_now()
        added_scopes = []
        errors = []

        for scope_data in scope_tests:
            try:
                group_id = scope_data.get("group_id")
                material_id = scope_data.get("material_id")
                scope_test_id = scope_data.get("scope_test_id")
                sample_required = scope_data.get("sample_required", True)
                test_quantity = scope_data.get("test_quantity", 1)
                remarks = (scope_data.get("remarks") or "").strip()
                status = (scope_data.get("status") or "active").strip().lower()

                # Validate required fields
                if not all([group_id, material_id, scope_test_id]):
                    errors.append(f"Missing required fields for scope test {scope_test_id}")
                    continue

                # Verify the scope test belongs to this lab
                scope_test = db.session.execute(text("""
                    SELECT st.scope_test_id, st.group_id, st.material_id
                    FROM scope_tests st
                    JOIN scope_groups sg ON sg.group_id = st.group_id
                    WHERE st.scope_test_id = :scope_test_id
                      AND st.group_id = :group_id
                      AND st.material_id = :material_id
                      AND sg.lab_id = :lab_id
                """), {
                    "scope_test_id": scope_test_id,
                    "group_id": group_id,
                    "material_id": material_id,
                    "lab_id": lab_id
                }).fetchone()

                if not scope_test:
                    errors.append(f"Invalid scope test {scope_test_id}")
                    continue

                # Check if scope test already exists for this project
                existing = db.session.execute(text("""
                    SELECT project_scope_test_id FROM project_scope_tests
                    WHERE project_id = :project_id AND scope_test_id = :scope_test_id
                """), {
                    "project_id": project_id,
                    "scope_test_id": scope_test_id
                }).fetchone()

                if existing:
                    errors.append(f"Scope test {scope_test_id} already exists in project")
                    continue

                # Insert the scope test
                result = db.session.execute(text("""
                    INSERT INTO project_scope_tests (
                        lab_id,
                        project_id,
                        group_id,
                        material_id,
                        scope_test_id,
                        sample_required,
                        test_quantity,
                        remarks,
                        status,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        :lab_id,
                        :project_id,
                        :group_id,
                        :material_id,
                        :scope_test_id,
                        :sample_required,
                        :test_quantity,
                        :remarks,
                        :status,
                        :created_at,
                        :updated_at
                    )
                    RETURNING project_scope_test_id
                """), {
                    "lab_id": lab_id,
                    "project_id": project_id,
                    "group_id": group_id,
                    "material_id": material_id,
                    "scope_test_id": scope_test_id,
                    "sample_required": sample_required,
                    "test_quantity": test_quantity,
                    "remarks": remarks or None,
                    "status": status,
                    "created_at": now,
                    "updated_at": now
                }).fetchone()

                added_scopes.append({
                    "project_scope_test_id": result[0],
                    "scope_test_id": scope_test_id
                })

            except Exception as e:
                errors.append(f"Error adding scope test {scope_data.get('scope_test_id', 'unknown')}: {str(e)}")

        if added_scopes:
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
                    'projects',
                    'project_scope_tests',
                    :record_id,
                    'batch_create',
                    :action_note,
                    :created_at,
                    :updated_at
                )
            """), {
                "lab_id": lab_id,
                "user_id": user_id,
                "record_id": project_id,
                "action_note": f"Batch added {len(added_scopes)} project scopes to project {project_id}",
                "created_at": now,
                "updated_at": now
            })

            db.session.commit()

        return jsonify({
            "success": len(added_scopes) > 0,
            "message": f"Added {len(added_scopes)} scope tests to project",
            "data": {
                "added_scopes": added_scopes,
                "errors": errors
            }
        }), 200 if added_scopes else 400

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to add project scopes in batch",
            "errors": {"server": [str(e)]}
        }), 500


# Get project preview data
@projects_bp.route("/<int:project_id>/preview", methods=["GET"])
@token_required
def get_project_preview(project_id):
    # try:
    if True:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Get project with all related data
        result = db.session.execute(text("""
            SELECT
                p.project_id,
                p.lab_id,
                p.client_id,
                c.client_name,
                p.project_code,
                p.project_name,
                p.name_of_work_and_other_details,
                p.nabl_scope,
                p.location_name,
                p.site_address,
                p.city,
                p.state,
                p.pincode,
                p.dispatch_mode,
                p.client_representative_name,
                p.request_collected_by,
                CONCAT(rc_user.first_name, ' ', rc_user.last_name) as request_collected_by_name,
                p.test_assigned_to,
                CONCAT(ta_user.first_name, ' ', ta_user.last_name) as test_assigned_to_name,
                p.reviewed_by,
                CONCAT(rv_user.first_name, ' ', rv_user.last_name) as reviewed_by_name,
                p.status,
                p.created_at,
                p.updated_at
            FROM projects p
            LEFT JOIN clients c ON c.client_id = p.client_id
            LEFT JOIN users rc_user ON rc_user.user_id = p.request_collected_by
            LEFT JOIN users ta_user ON ta_user.user_id = p.test_assigned_to
            LEFT JOIN users rv_user ON rv_user.user_id = p.reviewed_by
            WHERE p.project_id = :project_id
              AND p.lab_id = :lab_id
        """), {
            "project_id": project_id,
            "lab_id": lab_id
        }).mappings().fetchone()

        if not result:
            return jsonify({
                "success": False,
                "message": "Project not found"
            }), 404

        # Get project documents
        documents_result = db.session.execute(text("""
            SELECT 
                doc_id,
                file_name,
                file_path,
                document_type,
                file_size,
                created_at
            FROM project_documents
            WHERE project_id = :project_id
            ORDER BY created_at DESC
        """), {"project_id": project_id}).fetchall()

        # Get project scopes
        scopes_result = db.session.execute(text("""
            SELECT
                pst.project_scope_test_id,
                pst.project_id,
                pst.group_id,
                sg.group_name,
                pst.material_id,
                sm.material_name,
                pst.scope_test_id,
                st.test_name,
                st.test_method,
                pst.sample_required,
                pst.test_quantity,
                pst.remarks,
                pst.status
            FROM project_scope_tests pst
            LEFT JOIN scope_groups sg ON sg.group_id = pst.group_id
            LEFT JOIN scope_materials sm ON sm.material_id = pst.material_id
            LEFT JOIN scope_tests st ON st.scope_test_id = pst.scope_test_id
            WHERE pst.project_id = :project_id
              AND pst.status = 'active'
            ORDER BY sg.group_name, sm.material_name, st.test_name
        """), {"project_id": project_id}).fetchall()

        # Get sample count
        sample_count = db.session.execute(text("""
            SELECT COUNT(*) as count
            FROM sample_receipt_register
            WHERE project_id = :project_id
        """), {"project_id": project_id}).fetchone()

        # Get report count
        report_count = db.session.execute(text("""
            SELECT COUNT(*) as count
            FROM reports
            WHERE project_id = :project_id
        """), {"project_id": project_id}).fetchone()

        # Convert results to dict format
        project_data = dict(result)
        
        # documents_result is already a list of Row objects, convert each to dict
        project_data['documents'] = []
        for doc in documents_result:
            if hasattr(doc, '_asdict'):
                project_data['documents'].append(doc._asdict())
            else:
                # Fallback for different SQLAlchemy versions
                doc_dict = {}
                if hasattr(doc, 'keys'):
                    for key in doc.keys():
                        doc_dict[key] = doc[key]
                project_data['documents'].append(doc_dict)
        
        # scopes_result is already a list of Row objects, convert each to dict
        project_data['scopes'] = []
        for scope in scopes_result:
            if hasattr(scope, '_asdict'):
                project_data['scopes'].append(scope._asdict())
            else:
                # Fallback for different SQLAlchemy versions
                scope_dict = {}
                if hasattr(scope, 'keys'):
                    for key in scope.keys():
                        scope_dict[key] = scope[key]
                project_data['scopes'].append(scope_dict)
        
        project_data['sample_count'] = sample_count.count if sample_count else 0
        project_data['report_count'] = report_count.count if report_count else 0

        return jsonify({
            "success": True,
            "data": project_data
        })

    # except Exception as e:
    #     return jsonify({
    #         "success": False,
    #         "message": f"Error fetching project preview: {str(e)}"
    #     }), 500

    # except Exception as e:
    #     return jsonify({
    #         "success": False,
    #         "message": f"Error fetching project preview: {str(e)}"
    #     }), 500