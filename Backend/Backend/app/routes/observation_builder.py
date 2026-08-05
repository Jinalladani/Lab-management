# pyrefly: ignore [missing-import]
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.observation_template import ObservationTemplate
from datetime import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy import text
import json

observation_builder_bp = Blueprint('observation_builder', __name__)

@observation_builder_bp.route('/templates', methods=['GET'])
def get_all_templates():
    try:
        # Fetch all templates including sections_data
        query = """
            SELECT ot.template_id, ot.name, ot.scope_test_ids, ot.version, ot.status,
                   ot.sheets_data, ot.sections_data, ot.merges_data, ot.created_at, ot.updated_at
            FROM observation_templates ot
            ORDER BY ot.updated_at DESC
        """
        result = db.session.execute(text(query)).mappings().all()
        
        # Fetch all scope tests to map names/methods dynamically
        scope_tests = db.session.execute(text("SELECT scope_test_id, test_name, test_method FROM scope_tests")).mappings().all()
        scope_map = {row['scope_test_id']: row for row in scope_tests}
        
        serialized = []
        for row in result:
            d = dict(row)
            if d.get('created_at'):
                d['created_at'] = d['created_at'].isoformat()
            if d.get('updated_at'):
                d['updated_at'] = d['updated_at'].isoformat()
            
            # Parse scope_test_ids safely
            if isinstance(d.get('scope_test_ids'), str):
                try:
                    d['scope_test_ids'] = json.loads(d['scope_test_ids'])
                except:
                    d['scope_test_ids'] = []
            elif d.get('scope_test_ids') is None:
                d['scope_test_ids'] = []

            # Parse sections_data safely
            if isinstance(d.get('sections_data'), str):
                try:
                    d['sections_data'] = json.loads(d['sections_data'])
                except:
                    d['sections_data'] = []
            elif d.get('sections_data') is None:
                d['sections_data'] = []
            
            # Populate display fields from first test in list
            if d['scope_test_ids']:
                first_test_id = d['scope_test_ids'][0]
                test_info = scope_map.get(first_test_id)
                if test_info:
                    d['test_name'] = test_info['test_name']
                    d['test_method'] = test_info['test_method']
                else:
                    d['test_name'] = "Multiple Tests"
                    d['test_method'] = ""
            else:
                d['test_name'] = "No Mapped Test"
                d['test_method'] = ""
                
            serialized.append(d)

        return jsonify({
            'success': True,
            'data': serialized
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"Failed to retrieve templates: {str(e)}"
        }), 500


@observation_builder_bp.route('/templates/<int:template_id>', methods=['GET'])
def get_template(template_id):
    try:
        template = ObservationTemplate.query.get(template_id)
        if not template:
            return jsonify({
                'success': False,
                'message': "Template not found"
            }), 404
        return jsonify({
            'success': True,
            'data': template.to_dict()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"Failed to retrieve template: {str(e)}"
        }), 500


@observation_builder_bp.route('/templates', methods=['POST'])
def create_template():
    try:
        data = request.get_json() or {}
        name = data.get('name') or data.get('title')
        scope_test_ids = data.get('scope_test_ids') or []
        sections_data = data.get('sections_data') or data.get('sections') or []
        sheets_data = data.get('sheets_data') or {}
        
        if not name:
            return jsonify({
                'success': False,
                'message': "Template name is required"
            }), 400

        new_template = ObservationTemplate(
            name=name,
            scope_test_ids=scope_test_ids,
            version=data.get('version', '1.0.0'),
            status=data.get('status', 'Active'),
            sheets_data=sheets_data,
            sections_data=sections_data,
            merges_data=data.get('merges_data', [])
        )
        
        db.session.add(new_template)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': "Observation template created successfully",
            'data': new_template.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f"Failed to create template: {str(e)}"
        }), 500


@observation_builder_bp.route('/templates/<int:template_id>', methods=['PUT'])
def update_template(template_id):
    try:
        template = ObservationTemplate.query.get(template_id)
        if not template:
            return jsonify({
                'success': False,
                'message': "Template not found"
            }), 404
            
        data = request.get_json() or {}
        
        if 'name' in data or 'title' in data:
            template.name = data.get('name') or data.get('title')
        if 'scope_test_ids' in data:
            template.scope_test_ids = data['scope_test_ids'] or []
        if 'version' in data:
            template.version = data['version']
        if 'status' in data:
            template.status = data['status']
        if 'sections_data' in data or 'sections' in data:
            template.sections_data = data.get('sections_data') or data.get('sections') or []
        if 'sheets_data' in data:
            template.sheets_data = data['sheets_data']
        if 'merges_data' in data:
            template.merges_data = data['merges_data']

        template.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': "Observation template updated successfully",
            'data': template.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f"Failed to update template: {str(e)}"
        }), 500


@observation_builder_bp.route('/templates/<int:template_id>', methods=['DELETE'])
def delete_template(template_id):
    try:
        template = ObservationTemplate.query.get(template_id)
        if not template:
            return jsonify({
                'success': False,
                'message': "Template not found"
            }), 404
            
        db.session.delete(template)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': "Observation template deleted successfully"
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f"Failed to delete template: {str(e)}"
        }), 500
