-- =========================================================
-- Observation Form Workflow Upgrade
-- Purpose:
-- 1) Support clean form-based observation entry
-- 2) Keep Excel only for preview/download/print
-- 3) Extend template cell mapping with form metadata
-- Run after:
--   SQL/observation_module.sql
--   SQL/migrations/production_observation_excel_engine.sql
-- =========================================================

BEGIN;

ALTER TABLE observation_template_cells
    ADD COLUMN IF NOT EXISTS form_label VARCHAR(255),
    ADD COLUMN IF NOT EXISTS placeholder TEXT,
    ADD COLUMN IF NOT EXISTS help_text TEXT,
    ADD COLUMN IF NOT EXISTS section_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS form_sequence INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS auto_source VARCHAR(255),
    ADD COLUMN IF NOT EXISTS formula_expression TEXT,
    ADD COLUMN IF NOT EXISTS show_in_form BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE observation_template_cells
SET form_label = COALESCE(NULLIF(form_label, ''), display_name)
WHERE form_label IS NULL OR form_label = '';

UPDATE observation_template_cells
SET form_sequence = COALESCE(sequence, 1)
WHERE form_sequence = 1;

ALTER TABLE observation_template_cells
    DROP CONSTRAINT IF EXISTS chk_observation_template_cells_field_type;

ALTER TABLE observation_template_cells
    ADD CONSTRAINT chk_observation_template_cells_field_type
    CHECK (
        field_type IN (
            'Text',
            'Number',
            'Date',
            'Dropdown',
            'Formula',
            'Boolean',
            'Checkbox',
            'Textarea',
            'Radio',
            'AutoValue',
            'Readonly'
        )
    );

CREATE INDEX IF NOT EXISTS idx_observation_template_cells_form_sequence
ON observation_template_cells(template_id, sheet_id, form_sequence);

CREATE INDEX IF NOT EXISTS idx_observation_template_cells_section
ON observation_template_cells(template_id, section_name);

CREATE INDEX IF NOT EXISTS idx_observation_template_cells_auto_source
ON observation_template_cells(template_id, auto_source);

CREATE INDEX IF NOT EXISTS idx_observation_template_cells_show_in_form
ON observation_template_cells(template_id, show_in_form);

COMMIT;
