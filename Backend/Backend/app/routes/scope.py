from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import text
from app.extensions import db
from app.utils.auth_decorator import token_required

scope_bp = Blueprint("scope", __name__)

def _utc_now():
    return datetime.now(timezone.utc)

@scope_bp.route("/groups", methods=["GET"])
@token_required
def get_scope_groups():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        scope_type = request.args.get("scope_type", "").strip()

        query = """
            SELECT
                sg.group_id,
                sg.lab_id,
                sg.testing_scope_type,
                sg.group_name,
                sg.sort_order,
                sg.created_by,
                sg.updated_by,
                sg.created_at,
                sg.updated_at
            FROM scope_groups sg
            WHERE sg.lab_id = :lab_id
        """

        params = {"lab_id": lab_id}

        if scope_type:
            query += " AND sg.testing_scope_type = :scope_type"
            params["scope_type"] = scope_type

        query += " ORDER BY sg.testing_scope_type, sg.sort_order, sg.group_name"

        result = db.session.execute(text(query), params).mappings().all()

        return jsonify({
            "success": True,
            "message": "Scope groups fetched successfully",
            "data": [dict(row) for row in result]
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to fetch scope groups",
            "errors": {"server": [str(e)]}
        }), 500

@scope_bp.route("/materials", methods=["GET"])
@token_required
def get_scope_materials():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        group_id = request.args.get("group_id", "").strip()

        query = """
            SELECT
                sm.material_id,
                sm.lab_id,
                sm.group_id,
                sm.material_name,
                sm.sort_order,
                sm.created_by,
                sm.updated_by,
                sm.created_at,
                sm.updated_at,
                sg.group_name,
                sg.testing_scope_type
            FROM scope_materials sm
            JOIN scope_groups sg ON sg.group_id = sm.group_id
            WHERE sm.lab_id = :lab_id
        """

        params = {"lab_id": lab_id}

        if group_id:
            query += " AND sm.group_id = :group_id"
            params["group_id"] = int(group_id)

        query += " ORDER BY sg.testing_scope_type, sg.sort_order, sm.sort_order, sm.material_name"

        result = db.session.execute(text(query), params).mappings().all()

        return jsonify({
            "success": True,
            "message": "Scope materials fetched successfully",
            "data": [dict(row) for row in result]
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to fetch scope materials",
            "errors": {"server": [str(e)]}
        }), 500

@scope_bp.route("/tests", methods=["GET"])
@token_required
def get_scope_tests():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        group_id = request.args.get("group_id", "").strip()
        material_id = request.args.get("material_id", "").strip()
        is_active = request.args.get("is_active", "").strip()

        query = """
            SELECT
                st.scope_test_id,
                st.lab_id,
                st.group_id,
                st.material_id,
                st.test_name,
                st.test_method,
                st.sort_order,
                st.is_active,
                st.created_by,
                st.updated_by,
                st.created_at,
                st.updated_at,
                sg.group_name,
                sg.testing_scope_type,
                sm.material_name
            FROM scope_tests st
            JOIN scope_groups sg ON sg.group_id = st.group_id
            JOIN scope_materials sm ON sm.material_id = st.material_id
            WHERE st.lab_id = :lab_id
        """

        params = {"lab_id": lab_id}

        if group_id:
            query += " AND st.group_id = :group_id"
            params["group_id"] = int(group_id)

        if material_id:
            query += " AND st.material_id = :material_id"
            params["material_id"] = int(material_id)

        if is_active:
            query += " AND st.is_active = :is_active"
            params["is_active"] = is_active.lower() == 'true'

        query += " ORDER BY sg.testing_scope_type, sg.sort_order, sm.sort_order, st.sort_order, st.test_name"

        result = db.session.execute(text(query), params).mappings().all()

        return jsonify({
            "success": True,
            "message": "Scope tests fetched successfully",
            "data": [dict(row) for row in result]
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to fetch scope tests",
            "errors": {"server": [str(e)]}
        }), 500

