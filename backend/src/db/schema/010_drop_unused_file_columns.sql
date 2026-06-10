-- =============================================================================
-- 010_drop_unused_file_columns.sql
-- Removes file_url and file_size_bytes from the resumes table.
-- These columns were placeholder stubs for S3/GCS storage that was never
-- implemented. Resume text is stored in Firestore; no file URL is needed.
-- =============================================================================

ALTER TABLE resumes
  DROP COLUMN IF EXISTS file_url,
  DROP COLUMN IF EXISTS file_size_bytes;
