from flask import Blueprint, jsonify, g
from sqlalchemy import text
from app.extensions import db
from datetime import datetime, timedelta
import calendar
from app.utils.auth_decorator import token_required

home_bp = Blueprint("home", __name__)


@home_bp.route("/", methods=["GET"])
def home():
    return jsonify({
        "success": True,
        "message": "Lab Management Backend API is running"
    }), 200


@home_bp.route("/db-check", methods=["GET"])
def db_check():
    try:
        db.session.execute(text("SELECT 1"))
        return jsonify({
            "success": True,
            "message": "Database connected successfully"
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Database connection failed",
            "error": str(e)
        }), 500


@home_bp.route("/dashboard", methods=["GET"])
@token_required
def dashboard():
    try:
        # Get user info from JWT
        user_role = g.jwt_payload.get("role")
        lab_id = g.jwt_payload.get("lab_id")
        
        if not user_role:
            return jsonify({
                "success": False,
                "message": "User role not found"
            }), 403
        
        # Role-based dashboard data - handle both role name variations
        if user_role in ["superadmin", "super_admin"]:
            return get_superadmin_dashboard()
        else:
            # Admin, QM, Eng - use current dashboard
            return get_current_dashboard(lab_id)
            
    except Exception as e:
        print(f"Dashboard API Error: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch dashboard data",
            "error": str(e)
        }), 500


def get_superadmin_dashboard():
    """Global system dashboard for superadmin"""
    try:
        # Global counts across all labs
        total_labs = db.session.execute(text("SELECT COUNT(*) FROM labs")).scalar() or 0
        total_users = db.session.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0
        total_projects = db.session.execute(text("SELECT COUNT(*) FROM projects")).scalar() or 0
        total_clients = db.session.execute(text("SELECT COUNT(*) FROM clients")).scalar() or 0
        
        # Lab distribution
        lab_stats = db.session.execute(text("""
            SELECT
                l.lab_name,
                COUNT(DISTINCT p.project_id) as project_count,
                COUNT(DISTINCT s.sample_id) as sample_count
            FROM labs l
            LEFT JOIN projects p
                ON l.lab_id = p.lab_id
            LEFT JOIN sample_receipt_register s
                ON p.project_id = s.project_id
            GROUP BY l.lab_id, l.lab_name
            ORDER BY project_count DESC
            LIMIT 5
        """)).fetchall()
        
        # User role distribution
        role_stats = db.session.execute(text("""
            SELECT r.role_name, COUNT(u.user_id) as user_count
            FROM roles r
            LEFT JOIN users u ON r.role_id = u.role_id
            GROUP BY r.role_name
            ORDER BY user_count DESC
        """)).fetchall()
        
        # Recent system activities
        recent_activities = []
        
        # Recent labs created
        recent_labs = db.session.execute(text("""
            SELECT lab_name, created_at
            FROM labs
            ORDER BY created_at DESC
            LIMIT 3
        """)).fetchall()
        
        for lab_name, created_at in recent_labs:
            recent_activities.append({
                'type': 'lab',
                'title': f'Lab "{lab_name}" created',
                'time': format_relative_time(created_at),
                'status': 'completed'
            })
        
        return jsonify({
            "success": True,
            "data": {
                "role": "superadmin",
                "stats": {
                    "totalLabs": total_labs,
                    "totalUsers": total_users,
                    "totalProjects": total_projects,
                    "totalClients": total_clients
                },
                "labStats": [
                    {
                        "name": lab_name,
                        "projects": project_count,
                        "samples": sample_count
                    }
                    for lab_name, project_count, sample_count in lab_stats
                ],
                "roleDistribution": [
                    {
                        "role": role_name,
                        "count": user_count
                    }
                    for role_name, user_count in role_stats
                ],
                "recentActivities": recent_activities
            }
        }), 200
        
    except Exception as e:
        print(f"Superadmin dashboard error: {str(e)}")
        raise e


