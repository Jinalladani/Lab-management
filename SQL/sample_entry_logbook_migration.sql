-- =========================================================
-- SAMPLE ENTRY LOGBOOK FIELDS + IMAGES
-- Matches physical sample register columns
-- =========================================================

BEGIN;

-- New logbook columns on sample_entries
ALTER TABLE sample_entries
ADD COLUMN IF NOT EXISTS sr_no INTEGER,
ADD COLUMN IF NOT EXISTS project_no VARCHAR(100),
ADD COLUMN IF NOT EXISTS letter_date DATE,
ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS material_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS test_performed_by VARCHAR(255) DEFAULT 'Testing Team',
ADD COLUMN IF NOT EXISTS testing_start_date DATE,
ADD COLUMN IF NOT EXISTS testing_completed_date DATE;

-- Relax legacy constraints so simplified entries work
ALTER TABLE sample_entries ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE sample_entries ALTER COLUMN sample_type_id DROP NOT NULL;
ALTER TABLE sample_entries ALTER COLUMN quantity DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sample_entries_sr_no ON sample_entries(sr_no);
CREATE INDEX IF NOT EXISTS idx_sample_entries_project_no ON sample_entries(project_no);
CREATE INDEX IF NOT EXISTS idx_sample_entries_client_name ON sample_entries(client_name);
CREATE INDEX IF NOT EXISTS idx_sample_entries_material_name ON sample_entries(material_name);

-- Sample entry images (multiple per entry)
CREATE TABLE IF NOT EXISTS sample_entry_images (
    image_id BIGSERIAL PRIMARY KEY,
    sample_entry_id BIGINT NOT NULL REFERENCES sample_entries(sample_entry_id) ON DELETE CASCADE,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    created_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sample_entry_images_entry
ON sample_entry_images(sample_entry_id);

CREATE INDEX IF NOT EXISTS idx_sample_entry_images_lab
ON sample_entry_images(lab_id);

COMMIT;

SELECT 'Sample entry logbook migration completed!' AS status;
