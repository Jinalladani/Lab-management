-- Sample Receipt Register (full schema with extended fields)
BEGIN;

CREATE TABLE IF NOT EXISTS sample_receipt_register (
    sample_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    project_code VARCHAR(100) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    sample_no VARCHAR(100) NOT NULL,
    letter_date DATE NOT NULL,
    sample_received_date DATE NOT NULL,
    sample_source VARCHAR(100) NOT NULL,
    received_condition VARCHAR(100) NOT NULL,
    sample_location VARCHAR(255),
    sample_priority VARCHAR(50) DEFAULT 'Normal',
    status VARCHAR(100) DEFAULT 'Received',
    material_name VARCHAR(255) NOT NULL,
    quantity VARCHAR(100) NOT NULL,
    received_date DATE NOT NULL,
    received_by VARCHAR(255) NOT NULL,
    remarks TEXT,
    created_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_id ON sample_receipt_register(project_id);
CREATE INDEX IF NOT EXISTS idx_sample_no ON sample_receipt_register(sample_no);
CREATE INDEX IF NOT EXISTS idx_sample_receipt_register_letter_date ON sample_receipt_register(letter_date);
CREATE INDEX IF NOT EXISTS idx_sample_receipt_register_status ON sample_receipt_register(status);
CREATE INDEX IF NOT EXISTS idx_sample_receipt_register_priority ON sample_receipt_register(sample_priority);
CREATE INDEX IF NOT EXISTS idx_sample_receipt_register_received_date ON sample_receipt_register(sample_received_date);

CREATE TABLE IF NOT EXISTS sample_receipt_photos (
    photo_id BIGSERIAL PRIMARY KEY,
    sample_id BIGINT NOT NULL REFERENCES sample_receipt_register(sample_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    created_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sample_receipt_photos_sample ON sample_receipt_photos(sample_id);

CREATE TABLE IF NOT EXISTS project_registration (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    registration_no VARCHAR(100) NOT NULL,
    job_no VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_registration_project UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_registration_project_id
    ON project_registration(project_id);

COMMIT;

SELECT 'Sample receipt register migration completed!' AS status;
