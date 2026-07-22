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
        project_id = request.args.get("project_id", "").strip()
        # Join sample_observations with projects and sample_receipt_register for dynamic info
        query = """
            SELECT so.*, p.project_name, p.project_code, srr.sample_no
            FROM sample_observations so
            LEFT JOIN projects p ON so.project_id = p.project_id
            LEFT JOIN sample_receipt_register srr ON so.sample_id = srr.sample_id
        """
        params = {}
        if project_id:
            query += " WHERE so.project_id = :project_id"
            params["project_id"] = project_id
            
        query += " ORDER BY so.updated_at DESC"
        result = db.session.execute(text(query), params).mappings().all()
        
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
        template_id = data.get('template_id')
        scope_test_id = data.get('scope_test_id')
        test_name = data.get('test_name')
        
        if not project_id or not sample_id or not test_name:
            return jsonify({
                'success': False,
                'message': "project_id, sample_id, and test_name are required fields"
            }), 400

        # Prevent duplicate entries for the same sample and observation sheet template
        if template_id:
            existing = SampleObservation.query.filter_by(
                sample_id=int(sample_id),
                template_id=int(template_id)
            ).first()
            if existing:
                return jsonify({
                    'success': False,
                    'message': "An observation record already exists for this sample and template"
                }), 409
        elif scope_test_id:
            existing = SampleObservation.query.filter_by(
                sample_id=int(sample_id),
                scope_test_id=int(scope_test_id)
            ).first()
            if existing:
                return jsonify({
                    'success': False,
                    'message': "An observation record already exists for this sample and test"
                }), 409

        eq_id = data.get('equipment_id')
        eq_validity = None
        if data.get('equipment_validity_date'):
            eq_validity = datetime.strptime(data['equipment_validity_date'], "%Y-%m-%d").date()

        new_obs = SampleObservation(
            project_id=int(project_id),
            sample_id=int(sample_id),
            scope_test_id=int(scope_test_id) if scope_test_id else None,
            template_id=int(template_id) if template_id else None,
            test_name=test_name,
            test_method=data.get('test_method', ''),
            operator_name=data.get('operator_name', 'Lab Technician'),
            sheets_data=data.get('sheets_data', {}),
            merges_data=data.get('merges_data', []),
            status=data.get('status', 'Draft'),
            equipment_id=eq_id,
            equipment_name=data.get('equipment_name'),
            equipment_cert_no=data.get('equipment_cert_no'),
            equipment_validity_date=eq_validity
        )
        
        db.session.add(new_obs)
        db.session.commit()

        if eq_id:
            lab_id_query = text("SELECT lab_id FROM projects WHERE project_id = :project_id")
            lab_id = db.session.execute(lab_id_query, {"project_id": project_id}).scalar()
            
            insert_usage = text("""
                INSERT INTO equipment_usage_history (lab_id, equipment_id, observation_id, used_by, remarks)
                VALUES (:lab_id, :eq_id, :obs_id, :used_by, 'Equipment used in observation recording')
            """)
            db.session.execute(insert_usage, {
                "lab_id": lab_id,
                "eq_id": eq_id,
                "obs_id": new_obs.observation_id,
                "used_by": data.get('operator_name', 'Lab Technician')
            })
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
            obs.scope_test_id = int(data['scope_test_id']) if data['scope_test_id'] else None
        if 'template_id' in data:
            obs.template_id = int(data['template_id']) if data['template_id'] else None
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
        
        eq_id = data.get('equipment_id')
        if 'equipment_id' in data:
            obs.equipment_id = eq_id
        if 'equipment_name' in data:
            obs.equipment_name = data.get('equipment_name')
        if 'equipment_cert_no' in data:
            obs.equipment_cert_no = data.get('equipment_cert_no')
        if 'equipment_validity_date' in data:
            obs.equipment_validity_date = datetime.strptime(data['equipment_validity_date'], "%Y-%m-%d").date() if data.get('equipment_validity_date') else None
            
        obs.updated_at = datetime.utcnow()
        db.session.commit()

        # Log usage to history if equipment was changed or set
        if eq_id:
            lab_id_query = text("SELECT lab_id FROM projects WHERE project_id = :project_id")
            lab_id = db.session.execute(lab_id_query, {"project_id": obs.project_id}).scalar()
            
            # Check if already logged for this observation
            exists_query = text("SELECT COUNT(*) FROM equipment_usage_history WHERE observation_id = :obs_id AND equipment_id = :eq_id")
            exists_count = db.session.execute(exists_query, {"obs_id": observation_id, "eq_id": eq_id}).scalar()
            
            if exists_count == 0:
                insert_usage = text("""
                    INSERT INTO equipment_usage_history (lab_id, equipment_id, observation_id, used_by, remarks)
                    VALUES (:lab_id, :eq_id, :obs_id, :used_by, 'Equipment used in observation recording (updated)')
                """)
                db.session.execute(insert_usage, {
                    "lab_id": lab_id,
                    "eq_id": eq_id,
                    "obs_id": observation_id,
                    "used_by": data.get('operator_name', 'Lab Technician')
                })
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
