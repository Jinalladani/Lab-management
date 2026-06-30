BEGIN;

-- Add raw_observation_data JSONB to sample_test_results
ALTER TABLE sample_test_results 
ADD COLUMN IF NOT EXISTS raw_observation_data JSONB NULL;

-- Add raw_observation_data JSONB to report_test_results (to snapshot it for reports)
ALTER TABLE report_test_results 
ADD COLUMN IF NOT EXISTS raw_observation_data JSONB NULL;

COMMIT;
