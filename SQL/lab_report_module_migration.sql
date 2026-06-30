BEGIN;

-- =========================================================
-- LAB MANAGEMENT - REPORT MODULE MIGRATION
-- Purpose:
-- 1) Reuse existing project scope tests
-- 2) Add sample-wise result entry based on project scope tests
-- 3) Add sample-based reports
-- 4) Replace JSON-style extra fields with relational tables
-- 5) Keep migration idempotent for existing database
-- =========================================================

-- =========================================================
-- COMMON updated_at FUNCTION
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at_common()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 1) ALTER EXISTING samples TABLE FOR REPORT FLOW
-- Existing flow:
-- Project -> Scope(project_scope_tests) -> Sample -> Test Result -> Report
-- =========================================================
ALTER TABLE samples
    ADD COLUMN IF NOT EXISTS sample_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS sample_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS received_date DATE,
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS remarks TEXT,
    ADD COLUMN IF NOT EXISTS created_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL;

DO $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'samples'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE samples DROP CONSTRAINT IF EXISTS %I', c.conname);
    END LOOP;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_samples_status'
    ) THEN
        EXECUTE 'ALTER TABLE samples
            ADD CONSTRAINT chk_samples_status
            CHECK (status IN (''draft'', ''in_progress'', ''completed'', ''cancelled''))';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_samples_lab_id ON samples(lab_id);
CREATE INDEX IF NOT EXISTS idx_samples_project_id ON samples(project_id);
CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);
CREATE INDEX IF NOT EXISTS idx_samples_received_date ON samples(received_date);

DROP TRIGGER IF EXISTS trg_samples_updated_at_common ON samples;
CREATE TRIGGER trg_samples_updated_at_common
BEFORE UPDATE ON samples
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_common();

-- =========================================================
-- 2) ALTER EXISTING project_scope_tests TABLE
-- Add ordering + active flag for clean report/result table rendering
-- =========================================================
ALTER TABLE project_scope_tests
    ADD COLUMN IF NOT EXISTS sequence_no INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_project_scope_tests_project_id ON project_scope_tests(project_id);
CREATE INDEX IF NOT EXISTS idx_project_scope_tests_scope_test_id ON project_scope_tests(scope_test_id);
CREATE INDEX IF NOT EXISTS idx_project_scope_tests_active ON project_scope_tests(is_active);

-- =========================================================
-- 3) CREATE / ALTER reports TABLE
-- Reuse existing reports table if already created
-- =========================================================
CREATE TABLE IF NOT EXISTS reports (
    report_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE
);

ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS sample_id BIGINT NULL REFERENCES samples(sample_id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS report_no VARCHAR(100),
    ADD COLUMN IF NOT EXISTS issue_date DATE,
    ADD COLUMN IF NOT EXISTS report_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS prepared_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reviewed_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS pdf_file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS pdf_file_path TEXT,
    ADD COLUMN IF NOT EXISTS created_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS remarks TEXT,
    ADD COLUMN IF NOT EXISTS report_title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill / normalize from old columns if old report table already existed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'reports'
          AND column_name = 'report_number'
    ) THEN
        EXECUTE 'UPDATE reports SET report_no = COALESCE(report_no, report_number) WHERE report_no IS NULL AND report_number IS NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'reports'
          AND column_name = 'report_date'
    ) OR EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'reports'
          AND column_name = 'report_create_date'
    ) THEN
        EXECUTE 'UPDATE reports SET issue_date = COALESCE(issue_date, report_date, report_create_date) WHERE issue_date IS NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'reports'
          AND column_name = 'status'
    ) THEN
        EXECUTE 'UPDATE reports SET report_status = COALESCE(report_status,
            CASE
                WHEN status = ''submitted'' THEN ''under_review''
                WHEN status = ''revision'' THEN ''revision_requested''
                ELSE status
            END,
            ''draft'')
        WHERE report_status IS NULL';
    ELSE
        EXECUTE 'UPDATE reports SET report_status = COALESCE(report_status, ''draft'') WHERE report_status IS NULL';
    END IF;
END $$;

-- Drop old status-related CHECK constraints and replace with new workflow
DO $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'reports'
          AND con.contype = 'c'
          AND (
                pg_get_constraintdef(con.oid) ILIKE '%status%'
             OR pg_get_constraintdef(con.oid) ILIKE '%report_status%'
          )
    LOOP
        EXECUTE format('ALTER TABLE reports DROP CONSTRAINT IF EXISTS %I', c.conname);
    END LOOP;
END $$;

