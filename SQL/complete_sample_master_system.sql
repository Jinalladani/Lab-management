BEGIN;

-- =========================================================
-- SAMPLE MASTER SYSTEM - LAB WISE VERSION
-- All master data is lab-specific
-- Seed data uses lab_id = 1
-- PostgreSQL compatible
-- =========================================================

-- ---------------------------------------------------------
-- 1) COMMON UPDATED_AT TRIGGER FUNCTION
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------
-- 2) UPGRADE EXISTING SAMPLES TABLE (HEADER LEVEL)
-- ---------------------------------------------------------
ALTER TABLE samples
    ADD COLUMN IF NOT EXISTS total_quantity INTEGER,
    ADD COLUMN IF NOT EXISTS remarks TEXT,
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'pending';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_samples_status'
    ) THEN
        ALTER TABLE samples
        ADD CONSTRAINT chk_samples_status CHECK (
            status IN ('pending', 'received', 'in_progress', 'completed', 'rejected', 'cancelled')
        );
    END IF;
END $$;

UPDATE samples
SET total_quantity = NULLIF(sample_quantity, '')::INTEGER
WHERE total_quantity IS NULL
  AND sample_quantity ~ '^[0-9]+$';

DROP TRIGGER IF EXISTS trg_samples_updated_at ON samples;
CREATE TRIGGER trg_samples_updated_at
BEFORE UPDATE ON samples
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------
-- 3) MATERIAL CATEGORIES MASTER (LAB-WISE)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS material_categories (
    material_category_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    category_name VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lab_id, category_name)
);

CREATE INDEX IF NOT EXISTS idx_material_categories_lab_id
ON material_categories(lab_id);

DROP TRIGGER IF EXISTS trg_material_categories_updated_at ON material_categories;
CREATE TRIGGER trg_material_categories_updated_at
BEFORE UPDATE ON material_categories
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------
-- 4) MATERIAL TYPES MASTER (LAB-WISE)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS material_types (
    material_type_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    material_category_id BIGINT NOT NULL REFERENCES material_categories(material_category_id) ON DELETE CASCADE,
    type_name VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lab_id, material_category_id, type_name)
);

CREATE INDEX IF NOT EXISTS idx_material_types_lab_id
ON material_types(lab_id);

CREATE INDEX IF NOT EXISTS idx_material_types_category_id
ON material_types(material_category_id);

DROP TRIGGER IF EXISTS trg_material_types_updated_at ON material_types;
CREATE TRIGGER trg_material_types_updated_at
BEFORE UPDATE ON material_types
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------
-- 5) SAMPLE CONDITIONS MASTER (LAB-WISE)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS sample_conditions (
    sample_condition_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    condition_name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lab_id, condition_name)
);

CREATE INDEX IF NOT EXISTS idx_sample_conditions_lab_id
ON sample_conditions(lab_id);

DROP TRIGGER IF EXISTS trg_sample_conditions_updated_at ON sample_conditions;
CREATE TRIGGER trg_sample_conditions_updated_at
BEFORE UPDATE ON sample_conditions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------
-- 6) SAMPLE LOCATIONS MASTER (LAB-WISE)
-- ---------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_sample_locations_lab_id
ON sample_locations(lab_id);

DROP TRIGGER IF EXISTS trg_sample_locations_updated_at ON sample_locations;
CREATE TRIGGER trg_sample_locations_updated_at
BEFORE UPDATE ON sample_locations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------
-- 7) TESTING DAYS MASTER (LAB-WISE)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS testing_days (
    testing_day_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    day_label VARCHAR(50) NOT NULL,
    day_value INTEGER NOT NULL CHECK (day_value >= 0),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lab_id, day_label)
);

CREATE INDEX IF NOT EXISTS idx_testing_days_lab_id
ON testing_days(lab_id);

DROP TRIGGER IF EXISTS trg_testing_days_updated_at ON testing_days;
CREATE TRIGGER trg_testing_days_updated_at
BEFORE UPDATE ON testing_days
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------
-- 8) SAMPLE TYPES MASTER (LAB-WISE)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS sample_types (
    sample_type_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    material_type_id BIGINT NULL REFERENCES material_types(material_type_id) ON DELETE SET NULL,
    sample_type_name VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lab_id, sample_type_name)
);

CREATE INDEX IF NOT EXISTS idx_sample_types_lab_id
ON sample_types(lab_id);

CREATE INDEX IF NOT EXISTS idx_sample_types_material_type_id
ON sample_types(material_type_id);

