-- =============================================================================
-- 002_resumes.sql
-- Resumes table – stores uploaded resume metadata and AI analysis results
-- Depends on: 001_students.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS resumes (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID          NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- File storage
  file_name       VARCHAR(255)  NOT NULL,
  mime_type       VARCHAR(100)  DEFAULT 'application/pdf',

  -- Parsed plain-text content
  raw_text        TEXT,

  -- AI-generated analysis (stored as JSONB for flexibility)
  parsed_data     JSONB,        -- structured extraction: skills, education, experience …
  analysis        JSONB,        -- AI score, suggestions, weaknesses, strengths
  ats_score       SMALLINT      CHECK (ats_score BETWEEN 0 AND 100),

  -- Status lifecycle
  status          VARCHAR(30)   NOT NULL DEFAULT 'uploaded',
  -- 'uploaded' → 'parsing' → 'parsed' → 'analysing' → 'done' | 'error'

  error_message   TEXT,         -- populated when status = 'error'
  is_primary      BOOLEAN       NOT NULL DEFAULT FALSE, -- student's active resume

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resumes_student_id ON resumes (student_id);
CREATE INDEX IF NOT EXISTS idx_resumes_status     ON resumes (status);

DROP TRIGGER IF EXISTS trg_resumes_updated_at ON resumes;
CREATE TRIGGER trg_resumes_updated_at
  BEFORE UPDATE ON resumes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
