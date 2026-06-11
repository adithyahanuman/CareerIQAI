-- ── 013_benchmark_resume_hash.sql ────────────────────────────────────────────
-- Adds a SHA-256 hash column to benchmark_sessions so we can detect
-- whether the session was generated from the same resume text as the
-- current one in Firestore. Allows smart cache-invalidation.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE benchmark_sessions
  ADD COLUMN IF NOT EXISTS resume_text_hash VARCHAR(64);

-- Index for fast hash lookups
CREATE INDEX IF NOT EXISTS idx_benchmark_sessions_hash
  ON benchmark_sessions(created_by, resume_text_hash)
  WHERE status = 'done';
