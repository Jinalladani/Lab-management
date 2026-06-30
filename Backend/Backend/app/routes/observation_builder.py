from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.observation_template import ObservationTemplate
from datetime import datetime
from sqlalchemy import text

observation_builder_bp = Blueprint('observation_builder', __name__)

@observation_builder_bp.route('/templates', methods=['GET'])
def get_all_templates():
    try:
        # Join with scope_tests to fetch the real test_name and test_method dynamically
        query = """
            SELECT ot.template_id, ot.name, ot.scope_test_id, ot.version, ot.status,
                   ot.sheets_data, ot.merges_data, ot.created_at, ot.updated_at,
                   st.test_name, st.test_method
            FROM observation_templates ot
            LEFT JOIN scope_tests st ON ot.scope_test_id = st.scope_test_id
            ORDER BY ot.updated_at DESC
        """
        result = db.session.execute(text(query)).mappings().all()
        
        serialized = []
        for row in result:
            d = dict(row)
            if d.get('created_at'):
                d['created_at'] = d['created_at'].isoformat()
            if d.get('updated_at'):
                d['updated_at'] = d['updated_at'].isoformat()
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
        name = data.get('name')
        scope_test_id = data.get('scope_test_id')
        
        if not name or not scope_test_id:
            return jsonify({
                'success': False,
                'message': "Template name and scope_test_id are required fields"
            }), 400

        new_template = ObservationTemplate(
            name=name,
            scope_test_id=int(scope_test_id),
            version=data.get('version', '1.0.0'),
            status=data.get('status', 'Draft'),
            sheets_data=data.get('sheets_data', {}),
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
        
        if 'name' in data:
            template.name = data['name']
        if 'scope_test_id' in data:
            template.scope_test_id = int(data['scope_test_id'])
        if 'version' in data:
            template.version = data['version']
        if 'status' in data:
            template.status = data['status']
        if 'sheets_data' in data:
            template.sheets_data = data['sheets_data']
        if 'merges_data' in data:
            template.merges_data = data['merges_data']
            
        template.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': "Template updated successfully",
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
            'message': "Template deleted successfully"
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f"Failed to delete template: {str(e)}"
        }), 500
