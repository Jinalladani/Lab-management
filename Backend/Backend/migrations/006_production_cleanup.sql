-- SmartLab LIMS Migration 006: Production Cleanup & Schema Consolidation
-- Consolidates all runtime DDL statements into a single, clean database migration.

-- 1. Ensure sample_receipt_register columns exist
ALTER TABLE public.sample_receipt_register
    ADD COLUMN IF NOT EXISTS quantity_received INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS quantity_allocated INTEGER DEFAULT 0,
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

-- 2. Ensure testing_samples table exists
CREATE TABLE IF NOT EXISTS public.testing_samples (
    testing_sample_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT,
    project_id BIGINT REFERENCES public.projects(project_id) ON DELETE CASCADE,
    receipt_id BIGINT REFERENCES public.sample_receipt_register(sample_id) ON DELETE CASCADE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Ensure sample_observations columns and constraints exist
ALTER TABLE public.sample_observations DROP CONSTRAINT IF EXISTS fk_sample_obs_sample;
ALTER TABLE public.sample_observations DROP CONSTRAINT IF EXISTS fk_sample_obs_project;
ALTER TABLE public.sample_observations ADD COLUMN IF NOT EXISTS testing_sample_id BIGINT;
ALTER TABLE public.sample_observations ADD COLUMN IF NOT EXISTS template_id BIGINT;
ALTER TABLE public.sample_observations ADD COLUMN IF NOT EXISTS scope_test_id BIGINT;
ALTER TABLE public.sample_observations ALTER COLUMN scope_test_id DROP NOT NULL;

-- 4. Ensure observation_templates builder tables and columns exist
ALTER TABLE public.observation_templates ADD COLUMN IF NOT EXISTS scope_test_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.observation_templates
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS material VARCHAR(255),
    ADD COLUMN IF NOT EXISTS test VARCHAR(255),
    ADD COLUMN IF NOT EXISTS standard VARCHAR(255),
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS material_id BIGINT,
    ADD COLUMN IF NOT EXISTS test_id BIGINT,
    ADD COLUMN IF NOT EXISTS standard_id BIGINT;

CREATE TABLE IF NOT EXISTS public.observation_template_materials (
    material_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    created_by VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.observation_template_tests (
    test_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    created_by VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.observation_template_standards (
    standard_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    created_by VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.observation_template_builder_data (
    builder_data_id BIGSERIAL PRIMARY KEY,
    template_id BIGINT NOT NULL UNIQUE REFERENCES observation_templates(template_id) ON DELETE CASCADE,
    sections JSONB NOT NULL DEFAULT '[]',
    components JSONB NOT NULL DEFAULT '[]',
    properties JSONB NOT NULL DEFAULT '{}',
    component_order JSONB NOT NULL DEFAULT '[]',
    formula_mapping JSONB NOT NULL DEFAULT '{}',
    report_mapping JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Ensure sample_test_assignments columns and index exist
ALTER TABLE public.sample_test_assignments
    ADD COLUMN IF NOT EXISTS scope_test_id BIGINT,
    ADD COLUMN IF NOT EXISTS scope_test_ids JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS testing_sample_id BIGINT REFERENCES public.testing_samples(testing_sample_id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS project_scope_test_id BIGINT REFERENCES public.project_scope_tests(project_scope_test_id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS assignment_batch_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS assigned_by BIGINT REFERENCES public.users(user_id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_testing_sample_pst 
ON public.sample_test_assignments (testing_sample_id, project_scope_test_id) 
WHERE testing_sample_id IS NOT NULL AND project_scope_test_id IS NOT NULL;

-- 6. Safe Roles constraint drop if present
ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_role_name_check;
