-- Migration: Ensure 5 canonical roles exist in roles table safely
INSERT INTO roles (role_name, description, created_at, updated_at)
SELECT 'Super Admin', 'Full system level administrator access', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE LOWER(role_name) IN ('super admin', 'superadmin', 'super_admin'));

INSERT INTO roles (role_name, description, created_at, updated_at)
SELECT 'Admin', 'Lab Administrator with full laboratory management rights', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE LOWER(role_name) IN ('admin', 'lab admin', 'labadmin', 'lab_admin'));

INSERT INTO roles (role_name, description, created_at, updated_at)
SELECT 'QM', 'Quality Manager with report approval authority', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE LOWER(role_name) IN ('qm', 'quality manager', 'quality_manager'));

INSERT INTO roles (role_name, description, created_at, updated_at)
SELECT 'Engineer', 'Test Engineer performing normal laboratory workflow', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE LOWER(role_name) IN ('engineer', 'eng', 'test engineer', 'test_engineer'));

INSERT INTO roles (role_name, description, created_at, updated_at)
SELECT 'Helper', 'Labor / Helper limited to sample receipt and observation entry', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE LOWER(role_name) IN ('helper', 'labor', 'labour', 'worker'));
