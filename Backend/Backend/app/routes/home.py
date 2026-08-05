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


def normalize_role(role_name):
    if not role_name:
        return "engineer"
    r = str(role_name).strip().lower().replace("_", "").replace("-", "").replace(" ", "")
    if r in ["superadmin", "super_admin"]:
        return "superadmin"
    elif r in ["admin", "labadmin", "labmanager", "clientadmin"]:
        return "admin"
    elif r in ["qm", "qualitymanager"]:
        return "qm"
    elif r in ["engineer", "eng", "testengineer"]:
        return "engineer"
    elif r in ["helper", "labor", "labour", "worker"]:
        return "helper"
    return "engineer"


@home_bp.route("/dashboard", methods=["GET"])
@token_required
def dashboard():
    try:
        user_role = normalize_role(g.jwt_payload.get("role") or g.jwt_payload.get("role_name"))
        lab_id = g.jwt_payload.get("lab_id")

        if user_role == "superadmin":
            return get_superadmin_dashboard()
        else:
            return get_current_dashboard(lab_id, user_role)
    except Exception as e:
        db.session.rollback()
        print(f"Dashboard API Error: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch dashboard data",
            "error": str(e)
        }), 500


def get_superadmin_dashboard():
    """Global system analytics dashboard for superadmin"""
    try:
        db.session.rollback()

        current_date = datetime.now()
        current_month = current_date.month
        current_year = current_date.year

        def fetch_count(sql_query, params=None):
            try:
                res = db.session.execute(text(sql_query), params or {}).scalar()
                return res or 0
            except Exception:
                db.session.rollback()
                return 0

        # Global system metrics
        total_labs = fetch_count("SELECT COUNT(*) FROM labs")
        total_users = fetch_count("SELECT COUNT(*) FROM users")
        total_projects = fetch_count("SELECT COUNT(*) FROM projects")
        total_clients = fetch_count("SELECT COUNT(*) FROM clients")

        # Laboratory distribution
        lab_stats = []
        try:
            lab_rows = db.session.execute(text("""
                SELECT
                    COALESCE(l.lab_name, 'Primary Lab') as name,
                    COUNT(DISTINCT p.project_id) as projects,
                    COUNT(DISTINCT s.sample_id) as samples
                FROM labs l
                LEFT JOIN projects p ON l.lab_id = p.lab_id
                LEFT JOIN sample_receipt_register s ON p.project_id = s.project_id
                GROUP BY l.lab_id, l.lab_name
                ORDER BY projects DESC
                LIMIT 5
            """)).fetchall()

            lab_stats = [{"name": r[0], "projects": r[1], "samples": r[2]} for r in lab_rows]
        except Exception:
            db.session.rollback()

        if not lab_stats:
            lab_stats = [{"name": "Central Lab", "projects": total_projects, "samples": fetch_count("SELECT COUNT(*) FROM sample_receipt_register")}]

        # User role distribution
        role_distribution = []
        try:
            role_rows = db.session.execute(text("""
                SELECT COALESCE(r.role_name, u.role, 'Admin') as role_name, COUNT(u.user_id) as user_count
                FROM users u
                LEFT JOIN roles r ON r.role_id = u.role_id
                GROUP BY role_name
                ORDER BY user_count DESC
            """)).fetchall()

            color_map = {
                'SuperAdmin': '#243744', 'superadmin': '#243744',
                'Admin': '#059669', 'admin': '#059669',
                'Quality Manager': '#2563EB', 'qm': '#2563EB',
                'Test Engineer': '#D97706', 'eng': '#D97706'
            }

            role_distribution = [
                {"name": str(r[0]).replace("_", " ").title(), "value": r[1], "color": color_map.get(r[0], '#475569')}
                for r in role_rows
            ]
        except Exception:
            db.session.rollback()

        # Dynamic System Monthly Data (Last 6 Months)
        monthly_data = []
        for i in range(5, -1, -1):
            t_month = current_month - i
            t_year = current_year
            while t_month <= 0:
                t_month += 12
                t_year -= 1

            month_name = calendar.month_abbr[t_month]

            sample_count = fetch_count(
                "SELECT COUNT(*) FROM sample_receipt_register WHERE EXTRACT(MONTH FROM created_at) = :m AND EXTRACT(YEAR FROM created_at) = :y",
                {'m': t_month, 'y': t_year}
            )

            report_count = fetch_count(
                "SELECT COUNT(*) FROM reports WHERE EXTRACT(MONTH FROM created_at) = :m AND EXTRACT(YEAR FROM created_at) = :y",
                {'m': t_month, 'y': t_year}
            )

            project_count = fetch_count(
                "SELECT COUNT(*) FROM projects WHERE EXTRACT(MONTH FROM created_at) = :m AND EXTRACT(YEAR FROM created_at) = :y",
                {'m': t_month, 'y': t_year}
            )

            monthly_data.append({
                'month': month_name,
                'monthShort': month_name,
                'year': t_year,
                'projects': project_count,
                'samples': sample_count,
                'reports': report_count
            })

        # Recent System Activities
        recent_activities = []
        try:
            recent_labs = db.session.execute(text("""
                SELECT lab_name, created_at FROM labs ORDER BY created_at DESC LIMIT 3
            """)).fetchall()
            for l_name, l_created in recent_labs:
                recent_activities.append({
                    'type': 'lab',
                    'title': f'Lab "{l_name}" initialized',
                    'time': format_relative_time(l_created),
                    'status': 'completed'
                })
        except Exception:
            db.session.rollback()

        try:
            recent_users = db.session.execute(text("""
                SELECT username, created_at FROM users ORDER BY created_at DESC LIMIT 3
            """)).fetchall()
            for u_name, u_created in recent_users:
                recent_activities.append({
                    'type': 'user',
                    'title': f'User @{u_name} registered',
                    'time': format_relative_time(u_created),
                    'status': 'active'
                })
        except Exception:
            db.session.rollback()

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
                "labStats": lab_stats,
                "roleDistribution": role_distribution,
                "monthlyData": monthly_data,
                "recentActivities": recent_activities[:6]
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        print("Superadmin dashboard exception:", str(e))
        return jsonify({
            "success": False,
            "message": "Failed to fetch superadmin dashboard data",
            "error": str(e)
        }), 500


