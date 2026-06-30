BEGIN;

ALTER TABLE sample_receipt_register
ADD COLUMN IF NOT EXISTS letter_date DATE;

UPDATE sample_receipt_register
SET letter_date = COALESCE(letter_date, sample_received_date, received_date, CURRENT_DATE)
WHERE letter_date IS NULL;

ALTER TABLE sample_receipt_register
ALTER COLUMN letter_date SET NOT NULL;

ALTER TABLE sample_receipt_register
ALTER COLUMN sample_no SET NOT NULL;

DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = current_schema()
          AND tc.table_name = 'sample_receipt_register'
          AND ccu.column_name = 'sample_receipt_no'
    LOOP
        EXECUTE format('ALTER TABLE sample_receipt_register DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;
END $$;

DROP INDEX IF EXISTS idx_sample_receipt_register_receipt_no;

ALTER TABLE sample_receipt_register
DROP COLUMN IF EXISTS sample_receipt_no;

CREATE INDEX IF NOT EXISTS idx_sample_receipt_register_letter_date
    ON sample_receipt_register(letter_date);

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

SELECT 'Sample letter date and project registration migration completed!' AS status;
