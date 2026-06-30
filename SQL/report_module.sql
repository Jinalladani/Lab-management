BEGIN;

-- =========================================
-- 1) REPORTS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS reports (
    report_id BIGSERIAL PRIMARY KEY,

    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,

    report_number VARCHAR(100) UNIQUE NOT NULL,
    report_title VARCHAR(255),

    report_create_date DATE NOT NULL DEFAULT CURRENT_DATE,
    report_date DATE,

    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'submitted', 'revision', 'approved', 'rejected')
    ),

    extra_fields JSONB, -- custom inputs (allowed)

    remarks TEXT,

    created_by BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    approved_by BIGINT REFERENCES users(user_id) ON DELETE SET NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- 2) REPORT SCOPE RESULTS (NO JSON)
-- =========================================
CREATE TABLE IF NOT EXISTS report_scope_results (
    report_scope_result_id BIGSERIAL PRIMARY KEY,

    report_id BIGINT NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,

    group_id BIGINT NOT NULL REFERENCES scope_groups(group_id) ON DELETE CASCADE,
    material_id BIGINT NOT NULL REFERENCES scope_materials(material_id) ON DELETE CASCADE,
    scope_test_id BIGINT NOT NULL REFERENCES scope_tests(scope_test_id) ON DELETE CASCADE,

    result_value VARCHAR(255),
    unit VARCHAR(100),
    remark TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (report_id, scope_test_id)
);

-- =========================================
-- 3) REPORT STATUS HISTORY
-- =========================================
CREATE TABLE IF NOT EXISTS report_status_history (
    report_status_history_id BIGSERIAL PRIMARY KEY,

    report_id BIGINT NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,

    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL CHECK (
        new_status IN ('draft', 'submitted', 'revision', 'approved', 'rejected')
    ),

    comment TEXT,

    action_by BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    action_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- TRIGGERS (updated_at)
-- =========================================
CREATE OR REPLACE FUNCTION set_updated_at_reports()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reports_updated_at ON reports;
CREATE TRIGGER trg_reports_updated_at
BEFORE UPDATE ON reports
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_reports();

DROP TRIGGER IF EXISTS trg_report_scope_results_updated_at ON report_scope_results;
CREATE TRIGGER trg_report_scope_results_updated_at
BEFORE UPDATE ON report_scope_results
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_reports();

COMMIT;