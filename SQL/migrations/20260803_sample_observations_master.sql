-- Migration Script: Create & Configure sample_observations Master Table
-- Date: 2026-08-03
-- Target Dialect: PostgreSQL

CREATE TABLE IF NOT EXISTS sample_observations (
    observation_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    sample_id BIGINT NOT NULL,
    scope_test_id BIGINT,
    template_id BIGINT REFERENCES observation_templates(template_id) ON DELETE SET NULL,
    test_name VARCHAR(255) NOT NULL,
    test_method VARCHAR(255),
    operator_name VARCHAR(255) DEFAULT 'Lab Technician',
    sheets_data JSONB NOT NULL DEFAULT '{}',
    merges_data JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    equipment_id VARCHAR(50),
    equipment_name VARCHAR(255),
    equipment_cert_no VARCHAR(100),
    equipment_validity_date DATE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sample_obs_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    CONSTRAINT fk_sample_obs_sample FOREIGN KEY (sample_id) REFERENCES sample_receipt_register(sample_id) ON DELETE CASCADE
);

-- Ensure template_id column and indices exist
ALTER TABLE sample_observations ALTER COLUMN scope_test_id DROP NOT NULL;
ALTER TABLE sample_observations ADD COLUMN IF NOT EXISTS template_id BIGINT REFERENCES observation_templates(template_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sample_observations_sample ON sample_observations(sample_id);
CREATE INDEX IF NOT EXISTS idx_sample_observations_project ON sample_observations(project_id);
CREATE INDEX IF NOT EXISTS idx_sample_observations_template ON sample_observations(template_id);