@scope_bp.route("/hierarchy", methods=["GET"])
@token_required
def get_scope_hierarchy():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        scope_type = request.args.get("scope_type", "").strip()

        # Get groups with materials and tests
        query = """
            SELECT
                sg.group_id,
                sg.testing_scope_type,
                sg.group_name as group_name,
                sg.sort_order as group_sort_order,
                sm.material_id,
                sm.material_name,
                sm.sort_order as material_sort_order,
                st.scope_test_id,
                st.test_name,
                st.test_method,
                st.sort_order as test_sort_order,
                st.is_active
            FROM scope_groups sg
            LEFT JOIN scope_materials sm ON sm.group_id = sg.group_id
            LEFT JOIN scope_tests st ON st.material_id = sm.material_id
            WHERE sg.lab_id = :lab_id
        """

        params = {"lab_id": lab_id}

        if scope_type:
            query += " AND sg.testing_scope_type = :scope_type"
            params["scope_type"] = scope_type

        query += " ORDER BY sg.testing_scope_type, sg.sort_order, sm.sort_order, st.sort_order"

        result = db.session.execute(text(query), params).mappings().all()

        # Build hierarchy structure
        hierarchy = {}
        for row in result:
            group_id = row['group_id']
            material_id = row['material_id']
            
            # Initialize group if not exists
            if group_id not in hierarchy:
                hierarchy[group_id] = {
                    'group_id': group_id,
                    'testing_scope_type': row['testing_scope_type'],
                    'group_name': row['group_name'],
                    'sort_order': row['group_sort_order'],
                    'materials': {}
                }
            
            # Initialize material if not exists and material_id is not null
            if material_id and material_id not in hierarchy[group_id]['materials']:
                hierarchy[group_id]['materials'][material_id] = {
                    'material_id': material_id,
                    'material_name': row['material_name'],
                    'sort_order': row['material_sort_order'],
                    'tests': []
                }
            
            # Add test if test exists
            if row['scope_test_id'] and material_id:
                hierarchy[group_id]['materials'][material_id]['tests'].append({
                    'scope_test_id': row['scope_test_id'],
                    'test_name': row['test_name'],
                    'test_method': row['test_method'],
                    'sort_order': row['test_sort_order'],
                    'is_active': row['is_active']
                })

        # Convert to list format
        hierarchy_list = []
        for group_data in hierarchy.values():
            materials_list = []
            for material_data in group_data['materials'].values():
                materials_list.append(material_data)
            group_data['materials'] = materials_list
            hierarchy_list.append(group_data)

        return jsonify({
            "success": True,
            "message": "Scope hierarchy fetched successfully",
            "data": hierarchy_list
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to fetch scope hierarchy",
            "errors": {"server": [str(e)]}
        }), 500


