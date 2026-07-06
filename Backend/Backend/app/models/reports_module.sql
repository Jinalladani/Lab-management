-- Database Table Script for Reports Management Module
-- Database Dialect: PostgreSQL

-- 1. Report Templates configurations
CREATE TABLE IF NOT EXISTS report_templates (
    template_id BIGSERIAL PRIMARY KEY,
    test_name VARCHAR(255) UNIQUE NOT NULL,
    sections_config JSONB NOT NULL DEFAULT '[]', -- Ordered list of report layout components/sections
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- 3. Report Versions (Historical Revisions Log)
CREATE TABLE IF NOT EXISTS report_versions (
    version_id BIGSERIAL PRIMARY KEY,
    report_id BIGINT NOT NULL,
    version_number INTEGER NOT NULL,
    pdf_file_path TEXT NOT NULL,
    change_log TEXT,
    created_by BIGINT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_version_report FOREIGN KEY (report_id) REFERENCES reports(report_id) ON DELETE CASCADE,
    CONSTRAINT fk_version_user FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 4. Report Approvals workflow tracker
CREATE TABLE IF NOT EXISTS report_approvals (
    approval_id BIGSERIAL PRIMARY KEY,
    report_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(100) NOT NULL, -- Worker, Engineer, QM, Admin
    status VARCHAR(50) NOT NULL, -- Approved, Rejected
    remarks TEXT,
    signature_hash VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_approval_report FOREIGN KEY (report_id) REFERENCES reports(report_id) ON DELETE CASCADE,
    CONSTRAINT fk_approval_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 5. Report Attachments
CREATE TABLE IF NOT EXISTS report_attachments (
    attachment_id BIGSERIAL PRIMARY KEY,
    report_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attachment_report FOREIGN KEY (report_id) REFERENCES reports(report_id) ON DELETE CASCADE
);

-- Indices for rapid queries
CREATE INDEX IF NOT EXISTS idx_report_versions_report ON report_versions(report_id);
CREATE INDEX IF NOT EXISTS idx_report_approvals_report ON report_approvals(report_id);
CREATE INDEX IF NOT EXISTS idx_report_attachments_report ON report_attachments(report_id);
