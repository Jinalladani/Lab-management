-- =========================================
-- Sample Table SQL (Lab Management System)
-- =========================================

BEGIN;

CREATE TABLE IF NOT EXISTS samples (
    sample_id BIGSERIAL PRIMARY KEY,

    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,

    sample_code VARCHAR(100) UNIQUE NOT NULL,

    sample_quantity VARCHAR(50),

    collect_date DATE,

    collected_by VARCHAR(255),

    collection_mode VARCHAR(50) CHECK (
        collection_mode IN ('courier', 'in_person')
    ),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for auto updating updated_at

CREATE OR REPLACE FUNCTION set_updated_at_samples()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_samples_updated_at ON samples;

CREATE TRIGGER trg_samples_updated_at
BEFORE UPDATE ON samples
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_samples();

COMMIT;
