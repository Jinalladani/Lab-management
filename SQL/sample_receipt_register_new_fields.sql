-- Add new Sample Receipt Register fields
BEGIN;

ALTER TABLE sample_receipt_register
ADD COLUMN IF NOT EXISTS sample_receipt_no VARCHAR(100),
ADD COLUMN IF NOT EXISTS sample_received_date DATE,
ADD COLUMN IF NOT EXISTS sample_source VARCHAR(100),
ADD COLUMN IF NOT EXISTS received_condition VARCHAR(100),
ADD COLUMN IF NOT EXISTS sample_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS sample_priority VARCHAR(50) DEFAULT 'Normal',
ADD COLUMN IF NOT EXISTS status VARCHAR(100) DEFAULT 'Received';

-- Backfill existing rows before NOT NULL constraints
UPDATE sample_receipt_register
SET sample_received_date = COALESCE(sample_received_date, received_date, CURRENT_DATE),
    sample_receipt_no = COALESCE(
        sample_receipt_no,
        'SRR-' || TO_CHAR(COALESCE(received_date, CURRENT_DATE), 'YYYY') || '-' || LPAD(sample_id::TEXT, 3, '0')
    ),
    sample_source = COALESCE(sample_source, 'Site'),
    received_condition = COALESCE(received_condition, 'Good'),
    sample_priority = COALESCE(sample_priority, 'Normal'),
    status = COALESCE(status, 'Received');

ALTER TABLE sample_receipt_register
ALTER COLUMN sample_receipt_no SET NOT NULL,
ALTER COLUMN sample_received_date SET NOT NULL,
ALTER COLUMN sample_source SET NOT NULL,
ALTER COLUMN received_condition SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sample_receipt_register_receipt_no
    ON sample_receipt_register(sample_receipt_no);

CREATE INDEX IF NOT EXISTS idx_sample_receipt_register_status
    ON sample_receipt_register(status);

CREATE INDEX IF NOT EXISTS idx_sample_receipt_register_priority
    ON sample_receipt_register(sample_priority);

CREATE INDEX IF NOT EXISTS idx_sample_receipt_register_received_date
    ON sample_receipt_register(sample_received_date);

COMMIT;

SELECT 'Sample receipt register new fields migration completed!' AS status;
