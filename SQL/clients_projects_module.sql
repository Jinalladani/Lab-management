-- =========================================================
-- Lab Management SaaS - Clients + Projects Module SQL
-- PostgreSQL
-- Depends on existing tables:
--   labs
--   users
-- =========================================================

BEGIN;

-- =========================================================
-- 1. CLIENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS clients (
    client_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    gst_no VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lab_id, client_name)
);

-- =========================================================
-- 2. PROJECTS
-- =========================================================
CREATE TABLE IF NOT EXISTS projects (
    project_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    client_id BIGINT NULL REFERENCES clients(client_id) ON DELETE SET NULL,

    project_code VARCHAR(100) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    project_description TEXT,

    location_name VARCHAR(255),
    site_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),

    ref_letter_no VARCHAR(100),
    ref_letter_date DATE,
    work_order_no VARCHAR(100),
    work_order_date DATE,

    start_date DATE,
    due_date DATE,
    total_reports INTEGER NOT NULL DEFAULT 0,
    total_samples INTEGER NOT NULL DEFAULT 0,

    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'in_progress', 'completed', 'on_hold', 'cancelled')),

    created_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    approved_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (lab_id, project_code)
);

-- =========================================================
-- 3. PROJECT DOCUMENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS project_documents (
    doc_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(150),

    created_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 4. PROJECT STATUS HISTORY
-- =========================================================
CREATE TABLE IF NOT EXISTS project_status_history (
    project_history_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    change_note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 5. UPDATED_AT FUNCTION
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 6. TRIGGERS
-- =========================================================
DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
CREATE TRIGGER trg_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_project_documents_updated_at ON project_documents;
CREATE TRIGGER trg_project_documents_updated_at
BEFORE UPDATE ON project_documents
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_project_status_history_updated_at ON project_status_history;
CREATE TRIGGER trg_project_status_history_updated_at
BEFORE UPDATE ON project_status_history
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- 7. INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_clients_lab_id ON clients(lab_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(client_name);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

CREATE INDEX IF NOT EXISTS idx_projects_lab_id ON projects(lab_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_project_code ON projects(project_code);
CREATE INDEX IF NOT EXISTS idx_projects_project_name ON projects(project_name);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_status_history_project_id ON project_status_history(project_id);
CREATE INDEX IF NOT EXISTS idx_project_status_history_lab_id ON project_status_history(lab_id);

-- =========================================================
-- 8. OPTIONAL TEST DATA
-- Comment out if not needed
-- Requires an existing lab admin/user in the users table
-- =========================================================

-- Sample client
INSERT INTO clients (
    lab_id,
    client_name,
    contact_person,
    email,
    phone,
    address,
    city,
    state,
    pincode,
    gst_no,
    status,
    created_by,
    updated_by
)
SELECT
    l.lab_id,
    'ABC Infrastructure Pvt Ltd',
    'Rakesh Sharma',
    'abc.client@example.com',
    '9876500000',
    'SG Highway',
    'Ahmedabad',
    'Gujarat',
    '380001',
    '24ABCDE1234F1Z5',
    'active',
    u.user_id,
    u.user_id
FROM labs l
LEFT JOIN users u
    ON u.lab_id = l.lab_id
   AND u.email = 'admin@goma.com'
WHERE l.email = 'goma.lab@example.com'
  AND NOT EXISTS (
      SELECT 1
      FROM clients c
      WHERE c.lab_id = l.lab_id
        AND c.client_name = 'ABC Infrastructure Pvt Ltd'
  );

-- Sample project
INSERT INTO projects (
    lab_id,
    client_id,
    project_code,
    project_name,
    project_description,
    location_name,
    site_address,
    city,
    state,
    pincode,
    ref_letter_no,
    ref_letter_date,
    work_order_no,
    work_order_date,
    start_date,
    due_date,
    total_reports,
    total_samples,
    status,
    created_by,
    updated_by,
    approved_by
)
SELECT
    l.lab_id,
    c.client_id,
    'GEO-001',
    'Soil Compaction Test - Changodar Site',
    'Geotechnical investigation and soil compaction testing for construction suitability.',
    'Changodar Site',
    'Changodar, Ahmedabad',
    'Ahmedabad',
    'Gujarat',
    '382213',
    'REF-001',
    CURRENT_DATE,
    'WO-001',
    CURRENT_DATE,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '15 days',
    0,
    0,
    'active',
    u.user_id,
    u.user_id,
    u.user_id
FROM labs l
JOIN clients c
  ON c.lab_id = l.lab_id
 AND c.client_name = 'ABC Infrastructure Pvt Ltd'
LEFT JOIN users u
  ON u.lab_id = l.lab_id
 AND u.email = 'admin@goma.com'
WHERE l.email = 'goma.lab@example.com'
  AND NOT EXISTS (
      SELECT 1
      FROM projects p
      WHERE p.lab_id = l.lab_id
        AND p.project_code = 'GEO-001'
  );

COMMIT;

-- =========================================================
-- VERIFY
-- =========================================================
-- SELECT * FROM clients ORDER BY client_id DESC;
-- SELECT * FROM projects ORDER BY project_id DESC;
-- SELECT * FROM project_documents ORDER BY doc_id DESC;
-- SELECT * FROM project_status_history ORDER BY project_history_id DESC;
