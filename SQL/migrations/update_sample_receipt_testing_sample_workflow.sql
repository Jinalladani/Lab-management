-- =============================================================
-- Migration: Revised Sample Receipt & Testing Sample Workflow
-- Description: Adds quantity tracking to sample_receipt_register,
--              creates testing_samples table for physical specimen identity,
--              and links sample_test_assignments to testing_samples.
-- =============================================================

BEGIN;

-- 1. Add quantity tracking fields to sample_receipt_register
ALTER TABLE public.sample_receipt_register ADD COLUMN IF NOT EXISTS quantity_received INTEGER DEFAULT 1;
ALTER TABLE public.sample_receipt_register ADD COLUMN IF NOT EXISTS quantity_allocated INTEGER DEFAULT 0;

-- Backfill quantity_received from string quantity column if numeric
UPDATE public.sample_receipt_register
SET quantity_received = CASE 
    WHEN quantity ~ '^[0-9]+$' THEN quantity::INTEGER 
    ELSE 1 
END
WHERE quantity_received IS NULL OR quantity_received = 1;

-- 2. Create testing_samples table for physical specimen identity
CREATE TABLE IF NOT EXISTS public.testing_samples (
    testing_sample_id BIGSERIAL PRIMARY KEY,
    receipt_id BIGINT NOT NULL REFERENCES public.sample_receipt_register(sample_id) ON DELETE CASCADE,
    project_id BIGINT NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
    sample_code VARCHAR(100) NOT NULL,
    location_name VARCHAR(255),
    borelog_no VARCHAR(100),
    depth_from NUMERIC(10, 2),
    depth_to NUMERIC(10, 2),
    depth_unit VARCHAR(20) DEFAULT 'm',
    client_sample_reference VARCHAR(200),
    sample_description TEXT,
    material_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active',
    created_by BIGINT REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add testing_sample_id to sample_test_assignments
ALTER TABLE public.sample_test_assignments ADD COLUMN IF NOT EXISTS testing_sample_id BIGINT REFERENCES public.testing_samples(testing_sample_id) ON DELETE CASCADE;

-- 4. Backfill existing sample_receipt_register rows into testing_samples
DO $$
DECLARE
    r RECORD;
    new_ts_id BIGINT;
BEGIN
    FOR r IN 
        SELECT srr.* 
        FROM public.sample_receipt_register srr
        LEFT JOIN public.testing_samples ts ON ts.receipt_id = srr.sample_id
        WHERE ts.testing_sample_id IS NULL
    LOOP
        INSERT INTO public.testing_samples (
            receipt_id, project_id, sample_code, location_name, borelog_no,
            depth_from, depth_to, depth_unit, client_sample_reference,
            sample_description, material_name, created_by, created_at, updated_at
        ) VALUES (
            r.sample_id, r.project_id, COALESCE(r.sample_no, 'TS-' || r.sample_id),
            r.location_name, r.borelog_no, r.depth_from, r.depth_to,
            COALESCE(r.depth_unit, 'm'), r.client_reference, r.sample_description,
            r.material_name, r.created_by, COALESCE(r.created_at, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
        ) RETURNING testing_sample_id INTO new_ts_id;

        -- Link existing assignments for this sample_id to the new testing_sample_id
        UPDATE public.sample_test_assignments
        SET testing_sample_id = new_ts_id
        WHERE sample_id = r.sample_id AND testing_sample_id IS NULL;
    END LOOP;
END $$;

-- Update quantity_allocated on sample_receipt_register based on physical testing_samples count
UPDATE public.sample_receipt_register srr
SET quantity_allocated = (
    SELECT COUNT(*) FROM public.testing_samples ts WHERE ts.receipt_id = srr.sample_id
);

-- 5. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_testing_samples_receipt_id 
    ON public.testing_samples(receipt_id);

CREATE INDEX IF NOT EXISTS idx_testing_samples_project_loc_bh 
    ON public.testing_samples(project_id, location_name, borelog_no);

CREATE INDEX IF NOT EXISTS idx_sample_test_assignments_testing_sample 
    ON public.sample_test_assignments(testing_sample_id);

COMMIT;
