-- Database Table Script for Observation Templates Master
-- Database Dialect: PostgreSQL

CREATE TABLE IF NOT EXISTS observation_templates (
    template_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    scope_test_id BIGINT NOT NULL,
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    sheets_data JSONB NOT NULL DEFAULT '{}',
    merges_data JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_observation_template_scope_test FOREIGN KEY (scope_test_id) REFERENCES scope_tests(scope_test_id) ON DELETE CASCADE
);

-- Index to optimize search by scope_test_id
CREATE INDEX IF NOT EXISTS idx_observation_templates_scope_test ON observation_templates(scope_test_id);
