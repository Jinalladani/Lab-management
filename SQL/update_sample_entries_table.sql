-- =========================================================
-- UPDATE SAMPLE_ENTRIES TABLE WITH ADDITIONAL FIELDS
-- =========================================================

BEGIN;

-- Add new columns to sample_entries table
ALTER TABLE sample_entries 
ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS sample_source VARCHAR(20) NOT NULL DEFAULT 'in_person'
    CHECK (sample_source IN ('courier', 'in_person')),
ADD COLUMN IF NOT EXISTS collected_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS received_date DATE DEFAULT CURRENT_DATE;

-- Update existing records to set default values
UPDATE sample_entries 
SET receiver_name = 'Lab Reception', 
    sample_source = 'in_person',
    received_date = CURRENT_DATE
WHERE receiver_name IS NULL;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_sample_entries_collected_by 
ON sample_entries(collected_by);

CREATE INDEX IF NOT EXISTS idx_sample_entries_sample_source 
ON sample_entries(sample_source);

CREATE INDEX IF NOT EXISTS idx_sample_entries_received_date 
ON sample_entries(received_date);

COMMIT;

SELECT 'Sample entries table updated successfully!' AS status;
