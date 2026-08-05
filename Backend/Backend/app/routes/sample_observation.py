# pyrefly: ignore [missing-import]
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.sample_observation import SampleObservation
from datetime import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy import text

sample_observations_bp = Blueprint('sample_observations', __name__)

@sample_observations_bp.before_request
def ensure_sample_observations_table():
    pass


@sample_observations_bp.route('', methods=['GET'])
def get_all_observations():
    try:
        project_id = request.args.get("project_id", "").strip()
        sample_id = request.args.get("sample_id", "").strip()
        
        query = """
            SELECT so.*, p.project_name, p.project_code, srr.sample_no
            FROM sample_observations so
            LEFT JOIN projects p ON so.project_id = p.project_id
            LEFT JOIN sample_receipt_register srr ON so.sample_id = srr.sample_id
        """
        where_clauses = []
        params = {}

        if project_id:
            where_clauses.append("so.project_id = :project_id")
            params["project_id"] = project_id
        if sample_id:
            where_clauses.append("so.sample_id = :sample_id")
            params["sample_id"] = sample_id
            
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
            
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
        raw_project_id = data.get('project_id')
        raw_sample_id = data.get('sample_id')
        raw_template_id = data.get('template_id')
        raw_scope_test_id = data.get('scope_test_id')
        test_name = data.get('test_name', 'Lab Test Observation Sheet')
        
        # Safely convert IDs
        try:
            project_id = int(raw_project_id) if raw_project_id else None
        except (ValueError, TypeError):
            project_id = None

        try:
            sample_id = int(raw_sample_id) if raw_sample_id else None
        except (ValueError, TypeError):
            sample_id = None

        try:
            template_id = int(raw_template_id) if raw_template_id else None
        except (ValueError, TypeError):
            template_id = None

        try:
            scope_test_id = int(raw_scope_test_id) if raw_scope_test_id else None
        except (ValueError, TypeError):
            scope_test_id = None

        # Verify or fallback project_id
        if not project_id:
            first_project = db.session.execute(text("SELECT project_id FROM projects ORDER BY project_id ASC LIMIT 1")).scalar()
            if first_project:
                project_id = first_project
            else:
                db.session.execute(text("INSERT INTO projects (project_name, project_code, status) VALUES ('General Lab Project', 'PROJ-GEN', 'Active')"))
                db.session.commit()
                project_id = db.session.execute(text("SELECT project_id FROM projects ORDER BY project_id DESC LIMIT 1")).scalar()

        # Verify or fallback sample_id
        if not sample_id:
            first_sample = db.session.execute(text("SELECT sample_id FROM sample_receipt_register ORDER BY sample_id ASC LIMIT 1")).scalar()
            if first_sample:
                sample_id = first_sample
            else:
                db.session.execute(text("INSERT INTO sample_receipt_register (project_id, sample_no, status) VALUES (:pid, 'LAB/2026/SOIL-094', 'Received')"), {"pid": project_id})
                db.session.commit()
                sample_id = db.session.execute(text("SELECT sample_id FROM sample_receipt_register ORDER BY sample_id DESC LIMIT 1")).scalar()

        # Check if project_id exists in projects table
        proj_exists = db.session.execute(text("SELECT 1 FROM projects WHERE project_id = :pid"), {"pid": project_id}).scalar()
        if not proj_exists:
            first_proj = db.session.execute(text("SELECT project_id FROM projects ORDER BY project_id ASC LIMIT 1")).scalar()
            if first_proj:
                project_id = first_proj

        # Check if sample_id exists in sample_receipt_register table
        samp_exists = db.session.execute(text("SELECT 1 FROM sample_receipt_register WHERE sample_id = :sid"), {"sid": sample_id}).scalar()
        if not samp_exists:
            first_samp = db.session.execute(text("SELECT sample_id FROM sample_receipt_register ORDER BY sample_id ASC LIMIT 1")).scalar()
            if first_samp:
                sample_id = first_samp

        # UPSERT Logic: Check if observation record already exists for this sample and template/scope
        existing = None
        if template_id and sample_id:
            existing = SampleObservation.query.filter_by(sample_id=sample_id, template_id=template_id).first()
        if not existing and scope_test_id and sample_id:
            existing = SampleObservation.query.filter_by(sample_id=sample_id, scope_test_id=scope_test_id).first()

        eq_id = data.get('equipment_id')
        eq_validity = None
        if data.get('equipment_validity_date'):
            try:
                eq_validity = datetime.strptime(data['equipment_validity_date'], "%Y-%m-%d").date()
            except Exception:
                eq_validity = None

        if existing:
            # Update existing record
            existing.test_name = test_name
            existing.test_method = data.get('test_method', existing.test_method)
            existing.operator_name = data.get('operator_name', existing.operator_name)
            existing.sheets_data = data.get('sheets_data', existing.sheets_data)
            existing.merges_data = data.get('merges_data', existing.merges_data)
            existing.status = data.get('status', existing.status)
            existing.updated_at = datetime.utcnow()
            
            db.session.commit()
            return jsonify({
                'success': True,
                'message': "Observation entry updated successfully",
                'data': existing.to_dict()
            }), 200

        # Create new record
        new_obs = SampleObservation(
            project_id=project_id,
            sample_id=sample_id,
            scope_test_id=scope_test_id,
            template_id=template_id,
            test_name=test_name,
            test_method=data.get('test_method', ''),
            operator_name=data.get('operator_name', 'Lab Technician'),
            sheets_data=data.get('sheets_data', {}),
            merges_data=data.get('merges_data', []),
            status=data.get('status', 'Submitted'),
            equipment_id=eq_id,
            equipment_name=data.get('equipment_name'),
            equipment_cert_no=data.get('equipment_cert_no'),
            equipment_validity_date=eq_validity
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
        print(f"Error in create_observation: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to save observation record: {str(e)}"
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
            'message': "Observation entry updated successfully",
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
            'message': "Observation entry deleted successfully"
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f"Failed to delete observation: {str(e)}"
        }), 500
