-- Migration to add newly required fields to the equipment table and support equipment attachments/documents.

ALTER TABLE equipment
ADD COLUMN IF NOT EXISTS asset_tag VARCHAR(100),
ADD COLUMN IF NOT EXISTS warranty_expiry_date DATE,
ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(100),
ADD COLUMN IF NOT EXISTS purchase_cost DECIMAL(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS capacity VARCHAR(100),
ADD COLUMN IF NOT EXISTS unit VARCHAR(50),
ADD COLUMN IF NOT EXISTS software VARCHAR(100),
ADD COLUMN IF NOT EXISTS other_specification TEXT,
ADD COLUMN IF NOT EXISTS internal_check_frequency VARCHAR(50) DEFAULT '12 Months',
ADD COLUMN IF NOT EXISTS nabl_accredited BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS traceability_details TEXT,
ADD COLUMN IF NOT EXISTS calibration_method TEXT,
ADD COLUMN IF NOT EXISTS next_internal_check_date DATE,
ADD COLUMN IF NOT EXISTS reminder_before_days INT DEFAULT 30;

CREATE TABLE IF NOT EXISTS equipment_documents (
    doc_id SERIAL PRIMARY KEY,
    equipment_id VARCHAR(50) NOT NULL REFERENCES equipment(equipment_id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- 'Calibration Certificate', 'Invoice / Purchase Bill', 'Equipment Manual', 'AMC / Service Contract', 'Photograph', 'Other Document'
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
