-- ── 011_benchmarks.sql ───────────────────────────────────────────────────────
-- Two tables:
--   benchmark_sessions  – one row per "run" (who triggered it, what roles)
--   benchmark_results   – one row per (candidate × job_role) score pair
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS benchmark_sessions (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by    UUID          NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  job_roles     JSONB         NOT NULL DEFAULT '[]',   -- array of role strings
  candidate_ids JSONB         NOT NULL DEFAULT '[]',   -- array of student UUIDs scored
  status        VARCHAR(20)   NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','running','done','error')),
  error_message TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS benchmark_results (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID          NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id            UUID          NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name          VARCHAR(255)  NOT NULL,
  role_name             VARCHAR(255)  NOT NULL,
  fit_score             SMALLINT      NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                 VARCHAR(4)    NOT NULL,
  major_strength        TEXT,
  improvement_suggestion TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_benchmark_results_session  ON benchmark_results(session_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_results_student  ON benchmark_results(student_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_sessions_creator ON benchmark_sessions(created_by);