DROP TRIGGER IF EXISTS trg_sample_types_updated_at ON sample_types;
CREATE TRIGGER trg_sample_types_updated_at
BEFORE UPDATE ON sample_types
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------
-- 9) SAMPLE GRADES MASTER (LAB-WISE)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS sample_grades (
    sample_grade_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    sample_type_id BIGINT NULL REFERENCES sample_types(sample_type_id) ON DELETE CASCADE,
    grade_name VARCHAR(100) NOT NULL,
    grade_description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lab_id, sample_type_id, grade_name)
);

CREATE INDEX IF NOT EXISTS idx_sample_grades_lab_id
ON sample_grades(lab_id);

CREATE INDEX IF NOT EXISTS idx_sample_grades_sample_type_id
ON sample_grades(sample_type_id);

DROP TRIGGER IF EXISTS trg_sample_grades_updated_at ON sample_grades;
CREATE TRIGGER trg_sample_grades_updated_at
BEFORE UPDATE ON sample_grades
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------
-- 10) SAMPLE TYPE TESTS MASTER (LAB-WISE)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS sample_type_tests (
    sample_type_test_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    sample_type_id BIGINT NOT NULL REFERENCES sample_types(sample_type_id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    default_testing_day_id BIGINT NULL REFERENCES testing_days(testing_day_id) ON DELETE SET NULL,
    default_day_value INTEGER,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lab_id, sample_type_id, test_name)
);

CREATE INDEX IF NOT EXISTS idx_sample_type_tests_lab_id
ON sample_type_tests(lab_id);

CREATE INDEX IF NOT EXISTS idx_sample_type_tests_sample_type_id
ON sample_type_tests(sample_type_id);

DROP TRIGGER IF EXISTS trg_sample_type_tests_updated_at ON sample_type_tests;
CREATE TRIGGER trg_sample_type_tests_updated_at
BEFORE UPDATE ON sample_type_tests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------
-- 11) SAMPLE ENTRIES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS sample_entries (
    sample_entry_id BIGSERIAL PRIMARY KEY,
    sample_id BIGINT NOT NULL REFERENCES samples(sample_id) ON DELETE CASCADE,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,

    material_category_id BIGINT NULL REFERENCES material_categories(material_category_id) ON DELETE SET NULL,
    material_type_id BIGINT NULL REFERENCES material_types(material_type_id) ON DELETE SET NULL,
    sample_type_id BIGINT NOT NULL REFERENCES sample_types(sample_type_id) ON DELETE RESTRICT,
    sample_grade_id BIGINT NULL REFERENCES sample_grades(sample_grade_id) ON DELETE SET NULL,

    quantity INTEGER NOT NULL CHECK (quantity > 0),
    sample_condition_id BIGINT NULL REFERENCES sample_conditions(sample_condition_id) ON DELETE SET NULL,
    sample_location_id BIGINT NULL REFERENCES sample_locations(sample_location_id) ON DELETE SET NULL,

    testing_day_id BIGINT NULL REFERENCES testing_days(testing_day_id) ON DELETE SET NULL,
    testing_days INTEGER,
    expected_report_date DATE,
    no_of_reports INTEGER NOT NULL DEFAULT 1 CHECK (no_of_reports > 0),

    tested_by_role VARCHAR(50),
    reported_by_role VARCHAR(50),

    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'cancelled')),

    remarks TEXT,

    created_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sample_entries_sample_id
ON sample_entries(sample_id);

CREATE INDEX IF NOT EXISTS idx_sample_entries_lab_id
ON sample_entries(lab_id);

CREATE INDEX IF NOT EXISTS idx_sample_entries_project_id
ON sample_entries(project_id);

CREATE INDEX IF NOT EXISTS idx_sample_entries_sample_type_id
ON sample_entries(sample_type_id);

