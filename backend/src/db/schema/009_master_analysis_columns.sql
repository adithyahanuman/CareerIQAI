-- =============================================================================
-- 009_master_analysis_columns.sql
-- Add 13 dedicated JSONB columns to resumes table — one per master prompt section.
-- Each column stores a full JSON object for that analysis section.
-- The old `analysis` column is kept for backward compatibility.
-- =============================================================================

ALTER TABLE resumes ADD COLUMN IF NOT EXISTS contact_analysis         JSONB;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS summary_analysis         JSONB;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS experience_analysis      JSONB;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS education_analysis       JSONB;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS skills_analysis          JSONB;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS projects_analysis        JSONB;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS formatting_analysis      JSONB;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS certifications_analysis  JSONB;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS extracurriculars_analysis JSONB;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS overall_analysis         JSONB;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS action_plan_analysis     JSONB;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS completeness_analysis    JSONB;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS confidence_analysis      JSONB;

-- Index on overall_analysis for fast score lookups
CREATE INDEX IF NOT EXISTS idx_resumes_overall_analysis ON resumes USING gin (overall_analysis);
