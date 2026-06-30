# pyrefly: ignore [missing-import]
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.sample_observation import SampleObservation
from datetime import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy import text

sample_observations_bp = Blueprint('sample_observations', __name__)

@sample_observations_bp.route('', methods=['GET'])
def get_all_observations():
    try:
        # Join sample_observations with projects and sample_receipt_register for dynamic info
        query = """
            SELECT so.*, p.project_name, p.project_code, srr.sample_no
            FROM sample_observations so
            LEFT JOIN projects p ON so.project_id = p.project_id
            LEFT JOIN sample_receipt_register srr ON so.sample_id = srr.sample_id
            ORDER BY so.updated_at DESC
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
            'message': f"Failed to retrieve observations list: {str(e)}"
        }), 500


@sample_observations_bp.route('/<int:observation_id>', methods=['GET'])
def get_observation(observation_id):
    try:
        obs = SampleObservation.query.get(observation_id)
        if not obs:
            return jsonify({
                'success': False,
                'message': "Observation record not found"
            }), 404
        return jsonify({
            'success': True,
            'data': obs.to_dict()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"Failed to retrieve observation: {str(e)}"
        }), 500


@sample_observations_bp.route('', methods=['POST'])
def create_observation():
    try:
        data = request.get_json() or {}
        project_id = data.get('project_id')
        sample_id = data.get('sample_id')
        scope_test_id = data.get('scope_test_id')
        test_name = data.get('test_name')
        
        if not project_id or not sample_id or not scope_test_id or not test_name:
            return jsonify({
                'success': False,
                'message': "project_id, sample_id, scope_test_id, and test_name are required fields"
            }), 400

        new_obs = SampleObservation(
            project_id=int(project_id),
            sample_id=int(sample_id),
            scope_test_id=int(scope_test_id),
            test_name=test_name,
            test_method=data.get('test_method', ''),
            operator_name=data.get('operator_name', 'Lab Technician'),
            sheets_data=data.get('sheets_data', {}),
            merges_data=data.get('merges_data', []),
            status=data.get('status', 'Draft')
        )
        
        db.session.add(new_obs)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': "Observation entry registered successfully",
            'data': new_obs.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f"Failed to create observation record: {str(e)}"
        }), 500


@sample_observations_bp.route('/<int:observation_id>', methods=['PUT'])
def update_observation(observation_id):
    try:
        obs = SampleObservation.query.get(observation_id)
        if not obs:
            return jsonify({
                'success': False,
                'message': "Observation record not found"
            }), 404
            
        data = request.get_json() or {}
        
        if 'project_id' in data:
            obs.project_id = int(data['project_id'])
        if 'sample_id' in data:
            obs.sample_id = int(data['sample_id'])
        if 'scope_test_id' in data:
            obs.scope_test_id = int(data['scope_test_id'])
        if 'test_name' in data:
            obs.test_name = data['test_name']
        if 'test_method' in data:
            obs.test_method = data['test_method']
        if 'operator_name' in data:
            obs.operator_name = data['operator_name']
        if 'sheets_data' in data:
            obs.sheets_data = data['sheets_data']
        if 'merges_data' in data:
            obs.merges_data = data['merges_data']
        if 'status' in data:
            obs.status = data['status']
            
        obs.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': "Observation record updated successfully",
            'data': obs.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f"Failed to update observation: {str(e)}"
        }), 500


@sample_observations_bp.route('/<int:observation_id>', methods=['DELETE'])
def delete_observation(observation_id):
    try:
        obs = SampleObservation.query.get(observation_id)
        if not obs:
            return jsonify({
                'success': False,
                'message': "Observation record not found"
            }), 404
            
        db.session.delete(obs)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': "Observation record deleted successfully"
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f"Failed to delete observation record: {str(e)}"
        }), 500