@scope_bp.route("/groups", methods=["POST"])
@token_required
def create_scope_group():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        user_id = g.jwt_payload.get("user_id")
        data = request.get_json()

        # Validate required fields
        testing_scope_type = data.get("testing_scope_type")
        group_name = data.get("group_name")
        sort_order = data.get("sort_order", 0)

        if not testing_scope_type or not group_name:
            return jsonify({
                "success": False,
                "message": "testing_scope_type and group_name are required",
                "errors": {"validation": ["Missing required fields"]}
            }), 400

        if testing_scope_type not in ['permanent_testing', 'site_testing']:
            return jsonify({
                "success": False,
                "message": "testing_scope_type must be 'permanent_testing' or 'site_testing'",
                "errors": {"validation": ["Invalid testing_scope_type"]}
            }), 400

        # Check if group already exists for this lab
        existing = db.session.execute(text("""
            SELECT group_id FROM scope_groups 
            WHERE lab_id = :lab_id 
              AND testing_scope_type = :testing_scope_type 
              AND group_name = :group_name
        """), {
            "lab_id": lab_id,
            "testing_scope_type": testing_scope_type,
            "group_name": group_name
        }).fetchone()

        if existing:
            return jsonify({
                "success": False,
                "message": "Scope group already exists",
                "errors": {"duplicate": ["Group with this name already exists"]}
            }), 409

        # Create new scope group
        result = db.session.execute(text("""
            INSERT INTO scope_groups (
                lab_id, testing_scope_type, group_name, sort_order, 
                created_by, updated_by, created_at, updated_at
            ) VALUES (
                :lab_id, :testing_scope_type, :group_name, :sort_order,
                :user_id, :user_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            ) RETURNING group_id, testing_scope_type, group_name, sort_order, created_at
        """), {
            "lab_id": lab_id,
            "testing_scope_type": testing_scope_type,
            "group_name": group_name,
            "sort_order": sort_order,
            "user_id": user_id
        })

        db.session.commit()
        new_group = result.fetchone()

        return jsonify({
            "success": True,
            "message": "Scope group created successfully",
            "data": {
                "group_id": new_group.group_id,
                "testing_scope_type": new_group.testing_scope_type,
                "group_name": new_group.group_name,
                "sort_order": new_group.sort_order,
                "created_at": new_group.created_at.isoformat()
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to create scope group",
            "errors": {"server": [str(e)]}
        }), 500


@scope_bp.route("/materials", methods=["POST"])
@token_required
def create_scope_material():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        user_id = g.jwt_payload.get("user_id")
        data = request.get_json()

        # Validate required fields
        group_id = data.get("group_id")
        material_name = data.get("material_name")
        sort_order = data.get("sort_order", 0)

        if not group_id or not material_name:
            return jsonify({
                "success": False,
                "message": "group_id and material_name are required",
                "errors": {"validation": ["Missing required fields"]}
            }), 400

        # Verify group belongs to this lab
        group = db.session.execute(text("""
            SELECT group_id FROM scope_groups 
            WHERE group_id = :group_id AND lab_id = :lab_id
        """), {
            "group_id": group_id,
            "lab_id": lab_id
        }).fetchone()

        if not group:
            return jsonify({
                "success": False,
                "message": "Invalid group_id or group not found",
                "errors": {"validation": ["Group not found or access denied"]}
            }), 404

        # Check if material already exists for this group
        existing = db.session.execute(text("""
            SELECT material_id FROM scope_materials 
            WHERE group_id = :group_id AND material_name = :material_name
        """), {
            "group_id": group_id,
            "material_name": material_name
        }).fetchone()

        if existing:
            return jsonify({
                "success": False,
                "message": "Material already exists in this group",
                "errors": {"duplicate": ["Material with this name already exists"]}
            }), 409

        # Create new scope material
        result = db.session.execute(text("""
            INSERT INTO scope_materials (
                lab_id, group_id, material_name, sort_order,
                created_by, updated_by, created_at, updated_at
            ) VALUES (
                :lab_id, :group_id, :material_name, :sort_order,
                :user_id, :user_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            ) RETURNING material_id, group_id, material_name, sort_order, created_at
        """), {
            "lab_id": lab_id,
            "group_id": group_id,
            "material_name": material_name,
            "sort_order": sort_order,
            "user_id": user_id
        })

        db.session.commit()
        new_material = result.fetchone()

        return jsonify({
            "success": True,
            "message": "Scope material created successfully",
            "data": {
                "material_id": new_material.material_id,
                "group_id": new_material.group_id,
                "material_name": new_material.material_name,
                "sort_order": new_material.sort_order,
                "created_at": new_material.created_at.isoformat()
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to create scope material",
            "errors": {"server": [str(e)]}
        }), 500


@scope_bp.route("/tests", methods=["POST"])
@token_required
def create_scope_test():
    try:
        lab_id = g.jwt_payload.get("lab_id")
        user_id = g.jwt_payload.get("user_id")
        data = request.get_json()

        # Validate required fields
        group_id = data.get("group_id")
        material_id = data.get("material_id")
        test_name = data.get("test_name")
        test_method = data.get("test_method")
        sort_order = data.get("sort_order", 0)
        is_active = data.get("is_active", True)

        if not all([group_id, material_id, test_name, test_method]):
            return jsonify({
                "success": False,
                "message": "group_id, material_id, test_name, and test_method are required",
                "errors": {"validation": ["Missing required fields"]}
            }), 400

        # Verify material belongs to this lab
        material = db.session.execute(text("""
            SELECT sm.material_id, sm.group_id 
            FROM scope_materials sm
            JOIN scope_groups sg ON sg.group_id = sm.group_id
            WHERE sm.material_id = :material_id 
              AND sm.group_id = :group_id
              AND sg.lab_id = :lab_id
        """), {
            "material_id": material_id,
            "group_id": group_id,
            "lab_id": lab_id
        }).fetchone()

        if not material:
            return jsonify({
                "success": False,
                "message": "Invalid material_id or material not found",
                "errors": {"validation": ["Material not found or access denied"]}
            }), 404

        # Check if test already exists for this material
        existing = db.session.execute(text("""
            SELECT scope_test_id FROM scope_tests 
            WHERE material_id = :material_id 
              AND test_name = :test_name 
              AND test_method = :test_method
        """), {
            "material_id": material_id,
            "test_name": test_name,
            "test_method": test_method
        }).fetchone()

        if existing:
            return jsonify({
                "success": False,
                "message": "Test already exists for this material",
                "errors": {"duplicate": ["Test with this name and method already exists"]}
            }), 409

        # Create new scope test
        result = db.session.execute(text("""
            INSERT INTO scope_tests (
                lab_id, group_id, material_id, test_name, test_method, 
                sort_order, is_active, created_by, updated_by, created_at, updated_at
            ) VALUES (
                :lab_id, :group_id, :material_id, :test_name, :test_method,
                :sort_order, :is_active, :user_id, :user_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            ) RETURNING scope_test_id, group_id, material_id, test_name, test_method, 
                      sort_order, is_active, created_at
        """), {
            "lab_id": lab_id,
            "group_id": group_id,
            "material_id": material_id,
            "test_name": test_name,
            "test_method": test_method,
            "sort_order": sort_order,
            "is_active": is_active,
            "user_id": user_id
        })

        db.session.commit()
        new_test = result.fetchone()

        return jsonify({
            "success": True,
            "message": "Scope test created successfully",
            "data": {
                "scope_test_id": new_test.scope_test_id,
                "group_id": new_test.group_id,
                "material_id": new_test.material_id,
                "test_name": new_test.test_name,
                "test_method": new_test.test_method,
                "sort_order": new_test.sort_order,
                "is_active": new_test.is_active,
                "created_at": new_test.created_at.isoformat()
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to create scope test",
            "errors": {"server": [str(e)]}
        }), 500
