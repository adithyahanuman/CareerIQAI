-- =============================================================================
-- 003_projects.sql
-- Projects table – portfolio projects linked to a student
-- Depends on: 001_students.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS projects (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID          NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  title           VARCHAR(255)  NOT NULL,
  description     TEXT,
  short_summary   VARCHAR(500), -- one-liner for cards / previews

  -- Tech stack stored as an array for easy querying
  tech_stack      TEXT[]        NOT NULL DEFAULT '{}',

  -- Links
  repo_url        TEXT,         -- GitHub / GitLab
  live_url        TEXT,         -- deployed demo
  thumbnail_url   TEXT,

  -- Dates (user-supplied, not DB timestamps)
  start_date      DATE,
  end_date        DATE,
  is_ongoing      BOOLEAN       NOT NULL DEFAULT FALSE,

  -- AI-generated analysis
  ai_feedback     JSONB,        -- complexity rating, improvements, keyword match …

  -- Visibility
  is_featured     BOOLEAN       NOT NULL DEFAULT FALSE,
  is_public       BOOLEAN       NOT NULL DEFAULT TRUE,

  display_order   SMALLINT      NOT NULL DEFAULT 0,  -- for manual ordering

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_student_id  ON projects (student_id);
CREATE INDEX IF NOT EXISTS idx_projects_tech_stack  ON projects USING GIN (tech_stack);

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
