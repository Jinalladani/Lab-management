-- =========================================================
-- SAMPLE ENTRY SCOPE TESTS JUNCTION TABLE
-- Purpose: Store relationship between sample entries and project scope tests
-- =========================================================

-- Create junction table for sample entry scope tests
CREATE TABLE IF NOT EXISTS sample_entry_scope_tests (
    sample_entry_scope_test_id BIGSERIAL PRIMARY KEY,
    sample_entry_id BIGINT NOT NULL REFERENCES sample_entries(sample_entry_id) ON DELETE CASCADE,
    project_scope_test_id BIGINT NOT NULL REFERENCES project_scope_tests(project_scope_test_id) ON DELETE CASCADE,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- Ensure unique combination of sample_entry and project_scope_test
    CONSTRAINT uk_sample_entry_scope_test UNIQUE (sample_entry_id, project_scope_test_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sample_entry_scope_tests_sample_entry_id ON sample_entry_scope_tests(sample_entry_id);
CREATE INDEX IF NOT EXISTS idx_sample_entry_scope_tests_project_scope_test_id ON sample_entry_scope_tests(project_scope_test_id);
CREATE INDEX IF NOT EXISTS idx_sample_entry_scope_tests_lab_id ON sample_entry_scope_tests(lab_id);

-- Trigger for audit trail (if audit function exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'audit_sample_entry_scope_tests_changes'
    ) THEN
        CREATE TRIGGER trg_sample_entry_scope_tests_audit
        AFTER INSERT OR DELETE OR UPDATE
        ON sample_entry_scope_tests
        FOR EACH ROW
        EXECUTE FUNCTION audit_sample_entry_scope_tests_changes();
    END IF;
END $$;