DROP TRIGGER IF EXISTS trg_sample_entries_updated_at ON sample_entries;
CREATE TRIGGER trg_sample_entries_updated_at
BEFORE UPDATE ON sample_entries
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------
-- 12) SAMPLE ENTRY TESTS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS sample_entry_tests (
    sample_entry_test_id BIGSERIAL PRIMARY KEY,
    sample_entry_id BIGINT NOT NULL REFERENCES sample_entries(sample_entry_id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    testing_day_id BIGINT NULL REFERENCES testing_days(testing_day_id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_sample_entry_tests_sample_entry_id
ON sample_entry_tests(sample_entry_id);

DROP TRIGGER IF EXISTS trg_sample_entry_tests_updated_at ON sample_entry_tests;
CREATE TRIGGER trg_sample_entry_tests_updated_at
BEFORE UPDATE ON sample_entry_tests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------
-- 13) SAMPLE ENTRIES AUDIT
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS sample_entries_audit (
    audit_id BIGSERIAL PRIMARY KEY,
    sample_entry_id BIGINT NOT NULL,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    action_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    action_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ---------------------------------------------------------
-- 14) AUDIT TRIGGER FUNCTION
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_sample_entries_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO sample_entries_audit (sample_entry_id, action_type, new_data, action_by)
        VALUES (NEW.sample_entry_id, 'INSERT', to_jsonb(NEW), NEW.created_by);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO sample_entries_audit (sample_entry_id, action_type, old_data, new_data, action_by)
        VALUES (NEW.sample_entry_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), NEW.updated_by);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO sample_entries_audit (sample_entry_id, action_type, old_data, action_by)
        VALUES (OLD.sample_entry_id, 'DELETE', to_jsonb(OLD), OLD.updated_by);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sample_entries_audit ON sample_entries;
CREATE TRIGGER trg_sample_entries_audit
AFTER INSERT OR UPDATE OR DELETE ON sample_entries
FOR EACH ROW
EXECUTE FUNCTION audit_sample_entries_changes();


-- ---------------------------------------------------------
-- 15) SAMPLE CODE GENERATION FUNCTION
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_sample_code(p_project_id BIGINT)
RETURNS VARCHAR AS $$
DECLARE
    v_project_code VARCHAR(100);
    v_next_no INTEGER;
BEGIN
    SELECT project_code
    INTO v_project_code
    FROM projects
    WHERE project_id = p_project_id;

    IF v_project_code IS NULL THEN
        RAISE EXCEPTION 'Invalid project_id: %', p_project_id;
    END IF;

    SELECT COUNT(*) + 1
    INTO v_next_no
    FROM samples
    WHERE project_id = p_project_id;

    RETURN v_project_code || '-SMP-' || LPAD(v_next_no::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------
-- 16) AUTO ASSIGN DEFAULT TESTS TO SAMPLE ENTRY
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_default_tests_to_sample_entry(p_sample_entry_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
    v_sample_type_id BIGINT;
    v_lab_id BIGINT;
    v_count INTEGER := 0;
BEGIN
    SELECT sample_type_id, lab_id
    INTO v_sample_type_id, v_lab_id
    FROM sample_entries
    WHERE sample_entry_id = p_sample_entry_id;

    INSERT INTO sample_entry_tests (
        sample_entry_id,
        test_name,
        testing_day_id,
        testing_days,
        expected_test_date,
        status
    )
    SELECT
        p_sample_entry_id,
        stt.test_name,
        stt.default_testing_day_id,
        COALESCE(stt.default_day_value, td.day_value),
        CASE
            WHEN COALESCE(stt.default_day_value, td.day_value) IS NOT NULL
            THEN CURRENT_DATE + COALESCE(stt.default_day_value, td.day_value)
            ELSE NULL
        END,
        'pending'
    FROM sample_type_tests stt
    LEFT JOIN testing_days td
      ON td.testing_day_id = stt.default_testing_day_id
    WHERE stt.sample_type_id = v_sample_type_id
      AND stt.lab_id = v_lab_id
      AND stt.status = 'active';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;


-- =========================================================
-- 17) SEED DATA FOR lab_id = 1
-- =========================================================

-- Material Categories
INSERT INTO material_categories (lab_id, category_name, description)
VALUES
    (1, 'Concrete', 'Concrete related materials'),
    (1, 'Cement', 'Cement related materials'),
    (1, 'Soil', 'Soil related materials'),
    (1, 'Steel', 'Steel related materials'),
    (1, 'Aggregate', 'Aggregate related materials'),
    (1, 'Bitumen', 'Bitumen related materials'),
    (1, 'Water', 'Water related materials'),
    (1, 'Rock', 'Rock related materials')
ON CONFLICT (lab_id, category_name) DO NOTHING;

-- Material Types
INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'C.C Cube', 'Concrete cube material type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Concrete'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'Cement', 'Cement material type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Cement'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'Soil Sample', 'Soil material type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Soil'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

-- Sample Conditions
INSERT INTO sample_conditions (lab_id, condition_name, description)
VALUES
    (1, 'Good', 'Sample received in good condition'),
    (1, 'OK', 'Sample received and acceptable'),
    (1, 'Damaged', 'Sample received in damaged condition'),
    (1, 'Wet', 'Sample is wet'),
    (1, 'Dry', 'Sample is dry'),
    (1, 'Sealed', 'Sample is sealed'),
    (1, 'Unsealed', 'Sample is unsealed'),
    (1, 'Rejected', 'Sample condition not acceptable')
ON CONFLICT (lab_id, condition_name) DO NOTHING;

