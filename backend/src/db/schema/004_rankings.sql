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

  student_name    VARCHAR(255)  NOT NULL,

  calculated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- One ranking record per student overall
  UNIQUE (student_id)
);

CREATE INDEX IF NOT EXISTS idx_rankings_student_id     ON rankings (student_id);
CREATE INDEX IF NOT EXISTS idx_rankings_overall_score  ON rankings (overall_score DESC);

DROP TRIGGER IF EXISTS trg_rankings_updated_at ON rankings;
CREATE TRIGGER trg_rankings_updated_at
  BEFORE UPDATE ON rankings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
