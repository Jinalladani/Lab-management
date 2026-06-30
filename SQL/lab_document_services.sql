BEGIN;

-- =========================================================
-- Table: lab_document_services
-- =========================================================

CREATE TABLE IF NOT EXISTS lab_document_services (
    id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,

    -- Document Details
    doc_no VARCHAR(50),
    issue_no VARCHAR(50),
    amend_no VARCHAR(50),
    doc_name VARCHAR(255),
    issue_date DATE,
    amend_date DATE,
    copy_no VARCHAR(50),
    section_no VARCHAR(50),

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'deleted')),

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- Add missing columns (safe migration)
-- =========================================================

ALTER TABLE lab_document_services
    ADD COLUMN IF NOT EXISTS lab_id BIGINT,
    ADD COLUMN IF NOT EXISTS doc_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS issue_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS amend_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS doc_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS issue_date DATE,
    ADD COLUMN IF NOT EXISTS amend_date DATE,
    ADD COLUMN IF NOT EXISTS copy_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS section_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- =========================================================
-- Indexes
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_lab_document_services_lab_id
    ON lab_document_services(lab_id);

CREATE INDEX IF NOT EXISTS idx_lab_document_services_status
    ON lab_document_services(status);

CREATE INDEX IF NOT EXISTS idx_lab_document_services_doc_no
    ON lab_document_services(doc_no);

-- =========================================================
-- Trigger for updated_at
-- =========================================================

CREATE OR REPLACE FUNCTION update_lab_document_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lab_document_services_updated_at
ON lab_document_services;

CREATE TRIGGER trigger_lab_document_services_updated_at
    BEFORE UPDATE ON lab_document_services
    FOR EACH ROW
    EXECUTE FUNCTION update_lab_document_services_updated_at();

-- =========================================================
-- Default Data Insert
-- =========================================================

INSERT INTO lab_document_services (
    lab_id,
    doc_no,
    issue_no,
    amend_no,
    doc_name,
    issue_date,
    amend_date,
    copy_no,
    section_no,
    status,
    created_at,
    updated_at
)
SELECT
    l.lab_id,
    'GOMAEC/FF/01',
    '04',
    '01',
    'FORMS & FORMATS (LEVEL-4)',
    DATE '2018-11-11',
    DATE '2023-01-18',
    '1',
    '6.6F-01',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM labs l
WHERE NOT EXISTS (
    SELECT 1
    FROM lab_document_services ds
    WHERE ds.lab_id = l.lab_id
);

COMMIT;