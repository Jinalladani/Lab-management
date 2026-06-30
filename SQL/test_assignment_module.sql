-- =========================================
-- Test Assignment Module Migration
-- =========================================

BEGIN;

-- =========================================
-- Sample Test Assignments Table
-- =========================================

CREATE TABLE IF NOT EXISTS sample_test_assignments (
    assignment_id BIGSERIAL PRIMARY KEY,
    
    sample_id BIGINT NOT NULL REFERENCES sample_receipt_register(sample_id) ON DELETE CASCADE,
    scope_test_id BIGINT NOT NULL REFERENCES project_scope_tests(project_scope_test_id) ON DELETE CASCADE,
    
    assigned_to BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_date DATE,
    
    priority VARCHAR(50) DEFAULT 'Normal' CHECK (
        priority IN ('Normal', 'High', 'Urgent')
    ),
    
    status VARCHAR(50) DEFAULT 'Assigned' CHECK (
        status IN ('Assigned', 'In Progress', 'Observation Completed', 'Result Generated', 'Reviewed', 'Approved')
    ),
    
    remarks TEXT,
    
    created_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_sample_test_assignment UNIQUE (sample_id, scope_test_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sample_test_assignments_sample_id 
    ON sample_test_assignments(sample_id);
CREATE INDEX IF NOT EXISTS idx_sample_test_assignments_scope_test_id 
    ON sample_test_assignments(scope_test_id);
CREATE INDEX IF NOT EXISTS idx_sample_test_assignments_assigned_to 
    ON sample_test_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sample_test_assignments_status 
    ON sample_test_assignments(status);
CREATE INDEX IF NOT EXISTS idx_sample_test_assignments_priority 
    ON sample_test_assignments(priority);
CREATE INDEX IF NOT EXISTS idx_sample_test_assignments_target_date 
    ON sample_test_assignments(target_date);

-- =========================================
-- Sample Test Assignment History Table
-- =========================================

CREATE TABLE IF NOT EXISTS sample_test_assignment_history (
    history_id BIGSERIAL PRIMARY KEY,
    
    assignment_id BIGINT NOT NULL REFERENCES sample_test_assignments(assignment_id) ON DELETE CASCADE,
    
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    
    changed_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    remarks TEXT
);

-- Indexes for history table
CREATE INDEX IF NOT EXISTS idx_assignment_history_assignment_id 
    ON sample_test_assignment_history(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_changed_at 
    ON sample_test_assignment_history(changed_at);

-- =========================================
-- Trigger for auto updating updated_at
-- =========================================

CREATE OR REPLACE FUNCTION set_updated_at_sample_test_assignments()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sample_test_assignments_updated_at ON sample_test_assignments;

CREATE TRIGGER trg_sample_test_assignments_updated_at
    BEFORE UPDATE ON sample_test_assignments
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_sample_test_assignments();

-- =========================================
-- Trigger to log status changes
-- =========================================

CREATE OR REPLACE FUNCTION log_assignment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO sample_test_assignment_history (
            assignment_id,
            old_status,
            new_status,
            changed_by,
            changed_at,
            remarks
        ) VALUES (
            NEW.assignment_id,
            OLD.status,
            NEW.status,
            NEW.created_by,
            CURRENT_TIMESTAMP,
            'Status changed automatically'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_assignment_status_change ON sample_test_assignments;

CREATE TRIGGER trg_log_assignment_status_change
    AFTER UPDATE OF status ON sample_test_assignments
    FOR EACH ROW
    EXECUTE FUNCTION log_assignment_status_change();

COMMIT;

SELECT 'Test assignment module migration completed!' AS status;