-- Sample Locations
INSERT INTO sample_locations (lab_id, location_name, description)
VALUES
    (1, 'In Laboratory', 'Sample available inside laboratory'),
    (1, 'Store Room', 'Sample stored in store room'),
    (1, 'Rack A', 'Sample stored in Rack A')
ON CONFLICT (lab_id, location_name) DO NOTHING;

-- Testing Days
INSERT INTO testing_days (lab_id, day_label, day_value, description)
VALUES
    (1, '1 Day', 1, 'Testing/reporting in 1 day'),
    (1, '3 Days', 3, 'Testing/reporting in 3 days'),
    (1, '7 Days', 7, 'Testing/reporting in 7 days'),
    (1, '14 Days', 14, 'Testing/reporting in 14 days'),
    (1, '28 Days', 28, 'Testing/reporting in 28 days')
ON CONFLICT (lab_id, day_label) DO NOTHING;

-- Sample Types
INSERT INTO sample_types (lab_id, material_type_id, sample_type_name, description)
SELECT 1, mt.material_type_id, 'C.C Cube', 'Concrete cube sample'
FROM material_types mt
JOIN material_categories mc
  ON mc.material_category_id = mt.material_category_id
WHERE mt.lab_id = 1
  AND mc.lab_id = 1
  AND mc.category_name = 'Concrete'
  AND mt.type_name = 'C.C Cube'
ON CONFLICT (lab_id, sample_type_name) DO NOTHING;

INSERT INTO sample_types (lab_id, material_type_id, sample_type_name, description)
SELECT 1, mt.material_type_id, 'Cement', 'Cement sample'
FROM material_types mt
JOIN material_categories mc
  ON mc.material_category_id = mt.material_category_id
WHERE mt.lab_id = 1
  AND mc.lab_id = 1
  AND mc.category_name = 'Cement'
  AND mt.type_name = 'Cement'
ON CONFLICT (lab_id, sample_type_name) DO NOTHING;

INSERT INTO sample_types (lab_id, material_type_id, sample_type_name, description)
SELECT 1, mt.material_type_id, 'Soil', 'Soil sample'
FROM material_types mt
JOIN material_categories mc
  ON mc.material_category_id = mt.material_category_id
WHERE mt.lab_id = 1
  AND mc.lab_id = 1
  AND mc.category_name = 'Soil'
  AND mt.type_name = 'Soil Sample'
ON CONFLICT (lab_id, sample_type_name) DO NOTHING;

-- Sample Grades
INSERT INTO sample_grades (lab_id, sample_type_id, grade_name, grade_description)
SELECT 1, st.sample_type_id, 'M - 25', 'Concrete cube grade M-25'
FROM sample_types st
WHERE st.lab_id = 1 AND st.sample_type_name = 'C.C Cube'
ON CONFLICT (lab_id, sample_type_id, grade_name) DO NOTHING;

-- Sample Type Tests
INSERT INTO sample_type_tests (lab_id, sample_type_id, test_name, default_testing_day_id, default_day_value, description)
SELECT 1, st.sample_type_id, 'Comp. Strength', td.testing_day_id, td.day_value, 'Compression Strength Test'
FROM sample_types st
JOIN testing_days td
  ON td.lab_id = 1 AND td.day_label = '7 Days'
WHERE st.lab_id = 1 AND st.sample_type_name = 'C.C Cube'
ON CONFLICT (lab_id, sample_type_id, test_name) DO NOTHING;

INSERT INTO sample_type_tests (lab_id, sample_type_id, test_name, default_testing_day_id, default_day_value, description)
SELECT 1, st.sample_type_id, 'Fineness', td.testing_day_id, td.day_value, 'Cement fineness test'
FROM sample_types st
JOIN testing_days td
  ON td.lab_id = 1 AND td.day_label = '3 Days'
WHERE st.lab_id = 1 AND st.sample_type_name = 'Cement'
ON CONFLICT (lab_id, sample_type_id, test_name) DO NOTHING;

INSERT INTO sample_type_tests (lab_id, sample_type_id, test_name, default_testing_day_id, default_day_value, description)
SELECT 1, st.sample_type_id, 'Moisture Content', td.testing_day_id, td.day_value, 'Soil moisture content test'
FROM sample_types st
JOIN testing_days td
  ON td.lab_id = 1 AND td.day_label = '3 Days'
WHERE st.lab_id = 1 AND st.sample_type_name = 'Soil'
ON CONFLICT (lab_id, sample_type_id, test_name) DO NOTHING;

COMMIT;

SELECT 'Lab-wise Sample Master System Created Successfully!' AS status;