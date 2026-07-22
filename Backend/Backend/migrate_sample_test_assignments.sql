-- Migration script to add scope_test_ids column and drop scope_test_id column
ALTER TABLE public.sample_test_assignments ADD COLUMN IF NOT EXISTS scope_test_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sample_test_assignments DROP COLUMN IF EXISTS scope_test_id CASCADE;
