-- =============================================================================
-- 007_add_course_and_branch.sql
-- Add course, branch, year_of_study, and gpa columns to students table
-- =============================================================================

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS course VARCHAR(100),
  ADD COLUMN IF NOT EXISTS branch VARCHAR(255),
  ADD COLUMN IF NOT EXISTS year_of_study VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gpa VARCHAR(20);