def get_current_dashboard(raw_lab_id, user_role="admin"):
    """Current dashboard for admin, QM, Eng, Helper - fetching all actual database metrics safely"""
    try:
        db.session.rollback()  # Ensure clean transaction state at start

        lab_id = None
        try:
            if raw_lab_id is not None and str(raw_lab_id).isdigit():
                lab_id = int(raw_lab_id)
        except Exception:
            lab_id = None

        current_date = datetime.now()
        current_month = current_date.month
        current_year = current_date.year

        # Helper for executing scalar query safely with rollback
        def fetch_count(sql_query, params=None):
            try:
                res = db.session.execute(text(sql_query), params or {}).scalar()
                return res or 0
            except Exception as err:
                db.session.rollback()
                print("Count query notice:", sql_query, err)
                return 0

        # 1. Total Projects
        total_projects = fetch_count("SELECT COUNT(*) FROM projects")

        # 2. Total Samples (from sample_receipt_register)
        total_samples = fetch_count("SELECT COUNT(*) FROM sample_receipt_register")

        # 3. Total Physical Specimens
        total_testing_samples = fetch_count("SELECT COUNT(*) FROM testing_samples")
        if total_testing_samples == 0:
            total_testing_samples = total_samples

        # 4. Total Clients
        total_clients = fetch_count("SELECT COUNT(*) FROM clients")

        # 5. Total Assignments
        total_assignments = fetch_count("SELECT COUNT(*) FROM sample_test_assignments")
        if total_assignments == 0:
            total_assignments = fetch_count("SELECT COUNT(*) FROM project_scope_tests")

        # 6. Total Observations
        total_observations = fetch_count("SELECT COUNT(*) FROM sample_observations")

        # 7. Total Reports
        total_reports = fetch_count("SELECT COUNT(*) FROM reports")

        # 8. Pending Tests
        pending_tests = fetch_count("SELECT COUNT(*) FROM sample_test_assignments WHERE status IN ('Scheduled', 'In Progress', 'Assigned', 'active')")
        if pending_tests == 0:
            pending_tests = fetch_count("SELECT COUNT(*) FROM projects WHERE status = 'active'")

        # 9. Superadmin global stats
        total_labs = fetch_count("SELECT COUNT(*) FROM labs")
        total_users = fetch_count("SELECT COUNT(*) FROM users")

        # Dynamic Monthly Data (Last 6 Months)
        months_data = []
        for i in range(5, -1, -1):
            t_month = current_month - i
            t_year = current_year
            while t_month <= 0:
                t_month += 12
                t_year -= 1

            month_name = calendar.month_abbr[t_month]

            sample_count = fetch_count(
                "SELECT COUNT(*) FROM sample_receipt_register WHERE EXTRACT(MONTH FROM created_at) = :m AND EXTRACT(YEAR FROM created_at) = :y",
                {'m': t_month, 'y': t_year}
            )

            report_count = fetch_count(
                "SELECT COUNT(*) FROM reports WHERE EXTRACT(MONTH FROM created_at) = :m AND EXTRACT(YEAR FROM created_at) = :y",
                {'m': t_month, 'y': t_year}
            )

            project_count = fetch_count(
                "SELECT COUNT(*) FROM projects WHERE EXTRACT(MONTH FROM created_at) = :m AND EXTRACT(YEAR FROM created_at) = :y",
                {'m': t_month, 'y': t_year}
            )

            efficiency = round((report_count / (sample_count or 1)) * 100) if sample_count > 0 else (100 if report_count > 0 else 0)

            months_data.append({
                'month': month_name,
                'monthShort': month_name,
                'year': t_year,
                'projects': project_count,
                'samples': sample_count,
                'reports': report_count,
                'efficiency': efficiency
            })

        # Material Breakdown
        material_breakdown = []
        try:
            rows = db.session.execute(text("""
                SELECT COALESCE(material_name, 'General Material'), COUNT(*) as count
                FROM sample_receipt_register
                WHERE material_name IS NOT NULL
                GROUP BY material_name
                ORDER BY count DESC
                LIMIT 5
            """)).fetchall()
            material_breakdown = [{'name': r[0], 'count': r[1]} for r in rows if r[0]]
        except Exception:
            db.session.rollback()

        # Status Data
        status_data = []
        try:
            rows = db.session.execute(text("""
                SELECT COALESCE(status, 'Scheduled'), COUNT(*) as count 
                FROM sample_test_assignments
                GROUP BY status
            """)).fetchall()

            if not rows:
                rows = db.session.execute(text("""
                    SELECT COALESCE(status, 'Active'), COUNT(*) as count 
                    FROM projects
                    GROUP BY status
                """)).fetchall()

            color_map = {
                'Completed': '#059669',
                'In Progress': '#2563EB',
                'Scheduled': '#D97706',
                'Active': '#059669',
                'active': '#059669',
                'Assigned': '#8B5CF6',
                'Cancelled': '#DC2626'
            }
            for st_val, count in rows:
                status_data.append({
                    'name': str(st_val).capitalize(),
                    'value': count,
                    'color': color_map.get(st_val, '#243744')
                })
        except Exception:
            db.session.rollback()

        # Recent Activities
        recent_activities = []
        try:
            recent_projects = db.session.execute(text("""
                SELECT project_name, created_at FROM projects ORDER BY created_at DESC LIMIT 3
            """)).fetchall()
            for p_name, p_created in recent_projects:
                recent_activities.append({
                    'type': 'project',
                    'title': f'Project "{p_name or "Unnamed"}" registered',
                    'time': format_relative_time(p_created),
                    'status': 'active'
                })
        except Exception:
            db.session.rollback()

        try:
            recent_receipts = db.session.execute(text("""
                SELECT sample_no, created_at FROM sample_receipt_register ORDER BY created_at DESC LIMIT 3
            """)).fetchall()
            for s_no, s_created in recent_receipts:
                recent_activities.append({
                    'type': 'sample',
                    'title': f'Material Lot {s_no or "Receipt"} received',
                    'time': format_relative_time(s_created),
                    'status': 'completed'
                })
        except Exception:
            db.session.rollback()

        return jsonify({
            "success": True,
            "data": {
                "role": user_role,
                "stats": {
                    "totalLabs": total_labs,
                    "totalUsers": total_users,
                    "totalProjects": total_projects,
                    "totalSamples": total_samples,
                    "totalTestingSamples": total_testing_samples,
                    "totalClients": total_clients,
                    "totalAssignments": total_assignments,
                    "completedObservations": total_observations,
                    "totalReports": total_reports,
                    "pendingTests": pending_tests
                },
                "monthlyData": months_data,
                "testStatusData": status_data,
                "materialBreakdown": material_breakdown,
                "recentActivities": recent_activities[:6]
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        print("Dashboard Exception:", str(e))
        return jsonify({
            "success": True,
            "data": {
                "stats": {
                    "totalLabs": 0,
                    "totalUsers": 0,
                    "totalProjects": 0,
                    "totalSamples": 0,
                    "totalTestingSamples": 0,
                    "totalClients": 0,
                    "totalAssignments": 0,
                    "completedObservations": 0,
                    "totalReports": 0,
                    "pendingTests": 0
                },
                "monthlyData": [],
                "testStatusData": [],
                "materialBreakdown": [],
                "recentActivities": []
            }
        }), 200


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
        