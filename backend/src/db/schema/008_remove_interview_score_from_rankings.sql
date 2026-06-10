-- =============================================================================
-- 008_remove_interview_score_from_rankings.sql
-- Drop the interview_score column from rankings table
-- =============================================================================

ALTER TABLE rankings DROP COLUMN IF EXISTS interview_score;
