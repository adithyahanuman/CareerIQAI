-- =============================================================================
-- 001_students.sql
-- Students / users table
-- =============================================================================

CREATE TABLE IF NOT EXISTS students (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid  VARCHAR(128)  UNIQUE,                -- Firebase Auth UID
  full_name     VARCHAR(255)  NOT NULL,
  email         VARCHAR(320)  NOT NULL UNIQUE,
  password_hash TEXT,                                -- nullable: not used with Firebase Auth
  avatar_url    TEXT,
  bio           TEXT,
  phone         VARCHAR(30),
  location      VARCHAR(255),
  linkedin_url  TEXT,
  github_url    TEXT,
  website_url   TEXT,
  role          VARCHAR(50)   NOT NULL DEFAULT 'student', -- student | admin
  is_verified   BOOLEAN       NOT NULL DEFAULT TRUE,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_students_email        ON students (email);
CREATE INDEX IF NOT EXISTS idx_students_firebase_uid ON students (firebase_uid);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_students_updated_at ON students;
CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
