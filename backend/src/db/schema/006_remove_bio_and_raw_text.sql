-- =============================================================================
-- 006_remove_bio_and_raw_text.sql
-- Drop the bio column from students table and raw_text column from resumes table
-- =============================================================================

ALTER TABLE students DROP COLUMN IF EXISTS bio;
ALTER TABLE resumes DROP COLUMN IF EXISTS raw_text;
