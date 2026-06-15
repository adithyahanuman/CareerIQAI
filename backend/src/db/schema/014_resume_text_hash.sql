-- =============================================================================
-- 014_resume_text_hash.sql
-- Add resume_text_hash column to resumes table so the cache check
-- compares actual content (SHA-256) instead of just the filename.
-- =============================================================================

ALTER TABLE resumes
  ADD COLUMN IF NOT EXISTS resume_text_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_resumes_text_hash ON resumes (student_id, resume_text_hash);
