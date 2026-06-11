-- =============================================================================
-- 012_roadmaps.sql
-- One saved roadmap per student (upsert replaces previous).
-- =============================================================================

CREATE TABLE IF NOT EXISTS roadmaps (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID         NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  from_role    VARCHAR(255) NOT NULL,
  to_role      VARCHAR(255) NOT NULL,
  roadmap_data JSONB        NOT NULL,
  raw_text     TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_roadmaps_updated_at ON roadmaps;
CREATE TRIGGER trg_roadmaps_updated_at
  BEFORE UPDATE ON roadmaps
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
