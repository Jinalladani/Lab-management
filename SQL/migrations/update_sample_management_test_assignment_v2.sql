-- =============================================================
-- Migration: Sample Management & Test Assignment Upgrade v2
-- Description: Non-destructive update for unified sample data model,
--              sample_required_tests, and atomic test assignments.
-- =============================================================

BEGIN;

-- 1. Enhance sample_receipt_register with geotechnical & identification attributes
ALTER TABLE public.sample_receipt_register
    ADD COLUMN IF NOT EXISTS location_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS borelog_no VARCHAR(100),
    ADD COLUMN IF NOT EXISTS depth_from NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS depth_to NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS depth_unit VARCHAR(20) DEFAULT 'm',
    ADD COLUMN IF NOT EXISTS material_id BIGINT,
    ADD COLUMN IF NOT EXISTS sample_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS sample_description TEXT,
    ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(50),
    ADD COLUMN IF NOT EXISTS client_reference VARCHAR(200),
    ADD COLUMN IF NOT EXISTS collected_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS collection_mode VARCHAR(100);

-- 2. Create sample_required_tests table for per-sample required test tracking
CREATE TABLE IF NOT EXISTS public.sample_required_tests (
    sample_required_test_id BIGSERIAL PRIMARY KEY,
    sample_id BIGINT NOT NULL REFERENCES public.sample_receipt_register(sample_id) ON DELETE CASCADE,
    project_scope_test_id BIGINT NOT NULL REFERENCES public.project_scope_tests(project_scope_test_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sample_required_tests UNIQUE (sample_id, project_scope_test_id)
);

-- 3. Upgrade sample_test_assignments table for atomic 1 sample + 1 test work items
ALTER TABLE public.sample_test_assignments
    ADD COLUMN IF NOT EXISTS project_scope_test_id BIGINT REFERENCES public.project_scope_tests(project_scope_test_id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS assignment_batch_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS assigned_by BIGINT REFERENCES public.users(user_id) ON DELETE SET NULL;

-- Backfill project_scope_test_id for existing single assignment rows if scope_test_ids contains single element or scope_test_id exists
DO $$
BEGIN
    -- If scope_test_id exists on sample_test_assignments, set project_scope_test_id from it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='sample_test_assignments' AND column_name='scope_test_id'
    ) THEN
        UPDATE public.sample_test_assignments 
        SET project_scope_test_id = scope_test_id 
        WHERE project_scope_test_id IS NULL AND scope_test_id IS NOT NULL;
    END IF;
END $$;

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_sample_receipt_project_loc_bh 
    ON public.sample_receipt_register(project_id, location_name, borelog_no);

CREATE INDEX IF NOT EXISTS idx_sample_required_tests_sample_id 
    ON public.sample_required_tests(sample_id);

CREATE INDEX IF NOT EXISTS idx_sample_required_tests_pst_id 
    ON public.sample_required_tests(project_scope_test_id);

CREATE INDEX IF NOT EXISTS idx_sample_test_assignments_sample_pst 
    ON public.sample_test_assignments(sample_id, project_scope_test_id);

CREATE INDEX IF NOT EXISTS idx_sample_test_assignments_batch 
    ON public.sample_test_assignments(assignment_batch_id);

CREATE INDEX IF NOT EXISTS idx_sample_test_assignments_assigned_to 
    ON public.sample_test_assignments(assigned_to, status);

CREATE INDEX IF NOT EXISTS idx_sample_test_assignments_target_date 
    ON public.sample_test_assignments(target_date);

COMMIT;
