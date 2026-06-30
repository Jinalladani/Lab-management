-- =========================================
-- Project Scope Tests Table SQL
-- =========================================

BEGIN;

CREATE TABLE IF NOT EXISTS project_scope_tests (
    project_scope_test_id BIGSERIAL PRIMARY KEY,

    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,

    group_id BIGINT NOT NULL REFERENCES scope_groups(group_id) ON DELETE CASCADE,
    material_id BIGINT NOT NULL REFERENCES scope_materials(material_id) ON DELETE CASCADE,
    scope_test_id BIGINT NOT NULL REFERENCES scope_tests(scope_test_id) ON DELETE CASCADE,

    sample_required BOOLEAN DEFAULT TRUE,
    test_quantity INTEGER DEFAULT 1,
    remarks TEXT,

    status VARCHAR(50) DEFAULT 'active' CHECK (
        status IN ('active', 'inactive')
    ),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (project_id, scope_test_id)
);

-- =========================================
-- Trigger for auto updating updated_at
-- =========================================

CREATE OR REPLACE FUNCTION set_updated_at_project_scope_tests()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_scope_tests_updated_at ON project_scope_tests;

CREATE TRIGGER trg_project_scope_tests_updated_at
BEFORE UPDATE ON project_scope_tests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_project_scope_tests();

COMMIT;

-- =========================================
-- Example Insert
-- =========================================
-- INSERT INTO project_scope_tests (
--     lab_id,
--     project_id,
--     group_id,
--     material_id,
--     scope_test_id,
--     sample_required,
--     test_quantity,
--     remarks,
--     status
-- ) VALUES (
--     1,
--     1,
--     2,
--     5,
--     10,
--     TRUE,
--     3,
--     'Initial testing requirement',
--     'active'
-- );
