-- Sample Master Tables for Lab Management System
-- Created for material categories, types, conditions, and locations

-- Material Categories Table
CREATE TABLE IF NOT EXISTS material_categories (
    material_category_id INT AUTO_INCREMENT PRIMARY KEY,
    lab_id INT NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_by INT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_lab_category (lab_id, category_name),
    INDEX idx_lab_id (lab_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Material Types Table  
CREATE TABLE IF NOT EXISTS material_types (
    material_type_id INT AUTO_INCREMENT PRIMARY KEY,
    lab_id INT NOT NULL,
    material_category_id INT NOT NULL,
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_by INT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_lab_category_type (lab_id, material_category_id, type_name),
    INDEX idx_lab_category (lab_id, material_category_id),
    INDEX idx_status (status),
    
    FOREIGN KEY (material_category_id) REFERENCES material_categories(material_category_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample Conditions Table
CREATE TABLE IF NOT EXISTS sample_conditions (
    sample_condition_id INT AUTO_INCREMENT PRIMARY KEY,
    lab_id INT NOT NULL,
    condition_name VARCHAR(50) NOT NULL,
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_by INT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_lab_condition (lab_id, condition_name),
    INDEX idx_lab_id (lab_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample Locations Table
CREATE TABLE IF NOT EXISTS sample_locations (
    sample_location_id INT AUTO_INCREMENT PRIMARY KEY,
    lab_id INT NOT NULL,
    location_name VARCHAR(100) NOT NULL,
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_by INT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_lab_location (lab_id, location_name),
    INDEX idx_lab_id (lab_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Testing Days Table
CREATE TABLE IF NOT EXISTS testing_days (
    testing_day_id INT AUTO_INCREMENT PRIMARY KEY,
    lab_id INT NOT NULL,
    days INT NOT NULL,
    description VARCHAR(200),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_by INT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_lab_days (lab_id, days),
    INDEX idx_lab_id (lab_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default data for material categories
INSERT INTO material_categories (lab_id, category_name, description, created_by, updated_by) VALUES
(1, 'Concrete', 'Concrete testing materials', 1, 1),
(1, 'Bricks', 'Brick testing materials', 1, 1),
(1, 'Paver Block', 'Paver block testing materials', 1, 1),
(1, 'Soil', 'Soil testing materials', 1, 1),
(1, 'Cement', 'Cement testing materials', 1, 1),
(1, 'Steel', 'Steel testing materials', 1, 1),
(1, 'Aggregate', 'Aggregate testing materials', 1, 1),
(1, 'Water', 'Water testing materials', 1, 1),
(1, 'Bitumen', 'Bitumen testing materials', 1, 1),
(1, 'Wood', 'Wood testing materials', 1, 1);

-- Insert default data for material types
INSERT INTO material_types (lab_id, material_category_id, type_name, description, created_by, updated_by) VALUES
-- Concrete types
(1, 1, 'C.C. Solid Block', 'Cement Concrete Solid Block', 1, 1),
(1, 1, 'C.C. Block', 'Cement Concrete Block', 1, 1),
(1, 1, 'C.C. Cube', 'Cement Concrete Cube', 1, 1),
(1, 1, 'C.C. Cylinder', 'Cement Concrete Cylinder', 1, 1),
(1, 1, 'C.C. Prism', 'Cement Concrete Prism', 1, 1),

-- Brick types
(1, 2, 'Clay Brick', 'Traditional clay brick', 1, 1),
(1, 2, 'Fly Ash Brick', 'Fly ash based brick', 1, 1),
(1, 2, 'AAC Block', 'Autoclaved Aerated Concrete Block', 1, 1),
(1, 2, 'Solid Block', 'Solid concrete block', 1, 1),
(1, 2, 'Hollow Block', 'Hollow concrete block', 1, 1),

-- Soil types
(1, 4, 'C.C. Soil Block', 'Cement Concrete Soil Block', 1, 1),
(1, 4, 'Soil Sample', 'General soil sample', 1, 1),
(1, 4, 'Stabilized Soil', 'Cement stabilized soil', 1, 1),

-- Steel types
(1, 6, 'MS Bar', 'Mild Steel Bar', 1, 1),
(1, 6, 'HYSD Bar', 'High Yield Strength Deformed Bar', 1, 1),
(1, 6, 'TMX Bar', 'Thermo Mechanically Treated Bar', 1, 1),
(1, 6, 'Structural Steel', 'Structural steel sections', 1, 1);

-- Insert default data for sample conditions
INSERT INTO sample_conditions (lab_id, condition_name, description, created_by, updated_by) VALUES
(1, 'Sealed', 'Sample is sealed properly', 1, 1),
(1, 'Unsealed', 'Sample is not sealed', 1, 1),
(1, 'Good', 'Sample condition is good', 1, 1),
(1, 'Poor', 'Sample condition is poor', 1, 1),
(1, 'OK', 'Sample condition is acceptable', 1, 1),
(1, 'Damaged', 'Sample is damaged', 1, 1),
(1, 'Wet', 'Sample is wet', 1, 1),
(1, 'Dry', 'Sample is dry', 1, 1);

-- Insert default data for sample locations
INSERT INTO sample_locations (lab_id, location_name, description, created_by, updated_by) VALUES
(1, 'Lab Storage', 'Main laboratory storage area', 1, 1),
(1, 'Cold Storage', 'Temperature controlled storage', 1, 1),
(1, 'Field', 'Sample collected from field', 1, 1),
(1, 'Site Office', 'Site office storage', 1, 1),
(1, 'Quality Control', 'QC department storage', 1, 1),
(1, 'Reception', 'Sample reception area', 1, 1),
(1, 'Testing Area', 'Testing area storage', 1, 1),
(1, 'Archive', 'Archive storage', 1, 1);

-- Insert default data for testing days
INSERT INTO testing_days (lab_id, days, description, created_by, updated_by) VALUES
(1, 1, '1 Day testing', 1, 1),
(1, 3, '3 Days testing', 1, 1),
(1, 4, '4 Days testing', 1, 1),
(1, 5, '5 Days testing', 1, 1),
(1, 7, '7 Days testing', 1, 1),
(1, 14, '14 Days testing', 1, 1),
(1, 21, '21 Days testing', 1, 1),
(1, 28, '28 Days testing', 1, 1),
(1, 56, '56 Days testing', 1, 1);
