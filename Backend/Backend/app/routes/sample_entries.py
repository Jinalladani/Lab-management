from datetime import datetime, timezone, date
from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from app.extensions import db
from app.utils.auth_decorator import token_required
from werkzeug.utils import secure_filename
import logging
import os
import uuid
import json

# Configure logging
logger = logging.getLogger(__name__)

sample_entries_bp = Blueprint("sample_entries", __name__)

RECEIPT_TABLE = "sample_receipt_register"
RECEIPT_PHOTOS_TABLE = "sample_receipt_photos"
RECEIPT_ID_COL = "sample_id"

VALID_SAMPLE_SOURCES = {'Site', 'Plant', 'Client', 'Third Party'}
VALID_RECEIVED_CONDITIONS = {'Good', 'Damaged', 'Wet', 'Broken', 'Other'}
VALID_SAMPLE_PRIORITIES = {'Normal', 'Urgent', 'High Priority'}


SORTABLE_COLUMNS = {
    'sr_no': 'srr.sample_id',
    'letter_date': 'srr.letter_date',
    'sample_received_date': 'srr.sample_received_date',
    'received_date': 'srr.sample_received_date',
    'sample_priority': 'srr.sample_priority',
    'priority': 'srr.sample_priority',
    'status': 'srr.status',
}

PRIORITY_SORT_SQL = """
    CASE srr.sample_priority
        WHEN 'High Priority' THEN 1
        WHEN 'Urgent' THEN 2
        WHEN 'Normal' THEN 3
        ELSE 4
    END
"""

RECEIPT_SELECT = """
    srr.sample_id AS sample_entry_id,
    srr.sample_id,
    srr.sample_id AS sr_no,
    p.lab_id,
    srr.project_id,
    srr.project_code AS project_no,
    srr.project_code,
    p.project_name,
    srr.sample_no,
    srr.letter_date,
    srr.sample_received_date,
    srr.received_date,
    srr.sample_source,
    srr.received_condition,
    srr.sample_location,
    srr.sample_priority,
    srr.status,
    srr.client_name,
    srr.received_by AS receiver_name,
    srr.received_by,
    srr.material_name,
    srr.quantity,
    srr.remarks,
    srr.created_by,
    srr.created_at,
    srr.updated_at
"""

RECEIPT_FROM = f"""
    FROM {RECEIPT_TABLE} srr
    LEFT JOIN projects p ON srr.project_id = p.project_id
"""


def _receipt_lab_filter():
    return "p.lab_id = :lab_id"


def _find_receipt(sample_id, lab_id):
    return db.session.execute(text(f"""
        SELECT srr.{RECEIPT_ID_COL}
        FROM {RECEIPT_TABLE} srr
        JOIN projects p ON srr.project_id = p.project_id
        WHERE srr.{RECEIPT_ID_COL} = :sample_id AND {_receipt_lab_filter()}
    """), {"sample_id": sample_id, "lab_id": lab_id}).fetchone()

def _utc_now():
    return datetime.now(timezone.utc)


ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'}
ALLOWED_DOCUMENT_EXTENSIONS = {'pdf', 'docx', 'xlsx', 'doc', 'xls'}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_DOCUMENT_SIZE = 20 * 1024 * 1024  # 20MB


def _get_lab_name(lab_id):
    lab_result = db.session.execute(text("""
        SELECT email FROM labs WHERE lab_id = :lab_id
    """), {"lab_id": lab_id}).fetchone()
    return lab_result[0].split('@')[0] if lab_result else f"lab_{lab_id}"


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


def _get_next_sr_no(lab_id):
    result = db.session.execute(text(f"""
        SELECT COUNT(*) AS total
        FROM {RECEIPT_TABLE} srr
        JOIN projects p ON srr.project_id = p.project_id
        WHERE {_receipt_lab_filter()}
    """), {"lab_id": lab_id}).fetchone()
    return (result.total if result else 0) + 1


def _generate_sample_no(lab_id, offset=0):
    total = _get_next_sr_no(lab_id) + offset
    return f"SMP-{str(total).zfill(3)}"


def _validate_receipt_fields(data, partial=False):
    errors = {}
    letter_date = data.get('letter_date')
    received_date = data.get('sample_received_date') or data.get('received_date')
    source = (data.get('sample_source') or '').strip()
    condition = (data.get('received_condition') or '').strip()
    status = (data.get('status') or 'Received').strip()
    priority = (data.get('sample_priority') or 'Normal').strip()

    if not partial or 'letter_date' in data:
        if not letter_date:
            errors['letter_date'] = 'Letter Date is required'
        elif not _parse_date(letter_date):
            errors['letter_date'] = 'Invalid letter date format'

    if not partial or 'sample_received_date' in data or 'received_date' in data:
        if not received_date:
            errors['sample_received_date'] = 'Sample Received Date is required'
        elif not _parse_date(received_date):
            errors['sample_received_date'] = 'Invalid date format'

    if not partial or 'sample_source' in data:
        if not source:
            errors['sample_source'] = 'Sample Source is required'
        elif source not in VALID_SAMPLE_SOURCES:
            errors['sample_source'] = 'Invalid sample source'

    if not partial or 'received_condition' in data:
        if not condition:
            errors['received_condition'] = 'Received Condition is required'
        elif condition not in VALID_RECEIVED_CONDITIONS:
            errors['received_condition'] = 'Invalid received condition'

    if not partial or 'status' in data:
        if not status:
            errors['status'] = 'Status is required'
        elif status not in VALID_RECEIPT_STATUSES:
            errors['status'] = 'Invalid status'

    if priority and priority not in VALID_SAMPLE_PRIORITIES:
        errors['sample_priority'] = 'Invalid sample priority'

    return errors


