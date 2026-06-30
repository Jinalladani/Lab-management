-- Sample Entries Table for Lab Management System
-- This table stores actual sample entries using the master data

CREATE TABLE IF NOT EXISTS sample_entries (
    sample_entry_id INT AUTO_INCREMENT PRIMARY KEY,
    lab_id INT NOT NULL,
    material_category_id INT NOT NULL,
    material_type_id INT NOT NULL,
    sample_condition_id INT NOT NULL,
    location_id INT NOT NULL,
    testing_day_id INT NOT NULL,
    expected_submission_date DATE NOT NULL,
    no_of_reports INT DEFAULT 1,
    sample_grade VARCHAR(50),
    remarks TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_by INT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_lab_id (lab_id),
    INDEX idx_material_category (material_category_id),
    INDEX idx_material_type (material_type_id),
    INDEX idx_sample_condition (sample_condition_id),
    INDEX idx_location (location_id),
    INDEX idx_testing_day (testing_day_id),
    INDEX idx_status (status),
    INDEX idx_expected_date (expected_submission_date),
    
    FOREIGN KEY (material_category_id) REFERENCES material_categories(material_category_id) ON DELETE RESTRICT,
    FOREIGN KEY (material_type_id) REFERENCES material_types(material_type_id) ON DELETE RESTRICT,
    FOREIGN KEY (sample_condition_id) REFERENCES sample_conditions(sample_condition_id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES sample_locations(sample_location_id) ON DELETE RESTRICT,
    FOREIGN KEY (testing_day_id) REFERENCES testing_days(testing_day_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create audit table for sample entries
CREATE TABLE IF NOT EXISTS sample_entries_audit (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    sample_entry_id INT NOT NULL,
    lab_id INT NOT NULL,
    action_type ENUM('create', 'update', 'delete') NOT NULL,
    old_values JSON,
    new_values JSON,
    changed_by INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_sample_entry (sample_entry_id),
    INDEX idx_lab_id (lab_id),
    INDEX idx_action_type (action_type),
    INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create trigger for audit logging
DELIMITER //
CREATE TRIGGER IF NOT EXISTS sample_entries_audit_trigger
AFTER INSERT ON sample_entries
FOR EACH ROW
BEGIN
    INSERT INTO sample_entries_audit (
        sample_entry_id, lab_id, action_type, new_values, changed_by, changed_at
    ) VALUES (
        NEW.sample_entry_id, NEW.lab_id, 'create', 
        JSON_OBJECT(
            'material_category_id', NEW.material_category_id,
            'material_type_id', NEW.material_type_id,
            'sample_condition_id', NEW.sample_condition_id,
            'location_id', NEW.location_id,
            'testing_day_id', NEW.testing_day_id,
            'expected_submission_date', NEW.expected_submission_date,
            'no_of_reports', NEW.no_of_reports,
            'sample_grade', NEW.sample_grade,
            'remarks', NEW.remarks,
            'status', NEW.status
        ),
        NEW.created_by, NEW.created_at
    );
END//
DELIMITER ;

-- Sample data for testing
INSERT INTO sample_entries (
    lab_id, material_category_id, material_type_id, sample_condition_id,
    location_id, testing_day_id, expected_submission_date, no_of_reports,
    sample_grade, remarks, status, created_by
) VALUES
(1, 1, 1, 1, 1, 7, '2024-01-15', 3, 'M25', 'Sample for compressive strength test', 'active', 1),
(1, 2, 2, 2, 3, 28, '2024-01-20', 2, 'Class A', 'Clay brick sample for quality check', 'active', 1),
(1, 4, 3, 1, 2, 14, '2024-01-25', 1, 'Type I', 'Soil sample for compaction test', 'active', 1),
(1, 5, 4, 3, 1, 3, '2024-01-18', 2, 'OPC 43', 'Cement sample for setting time test', 'active', 1),
(1, 6, 5, 1, 4, 7, '2024-01-22', 4, 'Fe500', 'Steel sample for tensile strength test', 'active', 1);
