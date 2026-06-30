-- =========================================================
-- Lab Management SaaS - Auth Module SQL
-- PostgreSQL
-- Includes:
--   labs
--   roles
--   users
--   user_verifications
--   password_reset_tokens
--   refresh_tokens (JWT)
--   audit_logs
--   test lab + sample users
--
-- JWT: Backend generates access_token + optional refresh_token.
--      Access token: short-lived, sent in Authorization header.
--      Refresh token: long-lived, stored here for revocation.
-- =========================================================

BEGIN;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS labs (
    lab_id BIGSERIAL PRIMARY KEY,
    lab_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_labs_updated_at ON labs;
CREATE TRIGGER trg_labs_updated_at
BEFORE UPDATE ON labs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS roles (
    role_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    role_name VARCHAR(50) NOT NULL
        CHECK (role_name IN ('super_admin', 'admin', 'team_member')),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lab_id, role_name)
);

DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
CREATE TRIGGER trg_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS users (
    user_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255) NOT NULL UNIQUE,
    contact_no VARCHAR(50),
    password_hash TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS user_verifications (
    user_verification_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    verification_type VARCHAR(30) NOT NULL
        CHECK (verification_type IN ('email_otp', 'phone_otp')),
    otp_code VARCHAR(20) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_user_verifications_updated_at ON user_verifications;
CREATE TRIGGER trg_user_verifications_updated_at
BEFORE UPDATE ON user_verifications
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    reset_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_password_reset_tokens_updated_at ON password_reset_tokens;
CREATE TRIGGER trg_password_reset_tokens_updated_at
BEFORE UPDATE ON password_reset_tokens
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- JWT refresh tokens (optional: for token revocation / refresh flow)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_refresh_tokens_updated_at ON refresh_tokens;
CREATE TRIGGER trg_refresh_tokens_updated_at
BEFORE UPDATE ON refresh_tokens
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    user_id BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    module_name VARCHAR(100) NOT NULL,
    record_type VARCHAR(100),
    record_id BIGINT,
    action_type VARCHAR(50) NOT NULL,
    action_note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_audit_logs_updated_at ON audit_logs;
CREATE TRIGGER trg_audit_logs_updated_at
BEFORE UPDATE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_roles_lab_id ON roles(lab_id);
CREATE INDEX IF NOT EXISTS idx_users_lab_id ON users(lab_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_lab_id ON audit_logs(lab_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

INSERT INTO roles (lab_id, role_name, description)
SELECT NULL, 'super_admin', 'System owner with global access'
WHERE NOT EXISTS (
    SELECT 1
    FROM roles
    WHERE lab_id IS NULL
      AND role_name = 'super_admin'
);

INSERT INTO labs (
    lab_name,
    contact_person,
    email,
    phone,
    address,
    status
)
SELECT
    'GOMA Engineering Lab',
    'Jinal Ladani',
    'goma.lab@example.com',
    '9876543210',
    'Ahmedabad, Gujarat',
    'active'
WHERE NOT EXISTS (
    SELECT 1 FROM labs WHERE email = 'goma.lab@example.com'
);

INSERT INTO roles (lab_id, role_name, description)
SELECT l.lab_id, 'admin', 'Lab Admin - full control'
FROM labs l
WHERE l.email = 'goma.lab@example.com'
  AND NOT EXISTS (
      SELECT 1
      FROM roles r
      WHERE r.lab_id = l.lab_id
        AND r.role_name = 'admin'
  );

INSERT INTO roles (lab_id, role_name, description)
SELECT l.lab_id, 'team_member', 'Lab Staff / Engineer'
FROM labs l
WHERE l.email = 'goma.lab@example.com'
  AND NOT EXISTS (
      SELECT 1
      FROM roles r
      WHERE r.lab_id = l.lab_id
        AND r.role_name = 'team_member'
  );

INSERT INTO users (
    lab_id,
    role_id,
    first_name,
    last_name,
    email,
    contact_no,
    password_hash,
    is_verified,
    status
)
SELECT
    NULL,
    r.role_id,
    'System',
    'Owner',
    'superadmin@labmate.com',
    '7777777777',
    'Admin@123',
    TRUE,
    'active'
FROM roles r
WHERE r.lab_id IS NULL
  AND r.role_name = 'super_admin'
  AND NOT EXISTS (
      SELECT 1 FROM users u WHERE u.email = 'superadmin@labmate.com'
  );

INSERT INTO users (
    lab_id,
    role_id,
    first_name,
    last_name,
    email,
    contact_no,
    password_hash,
    is_verified,
    status
)
SELECT
    l.lab_id,
    r.role_id,
    'Jinal',
    'Admin',
    'jinal@goma.com',
    '9999999999',
    'Jinal@123',
    TRUE,
    'active'
FROM labs l
JOIN roles r
  ON r.lab_id = l.lab_id
 AND r.role_name = 'admin'
WHERE l.email = 'goma.lab@example.com'
  AND NOT EXISTS (
      SELECT 1 FROM users u WHERE u.email = 'admin@goma.com'
  );

INSERT INTO users (
    lab_id,
    role_id,
    first_name,
    last_name,
    email,
    contact_no,
    password_hash,
    is_verified,
    status
)
SELECT
    l.lab_id,
    r.role_id,
    'Shyam',
    'Engineer',
    'shyam@goma.com',
    '8888888888',
    'Shyam@123',
    TRUE,
    'active'
FROM labs l
JOIN roles r
  ON r.lab_id = l.lab_id
 AND r.role_name = 'team_member'
WHERE l.email = 'goma.lab@example.com'
  AND NOT EXISTS (
      SELECT 1 FROM users u WHERE u.email = 'user@goma.com'
  );

COMMIT;

-- Verify
-- SELECT * FROM labs;
-- SELECT * FROM roles ORDER BY role_id;
-- SELECT user_id, first_name, email, lab_id, role_id, status FROM users ORDER BY user_id;