ALTER TABLE reports
    ALTER COLUMN report_status SET DEFAULT 'draft';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_reports_report_status'
    ) THEN
        EXECUTE 'ALTER TABLE reports
            ADD CONSTRAINT chk_reports_report_status
            CHECK (report_status IN (
                ''draft'',
                ''in_progress'',
                ''under_review'',
                ''revision_requested'',
                ''approved'',
                ''issued'',
                ''rejected''
            ))';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'uq_reports_report_no'
    ) THEN
        EXECUTE 'CREATE UNIQUE INDEX uq_reports_report_no ON reports(report_no) WHERE report_no IS NOT NULL';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reports_lab_id ON reports(lab_id);
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_sample_id ON reports(sample_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(report_status);
CREATE INDEX IF NOT EXISTS idx_reports_issue_date ON reports(issue_date);

DROP TRIGGER IF EXISTS trg_reports_updated_at_common ON reports;
CREATE TRIGGER trg_reports_updated_at_common
BEFORE UPDATE ON reports
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_common();

-- =========================================================
-- 4) SAMPLE TEST RESULTS
-- This is the main result-entry table.
-- Only project scope tests should load by default.
-- Extra tests can also be added manually.
-- =========================================================
CREATE TABLE IF NOT EXISTS sample_test_results (
    sample_test_result_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    sample_id BIGINT NOT NULL REFERENCES samples(sample_id) ON DELETE CASCADE,
    project_scope_test_id BIGINT NULL REFERENCES project_scope_tests(project_scope_test_id) ON DELETE SET NULL,
    scope_test_id BIGINT NULL REFERENCES scope_tests(scope_test_id) ON DELETE SET NULL,

    test_name VARCHAR(255) NOT NULL,
    test_method TEXT,
    unit VARCHAR(100),
    sequence_no INTEGER NOT NULL DEFAULT 1,

    result_value TEXT,
    remark TEXT,

    is_extra_test BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    entered_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'uq_sample_test_results_scope_test'
    ) THEN
        EXECUTE '
            CREATE UNIQUE INDEX uq_sample_test_results_scope_test
            ON sample_test_results(sample_id, project_scope_test_id)
            WHERE project_scope_test_id IS NOT NULL
        ';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sample_test_results_lab_id ON sample_test_results(lab_id);
CREATE INDEX IF NOT EXISTS idx_sample_test_results_project_id ON sample_test_results(project_id);
CREATE INDEX IF NOT EXISTS idx_sample_test_results_sample_id ON sample_test_results(sample_id);
CREATE INDEX IF NOT EXISTS idx_sample_test_results_pst_id ON sample_test_results(project_scope_test_id);
CREATE INDEX IF NOT EXISTS idx_sample_test_results_extra ON sample_test_results(is_extra_test);
CREATE INDEX IF NOT EXISTS idx_sample_test_results_active ON sample_test_results(is_active);

DROP TRIGGER IF EXISTS trg_sample_test_results_updated_at ON sample_test_results;
CREATE TRIGGER trg_sample_test_results_updated_at
BEFORE UPDATE ON sample_test_results
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_common();

-- =========================================================
-- 5) REPORT TEST RESULTS SNAPSHOT
-- When report is created, sample results can be copied here.
-- This protects report data even if sample results are updated later.
-- =========================================================
CREATE TABLE IF NOT EXISTS report_test_results (
    report_test_result_id BIGSERIAL PRIMARY KEY,
    report_id BIGINT NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,
    sample_test_result_id BIGINT NULL REFERENCES sample_test_results(sample_test_result_id) ON DELETE SET NULL,

    project_scope_test_id BIGINT NULL REFERENCES project_scope_tests(project_scope_test_id) ON DELETE SET NULL,
    scope_test_id BIGINT NULL REFERENCES scope_tests(scope_test_id) ON DELETE SET NULL,

    test_name VARCHAR(255) NOT NULL,
    test_method TEXT,
    unit VARCHAR(100),
    sequence_no INTEGER NOT NULL DEFAULT 1,
    result_value TEXT,
    remark TEXT,
    is_extra_test BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_test_results_report_id ON report_test_results(report_id);
CREATE INDEX IF NOT EXISTS idx_report_test_results_sample_result_id ON report_test_results(sample_test_result_id);
CREATE INDEX IF NOT EXISTS idx_report_test_results_scope_test_id ON report_test_results(project_scope_test_id);

DROP TRIGGER IF EXISTS trg_report_test_results_updated_at ON report_test_results;
CREATE TRIGGER trg_report_test_results_updated_at
BEFORE UPDATE ON report_test_results
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_common();

-- =========================================================
-- 6) REPORT EXTRA FIELDS
-- Replaces old JSON extra_fields approach with relational rows.
-- Example: Observation, Note, Reference, Material Grade, etc.
-- =========================================================
CREATE TABLE IF NOT EXISTS report_extra_fields (
    report_extra_field_id BIGSERIAL PRIMARY KEY,
    report_id BIGINT NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,
    field_label VARCHAR(255) NOT NULL,
    field_value TEXT,
    sequence_no INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_extra_fields_report_id ON report_extra_fields(report_id);

DROP TRIGGER IF EXISTS trg_report_extra_fields_updated_at ON report_extra_fields;
CREATE TRIGGER trg_report_extra_fields_updated_at
BEFORE UPDATE ON report_extra_fields
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_common();

-- =========================================================
-- 7) REPORT STATUS HISTORY
-- =========================================================
CREATE TABLE IF NOT EXISTS report_status_history (
    report_status_history_id BIGSERIAL PRIMARY KEY,
    report_id BIGINT NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL CHECK (
        new_status IN (
            'draft',
            'in_progress',
            'under_review',
            'revision_requested',
            'approved',
            'issued',
            'rejected'
        )
    ),
    comment TEXT,
    action_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    action_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_status_history_report_id ON report_status_history(report_id);
CREATE INDEX IF NOT EXISTS idx_report_status_history_action_at ON report_status_history(action_at);

-- =========================================================
-- 8) OPTIONAL HELPER VIEW
-- Easy list page query for report listing
-- =========================================================
CREATE OR REPLACE VIEW vw_report_list AS
SELECT
    r.report_id,
    r.lab_id,
    r.project_id,
    r.sample_id,
    COALESCE(r.report_no, r.report_number) AS report_no,
    COALESCE(r.report_title, p.project_name || ' Report') AS report_title,
    p.project_code,
    p.project_name,
    s.sample_code,
    s.sample_name,
    s.sample_type,
    r.report_status,
    r.issue_date,
    r.created_at,
    r.updated_at
FROM reports r
JOIN projects p ON p.project_id = r.project_id
LEFT JOIN samples s ON s.sample_id = r.sample_id;

COMMIT;
