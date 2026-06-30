-- =========================================================
-- Migration: Convert Lab-wise Roles to Global Roles
-- =========================================================

BEGIN;

-- Step 1: Backup existing roles data
CREATE TABLE IF NOT EXISTS roles_lab_wise_backup AS SELECT * FROM roles;

-- Step 2: Create a temporary table to store unique roles
CREATE TEMPORARY TABLE unique_roles AS
SELECT 
    MIN(role_id) as role_id,
    NULL as lab_id,  -- Make roles global
    role_name,
    MIN(description) as description,  -- Take first description
    MIN(created_at) as created_at,
    MIN(updated_at) as updated_at
FROM roles 
GROUP BY role_name;

-- Step 3: Delete all existing roles
DELETE FROM roles;

-- Step 4: Insert back unique global roles
INSERT INTO roles (role_id, lab_id, role_name, description, created_at, updated_at)
SELECT role_id, lab_id, role_name, description, created_at, updated_at
FROM unique_roles;

-- Step 5: Update users to point to the new global role_ids
-- This maps users from their old lab-specific roles to the new global roles
UPDATE users 
SET role_id = ur.role_id
FROM unique_roles ur
WHERE users.role_id IN (
    SELECT r.role_id FROM roles_lab_wise_backup r 
    WHERE r.role_name = ur.role_name
);

-- Step 6: Drop the old unique constraint and add new one
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_lab_id_role_name_key;
ALTER TABLE roles ADD CONSTRAINT roles_role_name_unique UNIQUE (role_name);

-- Step 7: Clean up
DROP TABLE IF EXISTS unique_roles;

COMMIT;

-- =========================================================
-- Verification Queries (run these to verify the migration)
-- =========================================================

-- Check global roles
-- SELECT * FROM roles ORDER BY role_name;

-- Check users have correct role assignments
-- SELECT u.user_id, u.first_name, u.email, r.role_name 
-- FROM users u 
-- JOIN roles r ON u.role_id = r.role_id 
-- ORDER BY r.role_name, u.first_name;

-- Verify no lab-specific roles remain
-- SELECT COUNT(*) as lab_specific_roles FROM roles WHERE lab_id IS NOT NULL;
