-- Database Table Script for Sample Observations Data Entry
-- Database Dialect: PostgreSQL

CREATE TABLE IF NOT EXISTS sample_observations (
    observation_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    sample_id BIGINT NOT NULL,
    scope_test_id BIGINT NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    test_method VARCHAR(255),
    operator_name VARCHAR(255) DEFAULT 'Lab Technician',
    sheets_data JSONB NOT NULL DEFAULT '{}',
    merges_data JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sample_obs_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    CONSTRAINT fk_sample_obs_sample FOREIGN KEY (sample_id) REFERENCES sample_receipt_register(sample_id) ON DELETE CASCADE,
    CONSTRAINT fk_sample_obs_scope_test FOREIGN KEY (scope_test_id) REFERENCES scope_tests(scope_test_id) ON DELETE CASCADE
);

-- Indexing sample_id for rapid retrieval of sample-specific logs
CREATE INDEX IF NOT EXISTS idx_sample_observations_sample ON sample_observations(sample_id);
