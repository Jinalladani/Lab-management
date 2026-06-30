-- Sample receipt register fields for drawer workflow
BEGIN;

ALTER TABLE sample_entries DROP CONSTRAINT IF EXISTS sample_entries_status_check;

ALTER TABLE sample_entries
ADD COLUMN IF NOT EXISTS sample_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS testing_team VARCHAR(255),
ADD COLUMN IF NOT EXISTS test_types JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS sample_entry_documents (
    document_id BIGSERIAL PRIMARY KEY,
    sample_entry_id BIGINT NOT NULL REFERENCES sample_entries(sample_entry_id) ON DELETE CASCADE,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    document_type VARCHAR(100),
    created_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sample_entry_documents_entry
ON sample_entry_documents(sample_entry_id);

COMMIT;

SELECT 'Sample register migration completed!' AS status;
