-- Migration to create tables for Equipment, Locations, Calibration and Maintenance system with multi-tenant lab partitioning

-- 1. Create equipment_locations table
CREATE TABLE IF NOT EXISTS equipment_locations (
    location_id SERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    laboratory VARCHAR(100) NOT NULL,
    building VARCHAR(100),
    floor VARCHAR(100),
    room_no VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create equipment table
CREATE TABLE IF NOT EXISTS equipment (
    equipment_id VARCHAR(50) PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    laboratory VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    calibration_status VARCHAR(50) NOT NULL DEFAULT 'Valid',
    next_due DATE NOT NULL,
    last_calibration DATE,
    frequency VARCHAR(50) NOT NULL DEFAULT '12 Months',
    agency VARCHAR(255),
    certificate_no VARCHAR(100),
    model VARCHAR(100),
    serial_no VARCHAR(100),
    location VARCHAR(255),
    responsible_person VARCHAR(100),
    manufacturer VARCHAR(100),
    supplier VARCHAR(100),
    purchase_date DATE,
    installation_date DATE,
    measurement_range VARCHAR(100),
    least_count VARCHAR(50),
    accuracy VARCHAR(50),
    power_supply VARCHAR(50),
    description TEXT,
    remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create calibration_records table
CREATE TABLE IF NOT EXISTS calibration_records (
    calibration_id SERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    equipment_id VARCHAR(50) NOT NULL REFERENCES equipment(equipment_id) ON DELETE CASCADE,
    calibration_date DATE NOT NULL,
    next_due DATE NOT NULL,
    frequency VARCHAR(50) NOT NULL DEFAULT '12 Months',
    agency VARCHAR(255) NOT NULL,
    certificate_no VARCHAR(100) NOT NULL,
    cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    performed_by VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pass',
    remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create maintenance_records table
CREATE TABLE IF NOT EXISTS maintenance_records (
    maintenance_id SERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    equipment_id VARCHAR(50) NOT NULL REFERENCES equipment(equipment_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type VARCHAR(100) NOT NULL DEFAULT 'Preventive',
    engineer VARCHAR(255) NOT NULL,
    cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Completed',
    remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add check constraints
ALTER TABLE equipment ADD CONSTRAINT equipment_status_check CHECK (status IN ('Active', 'Inactive', 'Under Maintenance'));
ALTER TABLE equipment ADD CONSTRAINT equipment_cal_status_check CHECK (calibration_status IN ('Valid', 'Due Soon', 'Due within 7 Days', 'Overdue', 'Not Required'));
ALTER TABLE calibration_records ADD CONSTRAINT calibration_status_check CHECK (status IN ('Pass', 'Fail'));
ALTER TABLE maintenance_records ADD CONSTRAINT maintenance_status_check CHECK (status IN ('Completed', 'In Progress', 'Scheduled'));
ALTER TABLE maintenance_records ADD CONSTRAINT maintenance_type_check CHECK (type IN ('Preventive', 'Repair', 'Calibration Support'));
