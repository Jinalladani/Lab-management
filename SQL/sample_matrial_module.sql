BEGIN;

-- =========================================================
-- 1) SAMPLE TYPES MASTER
-- =========================================================
CREATE TABLE IF NOT EXISTS sample_types (
    sample_type_id BIGSERIAL PRIMARY KEY,
    sample_type_name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Default sample types
INSERT INTO sample_types (sample_type_name, description)
VALUES
    ('Cement', 'Cement sample'),
    ('C.C Cube', 'Concrete Cube sample'),
    ('Soil', 'Soil sample'),
    ('Steel', 'Steel sample'),
    ('Aggregate', 'Aggregate sample'),
    ('Bitumen', 'Bitumen sample'),
    ('Water', 'Water sample'),
    ('Rock', 'Rock sample')
ON CONFLICT (sample_type_name) DO NOTHING;


-- =========================================================
-- 2) SAMPLE TYPE TESTS (Default mapping)
-- =========================================================
CREATE TABLE IF NOT EXISTS sample_type_tests (
    sample_type_test_id BIGSERIAL PRIMARY KEY,
    sample_type_id BIGINT NOT NULL REFERENCES sample_types(sample_type_id) ON DELETE CASCADE,

    test_name VARCHAR(255) NOT NULL,
    description TEXT,
    default_days INTEGER,

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sample_type_tests_sample_type_id
ON sample_type_tests(sample_type_id);


-- =========================================================
-- 3) SAMPLE CONDITIONS MASTER
-- =========================================================
CREATE TABLE IF NOT EXISTS sample_conditions (
    sample_condition_id BIGSERIAL PRIMARY KEY,
    condition_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO sample_conditions (condition_name)
VALUES
    ('Good'),
    ('OK'),
    ('Damaged'),
    ('Wet'),
    ('Dry'),
    ('Sealed'),
    ('Unsealed'),
    ('Rejected')
ON CONFLICT (condition_name) DO NOTHING;


-- =========================================================
-- 4) SAMPLE LOCATIONS MASTER (Lab-wise)
-- =========================================================
CREATE TABLE IF NOT EXISTS sample_locations (
    sample_location_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,

    location_name VARCHAR(150) NOT NULL,
    description TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    created_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (lab_id, location_name)
);

CREATE INDEX idx_sample_locations_lab_id
ON sample_locations(lab_id);


-- =========================================================
-- 5) UPDATE EXISTING SAMPLES TABLE (HEADER LEVEL)
-- =========================================================
ALTER TABLE samples
    ADD COLUMN IF NOT EXISTS total_quantity INTEGER,
    ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Backfill from old column if exists
UPDATE samples
SET total_quantity = NULLIF(sample_quantity, '')::INTEGER
WHERE total_quantity IS NULL
  AND sample_quantity ~ '^[0-9]+$';


-- =========================================================
-- 6) SAMPLE ENTRIES (ACTUAL ROW-WISE DATA)
-- =========================================================
CREATE TABLE IF NOT EXISTS sample_entries (
    sample_entry_id BIGSERIAL PRIMARY KEY,

    sample_id BIGINT NOT NULL REFERENCES samples(sample_id) ON DELETE CASCADE,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,

    sample_type_id BIGINT NOT NULL REFERENCES sample_types(sample_type_id) ON DELETE RESTRICT,

    quantity INTEGER NOT NULL CHECK (quantity > 0),

    sample_condition_id BIGINT REFERENCES sample_conditions(sample_condition_id) ON DELETE SET NULL,
    sample_location_id BIGINT REFERENCES sample_locations(sample_location_id) ON DELETE SET NULL,

    testing_days INTEGER,
    expected_report_date DATE,

    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'cancelled')),

    remarks TEXT,

    created_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sample_entries_sample_id ON sample_entries(sample_id);
CREATE INDEX idx_sample_entries_project_id ON sample_entries(project_id);
CREATE INDEX idx_sample_entries_sample_type_id ON sample_entries(sample_type_id);


-- =========================================================
-- 7) SAMPLE ENTRY TESTS (MULTIPLE TESTS PER ENTRY)
-- =========================================================
CREATE TABLE IF NOT EXISTS sample_entry_tests (
    sample_entry_test_id BIGSERIAL PRIMARY KEY,

    sample_entry_id BIGINT NOT NULL REFERENCES sample_entries(sample_entry_id) ON DELETE CASCADE,

    test_name VARCHAR(255) NOT NULL,

    testing_days INTEGER,
    expected_test_date DATE,
    completed_date DATE,

    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),

    tested_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    reviewed_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,

    remarks TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sample_entry_tests_sample_entry_id
ON sample_entry_tests(sample_entry_id);


-- =========================================================
-- 8) SAMPLE STATUS HISTORY (OPTIONAL BUT BEST)
-- =========================================================
CREATE TABLE IF NOT EXISTS sample_status_history (
    sample_status_history_id BIGSERIAL PRIMARY KEY,

    sample_id BIGINT NOT NULL REFERENCES samples(sample_id) ON DELETE CASCADE,

    old_status VARCHAR(30),
    new_status VARCHAR(30),

    comment TEXT,
    action_by BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    action_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sample_status_history_sample_id
ON sample_status_history(sample_id);


-- =========================================================
-- 9) SAMPLE CODE GENERATION FUNCTION
-- =========================================================
CREATE OR REPLACE FUNCTION generate_sample_code(p_project_id BIGINT)
RETURNS VARCHAR AS $$
DECLARE
    v_project_code VARCHAR(100);
    v_next_no INTEGER;
BEGIN
    SELECT project_code INTO v_project_code
    FROM projects
    WHERE project_id = p_project_id;

    SELECT COUNT(*) + 1 INTO v_next_no
    FROM samples
    WHERE project_id = p_project_id;

    RETURN v_project_code || '-SMP-' || LPAD(v_next_no::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;


-- =========================================================
-- 10) AUTO LOAD DEFAULT TESTS FROM SAMPLE TYPE
-- =========================================================
CREATE OR REPLACE FUNCTION assign_default_tests_to_sample_entry(p_sample_entry_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
    v_sample_type_id BIGINT;
    v_count INTEGER;
BEGIN
    SELECT sample_type_id INTO v_sample_type_id
    FROM sample_entries
    WHERE sample_entry_id = p_sample_entry_id;

    INSERT INTO sample_entry_tests (
        sample_entry_id,
        test_name,
        testing_days,
        status
    )
    SELECT
        p_sample_entry_id,
        st.test_name,
        st.default_days,
        'pending'
    FROM sample_type_tests st
    WHERE st.sample_type_id = v_sample_type_id
      AND st.status = 'active';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;