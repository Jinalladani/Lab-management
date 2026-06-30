-- Additional fields for project drawer multi-sample entry
BEGIN;

ALTER TABLE sample_entries
ADD COLUMN IF NOT EXISTS sample_category VARCHAR(100),
ADD COLUMN IF NOT EXISTS material_type_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'NOS',
ADD COLUMN IF NOT EXISTS testing_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255);

COMMIT;

SELECT 'Sample entry drawer fields added!' AS status;
