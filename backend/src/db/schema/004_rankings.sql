-- =============================================================================
-- 004_rankings.sql
-- Rankings table – AI-computed student career readiness scores / leaderboard
-- Depends on: 001_students.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS rankings (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID          NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Overall career-readiness score (0–100)
  overall_score   SMALLINT      NOT NULL DEFAULT 0
                  CHECK (overall_score BETWEEN 0 AND 100),

  -- Component scores (0–100 each)
  resume_score    SMALLINT      DEFAULT 0 CHECK (resume_score BETWEEN 0 AND 100),
  skills_score    SMALLINT      DEFAULT 0 CHECK (skills_score BETWEEN 0 AND 100),
  projects_score  SMALLINT      DEFAULT 0 CHECK (projects_score BETWEEN 0 AND 100),
  interview_score SMALLINT      DEFAULT 0 CHECK (interview_score BETWEEN 0 AND 100),

  -- Computed rank position (recalculated periodically by a background job)
  rank_position   INTEGER,      -- NULL until first calculation
  rank_tier       VARCHAR(30),  -- 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

  -- Metadata
  target_role     VARCHAR(255), -- e.g. "Software Engineer – Frontend"
  target_company  VARCHAR(255),

  -- Detailed breakdown stored as JSONB (skills gap, recommendations, …)
  details         JSONB,

  calculated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- One ranking record per student per role/company combination
  UNIQUE (student_id, target_role, target_company)
);

CREATE INDEX IF NOT EXISTS idx_rankings_student_id     ON rankings (student_id);
CREATE INDEX IF NOT EXISTS idx_rankings_overall_score  ON rankings (overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_rankings_rank_position  ON rankings (rank_position ASC);

DROP TRIGGER IF EXISTS trg_rankings_updated_at ON rankings;
CREATE TRIGGER trg_rankings_updated_at
  BEFORE UPDATE ON rankings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