def get_current_dashboard(lab_id):
    """Current dashboard for admin, QM, Eng - lab-specific data"""
    try:
        # Get current date and calculate 6 months back
        current_date = datetime.now()
        current_month = current_date.month
        current_year = current_date.year
        
        # Calculate months from Nov to Apr (if current month is March)
        months_data = []
        month_names = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']
        
        for i, month_name in enumerate(month_names):
            # Calculate the actual month/year
            if current_month >= 3:  # March or later
                target_month = current_month - 4 + i
                target_year = current_year if target_month > 0 else current_year - 1
            else:  # Jan or Feb
                target_month = current_month + 8 + i
                target_year = current_year - 1
            
            if target_month <= 0:
                target_month += 12
            elif target_month > 12:
                target_month -= 12
                target_year += 1
            
            # Get project count for this month (lab-specific)
            projects_query = text("""
                SELECT COUNT(*) as count 
                FROM projects 
                WHERE EXTRACT(MONTH FROM created_at) = :month AND EXTRACT(YEAR FROM created_at) = :year
                AND lab_id = :lab_id
            """)
            projects_result = db.session.execute(projects_query, {
                'month': target_month, 
                'year': target_year,
                'lab_id': lab_id
            })
            project_count = projects_result.scalar() or 0
            
            # Get sample count for this month (lab-specific)
            samples_query = text("""
    SELECT COUNT(*) as count
    FROM sample_receipt_register s
    JOIN projects p ON p.project_id = s.project_id
    WHERE EXTRACT(MONTH FROM s.created_at) = :month
    AND EXTRACT(YEAR FROM s.created_at) = :year
    AND p.lab_id = :lab_id
""")
            samples_result = db.session.execute(samples_query, {
                'month': target_month, 
                'year': target_year,
                'lab_id': lab_id
            })
            sample_count = samples_result.scalar() or 0
            
            months_data.append({
                'month': month_name,
                'projects': project_count,
                'samples': sample_count
            })
        
        # Get lab-specific total counts
        total_projects_query = text("SELECT COUNT(*) FROM projects WHERE lab_id = :lab_id")
        total_projects = db.session.execute(total_projects_query, {"lab_id": lab_id}).scalar() or 0
        
        total_samples_query = text("""
    SELECT COUNT(*)
    FROM sample_receipt_register s
    JOIN projects p ON p.project_id = s.project_id
    WHERE p.lab_id = :lab_id
""")
        total_samples = db.session.execute(total_samples_query, {"lab_id": lab_id}).scalar() or 0
        
        total_clients_query = text("SELECT COUNT(*) FROM clients WHERE lab_id = :lab_id")
        total_clients = db.session.execute(total_clients_query, {"lab_id": lab_id}).scalar() or 0
        
        # Get pending tests (lab-specific)
        pending_tests_query = text("""
            SELECT COUNT(*) FROM project_scope_tests pst
            JOIN projects p ON pst.project_id = p.project_id
            WHERE pst.status = 'active' AND p.lab_id = :lab_id
        """)
        pending_tests = db.session.execute(pending_tests_query, {"lab_id": lab_id}).scalar() or 0
        
        # Get test status distribution (lab-specific)
        status_query = text("""
            SELECT pst.status, COUNT(*) as count 
            FROM project_scope_tests pst
            JOIN projects p ON pst.project_id = p.project_id
            WHERE p.lab_id = :lab_id
            GROUP BY pst.status
        """)
        status_results = db.session.execute(status_query, {"lab_id": lab_id}).fetchall()
        
        status_data = []
        for status, count in status_results:
            color_map = {
                'active': '#10b981',
                'inactive': '#f59e0b'
            }
            status_name_map = {
                'active': 'Active Tests',
                'inactive': 'Inactive Tests'
            }
            
            if status in status_name_map:
                status_data.append({
                    'name': status_name_map[status],
                    'value': count,
                    'color': color_map.get(status, '#6b7280')
                })
        
        # Get recent activities (lab-specific)
        recent_activities = []
        
        # Recent projects (lab-specific)
        projects_query = text("""
            SELECT project_name, created_at, 'project' as type
            FROM projects 
            WHERE lab_id = :lab_id
            ORDER BY created_at DESC 
            LIMIT 3
        """)
        recent_projects = db.session.execute(projects_query, {"lab_id": lab_id}).fetchall()
        
        for project_name, created_at, activity_type in recent_projects:
            recent_activities.append({
                'type': activity_type,
                'title': f'Project "{project_name or "Unnamed"}" created',
                'time': format_relative_time(created_at),
                'status': 'completed'
            })
        
        # Recent samples (lab-specific)
        samples_query = text("""
            SELECT
            s.sample_id,
            s.sample_no,
            s.created_at,
            'sample' as type
        FROM sample_receipt_register s
        JOIN projects p ON p.project_id = s.project_id
        WHERE p.lab_id = :lab_id
        ORDER BY s.created_at DESC
        LIMIT 2
        """)
        recent_samples = db.session.execute(samples_query, {"lab_id": lab_id}).fetchall()
        
        for sample_id, sample_no, created_at, activity_type in recent_samples:
            recent_activities.append({
                'type': activity_type,
                'title': f'Sample {sample_no or f"#{sample_id}"} registered',
                'time': format_relative_time(created_at),
                'status': 'completed'
            })
        
        return jsonify({
            "success": True,
            "data": {
                "stats": {
                    "totalProjects": total_projects,
                    "totalSamples": total_samples,
                    "totalClients": total_clients,
                    "pendingTests": pending_tests
                },
                "monthlyData": months_data,
                "testStatusData": status_data,
                "recentActivities": recent_activities[:5]  # Limit to 5 activities
            }
        }), 200
        
    except Exception as e:
        print(f"Current dashboard error: {str(e)}")
        raise e


def format_relative_time(date_str):
    """Format datetime as relative time"""
    try:
        if isinstance(date_str, str):
            date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        else:
            date = date_str
        
        now = datetime.now()
        if date.tzinfo is None:
            date = date.replace(tzinfo=now.tzinfo)
        
        diff = now - date
        diff_hours = int(diff.total_seconds() / 3600)
        diff_days = diff_hours // 24
        
        if diff_hours < 1:
            return "Just now"
        elif diff_hours < 24:
            return f"{diff_hours} hours ago"
        elif diff_days == 1:
            return "1 day ago"
        elif diff_days < 7:
            return f"{diff_days} days ago"
        else:
            return date.strftime("%b %d, %Y")
    except:
        return "Unknown time"


@home_bp.route("/test-users", methods=["GET"])
@token_required
def test_users():
    """Test endpoint to verify users logic works"""
    try:
        current_user_id = g.jwt_payload.get("user_id")
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get a few users for testing
        users = User.query.filter(User.lab_id == current_user.lab_id).limit(5).all()
        
        user_list = []
        for user in users:
            user_list.append({
                'id': user.user_id,
                'name': user.full_name,
                'email': user.email,
                'status': 'Active' if user.is_active else 'Inactive'
            })
        
        return jsonify({
            'message': 'Test users endpoint working',
            'users': user_list
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        