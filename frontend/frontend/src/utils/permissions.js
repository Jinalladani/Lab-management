/**
 * Centralized Role-Based Access Control (RBAC) Permission Utility for SmartLab LIMS.
 */

export const normalizeRole = (roleName) => {
  if (!roleName) return "none";
  
  const r = String(roleName).trim().toLowerCase().replace(/_/g, "").replace(/-/g, "").replace(/ /g, "");
  
  if (["superadmin", "super_admin"].includes(r)) {
    return "superadmin";
  } else if (["admin", "labadmin", "labmanager", "clientadmin"].includes(r)) {
    return "admin";
  } else if (["qm", "qualitymanager"].includes(r)) {
    return "qm";
  } else if (["engineer", "eng", "testengineer"].includes(r)) {
    return "engineer";
  } else if (["helper", "labor", "labour", "worker"].includes(r)) {
    return "helper";
  } else {
    return "none";
  }
};

export const ROLE_PERMISSIONS = {
  superadmin: ["*"],
  none: [],
  
  admin: [
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
    "document.view", "document.manage", "document.approve", "document.acknowledge",
    "user.view", "user.manage",
    "settings.manage"
  ],
  
  qm: [
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
    "document.view", "document.manage", "document.approve", "document.acknowledge",
    "user.view", "user.manage"
  ],
  
  engineer: [
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
    "calibration.view", "calibration.manage",
    "document.view", "document.manage", "document.acknowledge"
  ],
  
  helper: [
    "dashboard.view",
    "sample.receive", "sample.view",
    "observation.view", "observation.fill", "observation.edit",
    "document.view", "document.acknowledge"
  ]
};

export const hasPermission = (roleName, permissionKey) => {
  const normRole = normalizeRole(roleName);
  const perms = ROLE_PERMISSIONS[normRole] || [];
  
  if (perms.includes("*")) {
    return true;
  }
  
  return perms.includes(permissionKey);
};