def _extract_receipt_values(data, lab_id=None, for_create=False):
    letter_date = _parse_date(data.get('letter_date'))
    received_date = _parse_date(data.get('sample_received_date') or data.get('received_date'))
    source = (data.get('sample_source') or 'Site').strip()
    condition = (data.get('received_condition') or 'Good').strip()
    location = (data.get('sample_location') or '').strip() or None
    priority = (data.get('sample_priority') or 'Normal').strip()
    status = (data.get('status') or 'Received').strip()

    return {
        'letter_date': letter_date,
        'sample_received_date': received_date,
        'received_date': received_date,
        'sample_source': source,
        'received_condition': condition,
        'sample_location': location,
        'sample_priority': priority,
        'status': status,
    }


def _get_table_columns(table_name):
    rows = db.session.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = :table_name
    """), {"table_name": table_name}).fetchall()
    return {row.column_name for row in rows}


def _normalize_status(status):
    valid = {'draft', 'pending', 'assigned', 'testing', 'completed', 'rejected',
             'in_progress', 'cancelled'}
    normalized = (status or 'pending').strip().lower()
    if normalized == 'in_progress':
        return 'testing'
    return normalized if normalized in valid else 'pending'


def _photos_table_ready():
    columns = _get_table_columns(RECEIPT_PHOTOS_TABLE)
    required_columns = {RECEIPT_ID_COL, "photo_id", "file_name", "file_path"}
    return bool(columns) and required_columns.issubset(columns)


def _fetch_entry_images(sample_id, lab_id):
    if not _photos_table_ready():
        return []

    try:
        columns = _get_table_columns(RECEIPT_PHOTOS_TABLE)
        select_columns = [
            "photo_id",
            RECEIPT_ID_COL,
            "file_name",
            "file_path",
            "file_size" if "file_size" in columns else "NULL AS file_size",
            "mime_type" if "mime_type" in columns else "NULL AS mime_type",
            "created_at" if "created_at" in columns else "NULL AS created_at",
        ]
        order_by = "created_at ASC" if "created_at" in columns else "photo_id ASC"

        rows = db.session.execute(text(f"""
            SELECT {", ".join(select_columns)}
            FROM {RECEIPT_PHOTOS_TABLE}
            WHERE {RECEIPT_ID_COL} = :sample_id
            ORDER BY {order_by}
        """), {"sample_id": sample_id}).fetchall()

        return [{
            "image_id": row.photo_id,
            "photo_id": row.photo_id,
            "sample_entry_id": getattr(row, RECEIPT_ID_COL),
            "sample_id": getattr(row, RECEIPT_ID_COL),
            "file_name": row.file_name,
            "file_path": row.file_path,
            "file_size": row.file_size,
            "mime_type": row.mime_type,
            "created_at": row.created_at.isoformat() if row.created_at else None
        } for row in rows]
    except Exception as image_error:
        logger.warning("Failed to fetch sample receipt images for sample %s: %s", sample_id, image_error)
        return []


def _format_entry(entry, images=None):
    sample_id = getattr(entry, 'sample_entry_id', None) or getattr(entry, 'sample_id', None)
    receiver = getattr(entry, 'received_by', None) or getattr(entry, 'receiver_name', None)
    project_no = getattr(entry, 'project_no', None) or getattr(entry, 'project_code', None)
    sample_received_date = getattr(entry, 'sample_received_date', None) or getattr(entry, 'received_date', None)
    received_date = getattr(entry, 'received_date', None) or sample_received_date
    return {
        "sample_entry_id": sample_id,
        "sample_id": sample_id,
        "sr_no": getattr(entry, 'sr_no', None) or sample_id,
        "lab_id": getattr(entry, 'lab_id', None),
        "project_id": entry.project_id,
        "project_no": project_no,
        "project_code": project_no,
        "project_name": getattr(entry, 'project_name', None),
        "sample_no": getattr(entry, 'sample_no', None),
        "letter_date": _iso_date(getattr(entry, 'letter_date', None)),
        "sample_received_date": _iso_date(sample_received_date),
        "received_date": _iso_date(received_date),
        "sample_source": getattr(entry, 'sample_source', None),
        "received_condition": getattr(entry, 'received_condition', None),
        "sample_location": getattr(entry, 'sample_location', None),
        "sample_priority": getattr(entry, 'sample_priority', None) or 'Normal',
        "client_name": entry.client_name,
        "received_by": receiver,
        "receiver_name": receiver,
        "material_name": entry.material_name,
        "nos": entry.quantity,
        "quantity": entry.quantity,
        "test_performed_by": None,
        "testing_start_date": None,
        "testing_completed_date": None,
        "remarks": entry.remarks,
        "status": getattr(entry, 'status', None) or 'Received',
        "created_by": entry.created_by,
        "updated_by": None,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else None,
        "images": images if images is not None else []
    }


def _get_request_data():
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = {}
        for key in request.form:
            value = request.form.get(key)
            if value == '':
                data[key] = None
            elif key in ('nos', 'quantity', 'sr_no', 'project_id'):
                try:
                    data[key] = int(value) if value is not None else None
                except (TypeError, ValueError):
                    data[key] = value
            else:
                data[key] = value
        return data, request.files.getlist('images')
    return request.get_json() or {}, []


def _save_sample_images(sample_id, lab_id, files):
    if not files or not _photos_table_ready():
        return [], []

    lab_name = _get_lab_name(lab_id)
    upload_dir = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "..", "..", "uploaded", lab_name, "sample_receipts", str(sample_id)
    )
    os.makedirs(upload_dir, exist_ok=True)

    uploaded_files = []
    upload_errors = []
    photo_columns = _get_table_columns(RECEIPT_PHOTOS_TABLE)
    has_lab_id = "lab_id" in photo_columns
    has_created_by = "created_by" in photo_columns

    for file in files:
        if not file or not file.filename:
            continue

        try:
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)

            if file_size > MAX_IMAGE_SIZE:
                upload_errors.append(f"File '{file.filename}' exceeds 10MB limit")
                continue

            if file_size == 0:
                upload_errors.append(f"File '{file.filename}' is empty")
                continue

            filename = secure_filename(file.filename)
            if not filename:
                upload_errors.append(f"Invalid filename: '{file.filename}'")
                continue

            extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
            if extension not in ALLOWED_IMAGE_EXTENSIONS:
                upload_errors.append(f"File type '.{extension}' not allowed for '{filename}'")
                continue

            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            file_path = os.path.join(upload_dir, unique_filename)
            file.save(file_path)

            if not os.path.exists(file_path):
                upload_errors.append(f"Failed to save file: '{filename}'")
                continue

            relative_path = f"uploaded/{lab_name}/sample_receipts/{sample_id}/{unique_filename}"
            mime_type = file.content_type or f"image/{extension}"

            insert_cols = [RECEIPT_ID_COL, "file_name", "file_path", "file_size", "mime_type", "created_at"]
            insert_vals = [
                ":sample_id", ":file_name", ":file_path", ":file_size", ":mime_type", ":created_at"
            ]
            params = {
                "sample_id": sample_id,
                "file_name": filename,
                "file_path": relative_path,
                "file_size": file_size,
                "mime_type": mime_type,
                "created_at": _utc_now(),
            }
            if has_lab_id:
                insert_cols.append("lab_id")
                insert_vals.append(":lab_id")
                params["lab_id"] = lab_id
            if has_created_by:
                insert_cols.append("created_by")
                insert_vals.append(":created_by")
                params["created_by"] = g.jwt_payload.get("user_id")

            result = db.session.execute(text(f"""
                INSERT INTO {RECEIPT_PHOTOS_TABLE} ({", ".join(insert_cols)})
                VALUES ({", ".join(insert_vals)})
                RETURNING photo_id
            """), params).fetchone()

            uploaded_files.append({
                "image_id": result.photo_id,
                "photo_id": result.photo_id,
                "file_name": filename,
                "file_path": relative_path
            })
        except Exception as file_error:
            upload_errors.append(f"Error processing file '{file.filename}': {str(file_error)}")

    return uploaded_files, upload_errors


def _save_sample_documents(sample_entry_id, lab_id, files):
    if not files:
        return [], []

    lab_name = _get_lab_name(lab_id)
    upload_dir = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "..", "..", "uploaded", lab_name, "samples", str(sample_entry_id), "documents"
    )
    os.makedirs(upload_dir, exist_ok=True)

    uploaded_files = []
    upload_errors = []

    for file in files:
        if not file or not file.filename:
            continue

        try:
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)

            if file_size > MAX_DOCUMENT_SIZE:
                upload_errors.append(f"Document '{file.filename}' exceeds 20MB limit")
                continue

            filename = secure_filename(file.filename)
            if not filename:
                upload_errors.append(f"Invalid document filename: '{file.filename}'")
                continue

            extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
            if extension not in ALLOWED_DOCUMENT_EXTENSIONS:
                upload_errors.append(f"Document type '.{extension}' not allowed")
                continue

            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            file_path = os.path.join(upload_dir, unique_filename)
            file.save(file_path)

            relative_path = f"uploaded/{lab_name}/samples/{sample_entry_id}/documents/{unique_filename}"
            mime_type = file.content_type or 'application/octet-stream'

            result = db.session.execute(text("""
                INSERT INTO sample_entry_documents (
                    sample_entry_id, lab_id, file_name, file_path, file_size,
                    mime_type, document_type, created_by, created_at
                ) VALUES (
                    :sample_entry_id, :lab_id, :file_name, :file_path, :file_size,
                    :mime_type, :document_type, :created_by, :created_at
                ) RETURNING document_id
            """), {
                "sample_entry_id": sample_entry_id,
                "lab_id": lab_id,
                "file_name": filename,
                "file_path": relative_path,
                "file_size": file_size,
                "mime_type": mime_type,
                "document_type": extension,
                "created_by": g.jwt_payload.get("user_id"),
                "created_at": _utc_now()
            }).fetchone()

            uploaded_files.append({
                "document_id": result.document_id,
                "file_name": filename
            })
        except Exception as file_error:
            upload_errors.append(f"Error processing document '{file.filename}': {str(file_error)}")

    return uploaded_files, upload_errors


def _save_sample_entry_scope_tests(sample_entry_id, project_id, lab_id, scope_test_ids):
    if not scope_test_ids or not isinstance(scope_test_ids, list):
        return

    cleaned_ids = []
    for scope_id in scope_test_ids:
        try:
            cleaned_ids.append(int(scope_id))
        except (TypeError, ValueError):
            continue

    if not cleaned_ids:
        return

    valid_rows = db.session.execute(text("""
        SELECT project_scope_test_id
        FROM project_scope_tests
        WHERE project_id = :project_id
          AND project_scope_test_id = ANY(:scope_test_ids)
    """), {
        "project_id": project_id,
        "scope_test_ids": cleaned_ids
    }).fetchall()

    valid_ids = [row.project_scope_test_id for row in valid_rows]
    for scope_test_id in valid_ids:
        db.session.execute(text("""
            INSERT INTO sample_entry_scope_tests (
                sample_entry_id, project_scope_test_id, lab_id, created_at, created_by
            ) VALUES (
                :sample_entry_id, :project_scope_test_id, :lab_id, :created_at, :created_by
            )
            ON CONFLICT (sample_entry_id, project_scope_test_id) DO NOTHING
        """), {
            "sample_entry_id": sample_entry_id,
            "project_scope_test_id": scope_test_id,
            "lab_id": lab_id,
            "created_at": _utc_now(),
            "created_by": g.jwt_payload.get("user_id")
        })


def _collect_batch_files(sample_index):
    photos = []
    documents = []
    prefix_photo = f"photo_{sample_index}_"
    prefix_doc = f"doc_{sample_index}_"

    for key in request.files:
        file = request.files.get(key)
        if not file or not file.filename:
            continue
        if key.startswith(prefix_photo):
            photos.append(file)
        elif key.startswith(prefix_doc):
            documents.append(file)

    return photos, documents


# ========================================
# HELPER ENDPOINTS FOR DROPDOWN DATA
# ========================================

# Get material types by category
@sample_entries_bp.route("/material-types/by-category/<int:category_id>", methods=["GET"])
@token_required
def get_material_types_by_category(category_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Validate category exists and belongs to lab
        category_check = db.session.execute(text("""
            SELECT material_category_id FROM material_categories 
            WHERE material_category_id = :material_category_id AND lab_id = :lab_id
        """), {
            "material_category_id": category_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not category_check:
            return jsonify({
                "success": False,
                "message": "Material category not found"
            }), 404
        
        # Get material types for this category
        query = """
            SELECT
                mt.material_type_id,
                mt.type_name,
                mt.description
            FROM material_types mt
            WHERE mt.material_category_id = :material_category_id 
            AND mt.lab_id = :lab_id
            AND mt.status = 'active'
            ORDER BY mt.type_name
        """
        
        types = db.session.execute(text(query), {
            "material_category_id": category_id,
            "lab_id": lab_id
        }).fetchall()
        
        types_data = []
        for type_ in types:
            types_data.append({
                "material_type_id": type_.material_type_id,
                "type_name": type_.type_name,
                "description": type_.description
            })
        
        return jsonify({
            "success": True,
            "data": types_data
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching material types: {str(e)}"
        }), 500


# Get sample grades by category
@sample_entries_bp.route("/sample-grades/by-category/<int:category_id>", methods=["GET"])
@token_required
def get_sample_grades_by_category(category_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Validate category exists and belongs to lab
        category_check = db.session.execute(text("""
            SELECT material_category_id FROM material_categories 
            WHERE material_category_id = :material_category_id AND lab_id = :lab_id
        """), {
            "material_category_id": category_id,
            "lab_id": lab_id
        }).fetchone()
        
        if not category_check:
            return jsonify({
                "success": False,
                "message": "Material category not found"
            }), 404
        
        # Get sample grades for this category
        query = """
            SELECT
                sg.sample_grade_id,
                sg.grade_name,
                sg.grade_description
            FROM sample_grades sg
            LEFT JOIN sample_types st ON sg.sample_type_id = st.sample_type_id
            LEFT JOIN material_types mt ON st.material_type_id = mt.material_type_id
            WHERE (mt.material_category_id = :material_category_id OR sg.sample_type_id IS NULL)
            AND sg.lab_id = :lab_id
            AND sg.status = 'active'
            ORDER BY sg.grade_name
        """
        
        try:
            grades = db.session.execute(text(query), {
                "material_category_id": category_id,
                "lab_id": lab_id
            }).fetchall()
            
            grades_data = []
            for grade in grades:
                grades_data.append({
                    "sample_grade_id": grade.sample_grade_id,
                    "grade_name": grade.grade_name,
                    "grade_description": grade.grade_description
                })
            
            return jsonify({
                "success": True,
                "data": grades_data
            })
            
        except Exception as e:
            # Log error but return empty list instead of 500
            print(f"Error fetching sample grades: {str(e)}")
            return jsonify({
                "success": True,
                "data": []
            })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching sample grades: {str(e)}"
        }), 500


# Get all master data for sample entry form
@sample_entries_bp.route("/master-data", methods=["GET"])
@token_required
def get_sample_master_data():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Get all material categories
        categories_query = """
            SELECT material_category_id, category_name, description
            FROM material_categories
            WHERE lab_id = :lab_id AND status = 'active'
            ORDER BY category_name
        """
        categories = db.session.execute(text(categories_query), {"lab_id": lab_id}).fetchall()
        
        # Get all sample conditions
        conditions_query = """
            SELECT sample_condition_id, condition_name, description
            FROM sample_conditions
            WHERE lab_id = :lab_id AND status = 'active'
            ORDER BY condition_name
        """
        conditions = db.session.execute(text(conditions_query), {"lab_id": lab_id}).fetchall()
        
        # Get all sample locations
        locations_query = """
            SELECT sample_location_id, location_name, description
            FROM sample_locations
            WHERE lab_id = :lab_id AND status = 'active'
            ORDER BY location_name
        """
        locations = db.session.execute(text(locations_query), {"lab_id": lab_id}).fetchall()
        
        # Get all testing days
        days_query = """
            SELECT testing_day_id, day_value, day_label, description
            FROM testing_days
            WHERE lab_id = :lab_id AND status = 'active'
            ORDER BY day_value
        """
        days = db.session.execute(text(days_query), {"lab_id": lab_id}).fetchall()
        
        # Get all material types
        material_types_query = """
            SELECT material_type_id, material_category_id, type_name, description
            FROM material_types
            WHERE lab_id = :lab_id AND status = 'active'
            ORDER BY type_name
        """
        material_types = db.session.execute(text(material_types_query), {"lab_id": lab_id}).fetchall()
        
        # Get all sample grades
        sample_grades_query = """
            SELECT sample_grade_id, sample_type_id, grade_name, grade_description
            FROM sample_grades
            WHERE lab_id = :lab_id AND status = 'active'
            ORDER BY grade_name
        """
        sample_grades = db.session.execute(text(sample_grades_query), {"lab_id": lab_id}).fetchall()
        
        # Format response
        master_data = {
            "material_categories": [
                {
                    "material_category_id": cat.material_category_id,
                    "category_name": cat.category_name,
                    "description": cat.description
                } for cat in categories
            ],
            "material_types": [
                {
                    "material_type_id": mt.material_type_id,
                    "material_category_id": mt.material_category_id,
                    "type_name": mt.type_name,
                    "description": mt.description
                } for mt in material_types
            ],
            "sample_conditions": [
                {
                    "sample_condition_id": cond.sample_condition_id,
                    "condition_name": cond.condition_name,
                    "description": cond.description
                } for cond in conditions
            ],
            "sample_locations": [
                {
                    "sample_location_id": loc.sample_location_id,
                    "location_name": loc.location_name,
                    "description": loc.description
                } for loc in locations
            ],
            "testing_days": [
                {
                    "testing_day_id": day.testing_day_id,
                    "day_value": day.day_value,
                    "day_label": day.day_label,
                    "description": day.description
                } for day in days
            ],
            "sample_grades": [
                {
                    "sample_grade_id": sg.sample_grade_id,
                    "sample_type_id": sg.sample_type_id,
                    "grade_name": sg.grade_name,
                    "grade_description": sg.grade_description
                } for sg in sample_grades
            ]
        }
        
        return jsonify({
            "success": True,
            "data": master_data
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching master data: {str(e)}"
        }), 500


# ========================================
# SAMPLE ENTRIES MANAGEMENT
# ========================================

# Get all sample entries
@sample_entries_bp.route("/next-sample-no", methods=["GET"])
@token_required
def get_next_sample_no():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        return jsonify({
            "success": True,
            "data": {"sample_no": _generate_sample_no(lab_id)}
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error generating sample number: {str(e)}"
        }), 500


@sample_entries_bp.route("/", methods=["GET"])
@token_required
def get_sample_entries():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        search = request.args.get("search", "").strip()
        sample_no = request.args.get("sample_no", "").strip()
        status = request.args.get("status", "").strip()
        priority = request.args.get("priority", "").strip()
        material = request.args.get("material", "").strip()
        date_from = request.args.get("date_from", "").strip()
        date_to = request.args.get("date_to", "").strip()
        project_id = request.args.get("project_id", "").strip()
        sort_by = request.args.get("sort_by", "sr_no").strip()
        sort_order = request.args.get("sort_order", "desc").strip().lower()

        query = f"""
            SELECT
                {RECEIPT_SELECT}
            {RECEIPT_FROM}
            WHERE {_receipt_lab_filter()}
        """

        params = {"lab_id": lab_id}

        if project_id:
            query += " AND srr.project_id = :project_id"
            params["project_id"] = project_id

        if sample_no:
            query += " AND srr.sample_no ILIKE :sample_no"
            params["sample_no"] = f"%{sample_no}%"

        if status:
            query += " AND srr.status = :status"
            params["status"] = status

        if priority:
            query += " AND srr.sample_priority = :priority"
            params["priority"] = priority

        if material:
            query += " AND srr.material_name ILIKE :material"
            params["material"] = f"%{material}%"

        if date_from:
            parsed_from = _parse_date(date_from)
            if parsed_from:
                query += " AND srr.sample_received_date >= :date_from"
                params["date_from"] = parsed_from

        if date_to:
            parsed_to = _parse_date(date_to)
            if parsed_to:
                query += " AND srr.sample_received_date <= :date_to"
                params["date_to"] = parsed_to

        if search:
            query += """
                AND (
                    CAST(srr.sample_id AS TEXT) ILIKE :search OR
                    srr.project_code ILIKE :search OR
                    p.project_code ILIKE :search OR
                    srr.sample_no ILIKE :search OR
                    srr.client_name ILIKE :search OR
                    srr.received_by ILIKE :search OR
                    srr.material_name ILIKE :search OR
                    srr.remarks ILIKE :search
                )
            """
            params["search"] = f"%{search}%"

        order_dir = "DESC" if sort_order != "asc" else "ASC"
        if sort_by in ('sample_priority', 'priority'):
            order_expr = PRIORITY_SORT_SQL
        elif sort_by in SORTABLE_COLUMNS:
            order_expr = SORTABLE_COLUMNS[sort_by]
        else:
            order_expr = "srr.sample_id"

        query += f" ORDER BY {order_expr} {order_dir}, srr.sample_id DESC"

        entries = db.session.execute(text(query), params).fetchall()
        entries_data = [_format_entry(entry) for entry in entries]

        return jsonify({
            "success": True,
            "data": entries_data
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching sample entries: {str(e)}"
        }), 500


# Create sample entry
@sample_entries_bp.route("/", methods=["POST"])
@token_required
def create_sample_receipt():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        user_id = g.jwt_payload.get("user_id")

        data, image_files = _get_request_data()

        required_fields = [
            "project_id",
            "project_code",
            "letter_date",
            "received_date",
            "client_name",
            "material_name",
            "quantity",
            "received_by"
        ]

        for field in required_fields:
            value = data.get(field)
            if field == "project_code" and not value:
                value = data.get("project_no")
            if field == "received_by" and not value:
                value = data.get("receiver_name")
            if not value:
                return jsonify({
                    "success": False,
                    "message": f"{field} is required"
                }), 400

        project_code = data.get("project_code") or data.get("project_no")
        received_by = data.get("received_by") or data.get("receiver_name")
        sample_no = _generate_sample_no(lab_id)
        receipt_values = _extract_receipt_values(data, lab_id=lab_id, for_create=True)

        validation_errors = _validate_receipt_fields({
            **data,
            **receipt_values,
        })
        if validation_errors:
            return jsonify({
                "success": False,
                "message": "Validation failed",
                "errors": validation_errors
            }), 400

        result = db.session.execute(text(f"""
            INSERT INTO {RECEIPT_TABLE} (
                project_id,
                project_code,
                client_name,
                sample_no,
                letter_date,
                sample_received_date,
                received_date,
                sample_source,
                received_condition,
                sample_location,
                sample_priority,
                status,
                material_name,
                quantity,
                received_by,
                remarks,
                created_by,
                created_at,
                updated_at
            )
            VALUES (
                :project_id,
                :project_code,
                :client_name,
                :sample_no,
                :letter_date,
                :sample_received_date,
                :received_date,
                :sample_source,
                :received_condition,
                :sample_location,
                :sample_priority,
                :status,
                :material_name,
                :quantity,
                :received_by,
                :remarks,
                :created_by,
                :created_at,
                :updated_at
            )
            RETURNING {RECEIPT_ID_COL}
        """), {
            "project_id": data.get("project_id"),
            "project_code": project_code,
            "client_name": data.get("client_name"),
            "sample_no": sample_no,
            "material_name": data.get("material_name"),
            "quantity": str(data.get("quantity")),
            "received_by": received_by,
            "remarks": data.get("remarks"),
            "created_by": user_id,
            "created_at": _utc_now(),
            "updated_at": _utc_now(),
            **receipt_values,
        })

        sample_id = result.fetchone()[0]

        uploaded_files = []
        upload_errors = []

        if image_files:
            uploaded_files, upload_errors = _save_sample_images(sample_id, lab_id, image_files)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Sample receipt created successfully",
            "data": {
                "sample_id": sample_id,
                "sample_entry_id": sample_id,
                "sample_no": sample_no,
                "sr_no": sample_id,
                "letter_date": _iso_date(receipt_values['letter_date']),
                "photos": uploaded_files,
                "upload_errors": upload_errors
            }
        }), 201

    except Exception as e:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
    
    
@sample_entries_bp.route("/batch", methods=["POST"])
@token_required
def create_sample_entries_batch():
    try:
        lab_id = g.jwt_payload.get("lab_id")

        if request.content_type and 'multipart/form-data' in request.content_type:
            raw = request.form.get('data', '{}')
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                return jsonify({"success": False, "message": "Invalid batch payload"}), 400
        else:
            data = request.get_json() or {}

        project_id = data.get("project_id")
        samples = data.get("samples", [])
        save_mode = (data.get("save_mode") or "save").strip().lower()

        if not project_id:
            return jsonify({"success": False, "message": "Project is required"}), 400

        try:
            project_id = int(project_id)
        except (TypeError, ValueError):
            return jsonify({"success": False, "message": "Invalid project id"}), 400

        if not samples or not isinstance(samples, list):
            return jsonify({"success": False, "message": "At least one sample is required"}), 400

        project = db.session.execute(text("""
            SELECT p.project_id, p.project_code, p.project_name, c.client_name
            FROM projects p
            LEFT JOIN clients c ON c.client_id = p.client_id
            WHERE p.project_id = :project_id AND p.lab_id = :lab_id
        """), {"project_id": project_id, "lab_id": lab_id}).fetchone()

        if not project:
            return jsonify({"success": False, "message": "Project not found"}), 404

        project_code = data.get("project_no") or project.project_code
        default_client_name = data.get("client_name") or project.client_name or ""
        default_received_date = _parse_date(data.get("received_date")) or date.today()

        if save_mode != "draft":
            for index, sample in enumerate(samples):
                material_name = (sample.get("material_name") or sample.get("sample_name") or "").strip()
                letter_date = _parse_date(sample.get("letter_date"))
                received_date = _parse_date(sample.get("received_date")) or default_received_date
                received_by = (sample.get("received_by") or sample.get("receiver_name") or "").strip()

                if not letter_date:
                    return jsonify({"success": False, "message": f"Letter date is required for sample {index + 1}"}), 400
                if not material_name:
                    return jsonify({"success": False, "message": f"Material is required for sample {index + 1}"}), 400
                if not sample.get("nos") and not sample.get("quantity"):
                    return jsonify({"success": False, "message": f"Quantity is required for sample {index + 1}"}), 400
                if not received_date:
                    return jsonify({"success": False, "message": f"Received date is required for sample {index + 1}"}), 400
                if not received_by:
                    return jsonify({"success": False, "message": f"Receive person is required for sample {index + 1}"}), 400

                receipt_vals = _extract_receipt_values({
                    **sample,
                    'sample_received_date': sample.get('sample_received_date') or sample.get('received_date') or str(default_received_date),
                }, lab_id=lab_id, for_create=True)
                receipt_errors = _validate_receipt_fields({**sample, **receipt_vals}, partial=False)
                if receipt_errors:
                    first_error = next(iter(receipt_errors.values()))
                    return jsonify({
                        "success": False,
                        "message": f"{first_error} (sample {index + 1})",
                        "errors": receipt_errors
                    }), 400

        created_entries = []
        upload_errors = []

        for index, sample in enumerate(samples):
            material_name = (sample.get("material_name") or sample.get("sample_name") or "").strip()
            client_name = (sample.get("client_name") or default_client_name).strip()
            received_by = (sample.get("received_by") or sample.get("receiver_name") or "Lab Reception").strip()
            remarks = sample.get("remarks") or ""
            quantity = str(sample.get("quantity") or sample.get("nos") or 1)
            sample_no = _generate_sample_no(lab_id, index)
            receipt_values = _extract_receipt_values(sample, lab_id=lab_id, for_create=True)

            entry_result = db.session.execute(text(f"""
                INSERT INTO {RECEIPT_TABLE} (
                    project_id,
                    project_code,
                    client_name,
                    sample_no,
                    letter_date,
                    sample_received_date,
                    received_date,
                    sample_source,
                    received_condition,
                    sample_location,
                    sample_priority,
                    status,
                    material_name,
                    quantity,
                    received_by,
                    remarks,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES (
                    :project_id,
                    :project_code,
                    :client_name,
                    :sample_no,
                    :letter_date,
                    :sample_received_date,
                    :received_date,
                    :sample_source,
                    :received_condition,
                    :sample_location,
                    :sample_priority,
                    :status,
                    :material_name,
                    :quantity,
                    :received_by,
                    :remarks,
                    :created_by,
                    :created_at,
                    :updated_at
                )
                RETURNING {RECEIPT_ID_COL}
            """), {
                "project_id": project_id,
                "project_code": project_code,
                "client_name": client_name,
                "sample_no": sample_no,
                "material_name": material_name,
                "quantity": quantity,
                "received_by": received_by,
                "remarks": remarks,
                "created_by": g.jwt_payload.get("user_id"),
                "created_at": _utc_now(),
                "updated_at": _utc_now(),
                **receipt_values,
            })

            sample_id = entry_result.fetchone()[0]

            photos, _documents = _collect_batch_files(index)
            _, photo_errors = _save_sample_images(sample_id, lab_id, photos)
            upload_errors.extend(photo_errors)

            created_entries.append({
                "sample_entry_id": sample_id,
                "sample_id": sample_id,
                "sr_no": sample_id,
                "sample_no": sample_no,
                "letter_date": _iso_date(receipt_values['letter_date']),
            })

        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"{len(created_entries)} sample(s) saved successfully",
            "data": {
                "created_count": len(created_entries),
                "entries": created_entries,
                "upload_errors": upload_errors
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error creating sample entries: {str(e)}"
        }), 500


# Get sample entry scope tests
@sample_entries_bp.route("/<int:sample_entry_id>/scope-tests", methods=["GET"])
@token_required
def get_sample_entry_scope_tests(sample_entry_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Verify sample entry exists and belongs to lab
        entry_check = _find_receipt(sample_entry_id, lab_id)
        
        if not entry_check:
            return jsonify({
                "success": False,
                "message": "Sample entry not found"
            }), 404
        
        return jsonify({
            "success": True,
            "data": []
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching sample entry scope tests: {str(e)}"
        }), 500


# Update sample entry scope tests
@sample_entries_bp.route("/<int:sample_entry_id>/scope-tests", methods=["PUT"])
@token_required
def update_sample_entry_scope_tests(sample_entry_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        entry_check = _find_receipt(sample_entry_id, lab_id)
        
        if not entry_check:
            return jsonify({
                "success": False,
                "message": "Sample entry not found"
            }), 404

        return jsonify({
            "success": True,
            "message": "Sample entry scope tests updated successfully"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error updating sample entry scope tests: {str(e)}"
        }), 500


# Update sample entry
@sample_entries_bp.route("/<int:sample_entry_id>", methods=["PUT"])
@token_required
def update_sample_entry(sample_entry_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data, image_files = _get_request_data()

        existing_entry = _find_receipt(sample_entry_id, lab_id)

        if not existing_entry:
            return jsonify({
                "success": False,
                "message": "Sample entry not found"
            }), 404

        update_fields = []
        params = {
            "sample_id": sample_entry_id,
            "updated_at": _utc_now()
        }

        field_map = {
            "project_code": "project_code",
            "project_no": "project_code",
            "client_name": "client_name",
            "material_name": "material_name",
            "remarks": "remarks",
            "sample_source": "sample_source",
            "received_condition": "received_condition",
            "sample_location": "sample_location",
            "sample_priority": "sample_priority",
            "status": "status",
        }

        validation_payload = {}
        for request_key, column in field_map.items():
            if request_key in data:
                validation_payload[column] = data.get(request_key)

        if "sample_received_date" in data or "received_date" in data:
            validation_payload["sample_received_date"] = data.get("sample_received_date") or data.get("received_date")
        if "letter_date" in data:
            validation_payload["letter_date"] = data.get("letter_date")

        validation_errors = _validate_receipt_fields(validation_payload, partial=True)
        if validation_errors:
            return jsonify({
                "success": False,
                "message": "Validation failed",
                "errors": validation_errors
            }), 400

        for request_key, column in field_map.items():
            if request_key in data:
                if column in params:
                    continue
                update_fields.append(f"{column} = :{column}")
                params[column] = (data.get(request_key) or "").strip()

        if "received_by" in data or "receiver_name" in data:
            update_fields.append("received_by = :received_by")
            params["received_by"] = (data.get("received_by") or data.get("receiver_name") or "").strip()

        if "nos" in data or "quantity" in data:
            update_fields.append("quantity = :quantity")
            params["quantity"] = str(data.get("nos") or data.get("quantity") or "")

        if "project_id" in data:
            project_id = data.get("project_id")
            if project_id in (None, "", "null"):
                return jsonify({
                    "success": False,
                    "message": "Project is required"
                }), 400
            try:
                update_fields.append("project_id = :project_id")
                params["project_id"] = int(project_id)
            except (TypeError, ValueError):
                return jsonify({
                    "success": False,
                    "message": "Invalid project id"
                }), 400

        if "received_date" in data or "sample_received_date" in data:
            parsed = _parse_date(data.get("sample_received_date") or data.get("received_date"))
            if (data.get("sample_received_date") or data.get("received_date")) and not parsed:
                return jsonify({
                    "success": False,
                    "message": "Invalid received date format"
                }), 400
            update_fields.append("sample_received_date = :sample_received_date")
            update_fields.append("received_date = :received_date")
            params["sample_received_date"] = parsed
            params["received_date"] = parsed

        if "letter_date" in data:
            parsed_letter_date = _parse_date(data.get("letter_date"))
            if data.get("letter_date") and not parsed_letter_date:
                return jsonify({
                    "success": False,
                    "message": "Invalid letter date format"
                }), 400
            update_fields.append("letter_date = :letter_date")
            params["letter_date"] = parsed_letter_date

        remove_image_ids = data.get("remove_image_ids", [])
        if isinstance(remove_image_ids, str):
            try:
                remove_image_ids = json.loads(remove_image_ids)
            except json.JSONDecodeError:
                remove_image_ids = []

        if remove_image_ids and _photos_table_ready():
            for image_id in remove_image_ids:
                image_row = db.session.execute(text(f"""
                    SELECT photo_id, file_path FROM {RECEIPT_PHOTOS_TABLE}
                    WHERE photo_id = :photo_id
                      AND {RECEIPT_ID_COL} = :sample_id
                """), {
                    "photo_id": image_id,
                    "sample_id": sample_entry_id,
                }).fetchone()

                if image_row:
                    absolute_path = os.path.join(
                        os.path.dirname(os.path.dirname(__file__)),
                        "..", "..", image_row.file_path.replace('/', os.sep)
                    )
                    if os.path.exists(absolute_path):
                        os.remove(absolute_path)

                    db.session.execute(text(f"""
                        DELETE FROM {RECEIPT_PHOTOS_TABLE}
                        WHERE photo_id = :photo_id
                    """), {
                        "photo_id": image_id,
                    })

        uploaded_files = []
        upload_errors = []

        if update_fields:
            update_query = f"""
                UPDATE {RECEIPT_TABLE}
                SET {', '.join(update_fields)}, updated_at = :updated_at
                WHERE {RECEIPT_ID_COL} = :sample_id
            """
            db.session.execute(text(update_query), params)
        elif not image_files and not remove_image_ids:
            return jsonify({
                "success": False,
                "message": "No fields to update"
            }), 400

        if image_files:
            uploaded_files, upload_errors = _save_sample_images(sample_entry_id, lab_id, image_files)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Sample entry updated successfully",
            "data": {
                "uploaded_images": uploaded_files,
                "upload_errors": upload_errors
            }
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error updating sample entry: {str(e)}"
        }), 500


# Delete sample entry
@sample_entries_bp.route("/<int:sample_entry_id>", methods=["DELETE"])
@token_required
def delete_sample_entry(sample_entry_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        
        # Check if sample entry exists and belongs to lab
        existing_entry = _find_receipt(sample_entry_id, lab_id)
        
        if not existing_entry:
            return jsonify({
                "success": False,
                "message": "Sample entry not found"
            }), 404
        
        db.session.execute(text(f"""
            DELETE FROM {RECEIPT_TABLE}
            WHERE {RECEIPT_ID_COL} = :sample_id
        """), {
            "sample_id": sample_entry_id,
        })
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Sample entry deleted successfully"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error deleting sample entry: {str(e)}"
        }), 500


# Get sample entry by ID
@sample_entries_bp.route("/<int:sample_entry_id>", methods=["GET"])
@token_required
def get_sample_entry_by_id(sample_entry_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")

        query = f"""
            SELECT
                {RECEIPT_SELECT}
            {RECEIPT_FROM}
            WHERE srr.{RECEIPT_ID_COL} = :sample_id AND {_receipt_lab_filter()}
        """

        result = db.session.execute(text(query), {
            "sample_id": sample_entry_id,
            "lab_id": lab_id
        }).fetchone()

        if not result:
            return jsonify({
                "success": False,
                "message": "Sample entry not found"
            }), 404

        images = _fetch_entry_images(sample_entry_id, lab_id)

        return jsonify({
            "success": True,
            "data": _format_entry(result, images=images)
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching sample entry: {str(e)}"
        }), 500


@sample_entries_bp.route("/<int:sample_entry_id>/status", methods=["PATCH"])
@token_required
def update_sample_receipt_status(sample_entry_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")
        data = request.get_json() or {}

        existing_entry = _find_receipt(sample_entry_id, lab_id)
        if not existing_entry:
            return jsonify({
                "success": False,
                "message": "Sample entry not found"
            }), 404

        status = (data.get("status") or "").strip()
        validation_errors = _validate_receipt_fields({"status": status}, partial=True)
        if validation_errors:
            return jsonify({
                "success": False,
                "message": validation_errors.get("status", "Invalid status"),
                "errors": validation_errors
            }), 400

        db.session.execute(text(f"""
            UPDATE {RECEIPT_TABLE}
            SET status = :status, updated_at = :updated_at
            WHERE {RECEIPT_ID_COL} = :sample_id
        """), {
            "status": status,
            "updated_at": _utc_now(),
            "sample_id": sample_entry_id,
        })
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Status updated successfully",
            "data": {"status": status}
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Error updating status: {str(e)}"
        }), 500


@sample_entries_bp.route("/<int:sample_entry_id>/images/<int:image_id>/view", methods=["GET"])
@token_required
def view_sample_entry_image(sample_entry_id, image_id):
    try:
        lab_id = g.jwt_payload.get("lab_id")

        if not _photos_table_ready():
            return jsonify({
                "success": False,
                "message": "Image not found"
            }), 404

        image_row = db.session.execute(text(f"""
            SELECT file_path, file_name, mime_type
            FROM {RECEIPT_PHOTOS_TABLE}
            WHERE photo_id = :photo_id
              AND {RECEIPT_ID_COL} = :sample_id
        """), {
            "photo_id": image_id,
            "sample_id": sample_entry_id,
        }).fetchone()

        if not image_row:
            return jsonify({
                "success": False,
                "message": "Image not found"
            }), 404

        absolute_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "..", "..", image_row.file_path.replace('/', os.sep)
        )

        if not os.path.exists(absolute_path):
            return jsonify({
                "success": False,
                "message": "Image file not found on server"
            }), 404

        return send_file(
            absolute_path,
            mimetype=image_row.mime_type or 'application/octet-stream',
            download_name=image_row.file_name
        )

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error viewing image: {str(e)}"
        }), 500
