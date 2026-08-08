"""
Centralized Permission Logic & Role-Based Access Control (RBAC) for SmartLab LIMS.
"""
from functools import wraps
from flask import jsonify, g

# 1. Role Normalization
def normalize_role(role_name: str) -> str:
    if not role_name:
        return "none"
    
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
    else:
        return "none"

# 2. Granular Permissions Mapping per Canonical Role
ROLE_PERMISSIONS = {
    "superadmin": ["*"],
    "none": [],
    
    "admin": [
        "dashboard.view",
        "project.view", "project.manage",
        "client.view", "client.manage",
        "scope.view", "scope.manage",
        "sample.receive", "sample.view", "sample.manage",
        "test.assign", "test.view",
        "observation.view", "observation.fill", "observation.edit",
        "result.view",
        "report.view", "report.generate", "report.approve",
        "equipment.view", "equipment.manage",
        "calibration.view", "calibration.manage",
        "user.view", "user.manage",
        "settings.manage"
    ],
    
    "qm": [
        "dashboard.view",
        "project.view", "project.manage",
        "client.view", "client.manage",
        "scope.view", "scope.manage",
        "sample.receive", "sample.view", "sample.manage",
        "test.assign", "test.view",
        "observation.view", "observation.fill", "observation.edit",
        "result.view",
        "report.view", "report.generate", "report.approve",
        "equipment.view", "equipment.manage",
        "calibration.view", "calibration.manage",
        "user.view", "user.manage"
    ],
    
    "engineer": [
        "dashboard.view",
        "project.view", "project.manage",
        "client.view",
        "scope.view",
        "sample.receive", "sample.view",
        "test.assign", "test.view",
        "observation.view", "observation.fill", "observation.edit",
        "result.view",
        "report.view", "report.generate",
        "equipment.view", "equipment.manage",
        "calibration.view", "calibration.manage"
    ],
    
    "helper": [
        "dashboard.view",
        "sample.receive", "sample.view",
        "observation.view", "observation.fill", "observation.edit"
    ]
}

# 3. Check if role has permission
def has_permission(role_name: str, permission_key: str) -> bool:
    norm_role = normalize_role(role_name)
    perms = ROLE_PERMISSIONS.get(norm_role, [])
    
    if "*" in perms:
        return True
        
    return permission_key in perms

# 4. Decorator to enforce permission on Flask routes
def permission_required(permission_key: str):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            payload = getattr(g, "jwt_payload", {}) or {}
            role_name = payload.get("role") or payload.get("role_name") or "Engineer"
            
            if not has_permission(role_name, permission_key):
                return jsonify({
                    "success": False,
                    "message": f"Access denied. Required permission '{permission_key}' missing for role '{role_name}'."
                }), 403
                
            return fn(*args, **kwargs)
        return wrapper
    return decorator
