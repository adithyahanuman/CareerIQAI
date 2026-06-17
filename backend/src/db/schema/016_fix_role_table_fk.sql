-- =============================================================================
-- 016_fix_role_table_fk.sql
-- Drops the strict session_id FK from all role tables.
-- The session_id is kept as a plain UUID reference (no FK) so that:
--   1. Old sessions can be deleted without cascading to role score rows
--   2. Upserts never fail due to FK violations
-- Also backfills role tables from existing benchmark_results data.
-- =============================================================================

ALTER TABLE role_software_engineer DROP CONSTRAINT IF EXISTS role_software_engineer_session_id_fkey;
ALTER TABLE role_full_stack_developer DROP CONSTRAINT IF EXISTS role_full_stack_developer_session_id_fkey;
ALTER TABLE role_data_engineer DROP CONSTRAINT IF EXISTS role_data_engineer_session_id_fkey;
ALTER TABLE role_data_scientist DROP CONSTRAINT IF EXISTS role_data_scientist_session_id_fkey;
ALTER TABLE role_machine_learning_engineer DROP CONSTRAINT IF EXISTS role_machine_learning_engineer_session_id_fkey;
ALTER TABLE role_devops_engineer DROP CONSTRAINT IF EXISTS role_devops_engineer_session_id_fkey;
ALTER TABLE role_cyber_security_engineer DROP CONSTRAINT IF EXISTS role_cyber_security_engineer_session_id_fkey;
ALTER TABLE role_embedded_systems_engineer DROP CONSTRAINT IF EXISTS role_embedded_systems_engineer_session_id_fkey;
ALTER TABLE role_vlsi_engineer DROP CONSTRAINT IF EXISTS role_vlsi_engineer_session_id_fkey;
ALTER TABLE role_hardware_engineer DROP CONSTRAINT IF EXISTS role_hardware_engineer_session_id_fkey;
ALTER TABLE role_electrical_engineer DROP CONSTRAINT IF EXISTS role_electrical_engineer_session_id_fkey;
ALTER TABLE role_mechanical_engineer DROP CONSTRAINT IF EXISTS role_mechanical_engineer_session_id_fkey;
ALTER TABLE role_civil_engineer DROP CONSTRAINT IF EXISTS role_civil_engineer_session_id_fkey;
ALTER TABLE role_process_engineer DROP CONSTRAINT IF EXISTS role_process_engineer_session_id_fkey;
ALTER TABLE role_biomedical_engineer DROP CONSTRAINT IF EXISTS role_biomedical_engineer_session_id_fkey;
ALTER TABLE role_business_analyst DROP CONSTRAINT IF EXISTS role_business_analyst_session_id_fkey;
ALTER TABLE role_consultant DROP CONSTRAINT IF EXISTS role_consultant_session_id_fkey;
ALTER TABLE role_financial_analyst DROP CONSTRAINT IF EXISTS role_financial_analyst_session_id_fkey;
ALTER TABLE role_product_manager DROP CONSTRAINT IF EXISTS role_product_manager_session_id_fkey;
ALTER TABLE role_graduate_engineer_trainee DROP CONSTRAINT IF EXISTS role_graduate_engineer_trainee_session_id_fkey;
ALTER TABLE role_cloud_architect DROP CONSTRAINT IF EXISTS role_cloud_architect_session_id_fkey;
ALTER TABLE role_research_scientist DROP CONSTRAINT IF EXISTS role_research_scientist_session_id_fkey;
ALTER TABLE role_senior_vlsi_engineer DROP CONSTRAINT IF EXISTS role_senior_vlsi_engineer_session_id_fkey;
ALTER TABLE role_senior_embedded_systems_engineer DROP CONSTRAINT IF EXISTS role_senior_embedded_systems_engineer_session_id_fkey;
ALTER TABLE role_advanced_ai_ml_engineer DROP CONSTRAINT IF EXISTS role_advanced_ai_ml_engineer_session_id_fkey;
ALTER TABLE role_bioinformatics_scientist DROP CONSTRAINT IF EXISTS role_bioinformatics_scientist_session_id_fkey;
ALTER TABLE role_marketing_analyst DROP CONSTRAINT IF EXISTS role_marketing_analyst_session_id_fkey;
ALTER TABLE role_hr_specialist DROP CONSTRAINT IF EXISTS role_hr_specialist_session_id_fkey;
ALTER TABLE role_supply_chain_analyst DROP CONSTRAINT IF EXISTS role_supply_chain_analyst_session_id_fkey;
ALTER TABLE role_management_trainee DROP CONSTRAINT IF EXISTS role_management_trainee_session_id_fkey;
ALTER TABLE role_professor_academic_researcher DROP CONSTRAINT IF EXISTS role_professor_academic_researcher_session_id_fkey;
ALTER TABLE role_ai_research_scientist DROP CONSTRAINT IF EXISTS role_ai_research_scientist_session_id_fkey;
ALTER TABLE role_semiconductor_research_scientist DROP CONSTRAINT IF EXISTS role_semiconductor_research_scientist_session_id_fkey;
ALTER TABLE role_technology_specialist DROP CONSTRAINT IF EXISTS role_technology_specialist_session_id_fkey;

-- Backfill role tables from benchmark_results using the latest session per student per role

-- Backfill Software Engineer (role_software_engineer)
INSERT INTO role_software_engineer (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Software Engineer'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Full Stack Developer (role_full_stack_developer)
INSERT INTO role_full_stack_developer (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Full Stack Developer'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Data Engineer (role_data_engineer)
INSERT INTO role_data_engineer (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Data Engineer'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Data Scientist (role_data_scientist)
INSERT INTO role_data_scientist (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Data Scientist'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Machine Learning Engineer (role_machine_learning_engineer)
INSERT INTO role_machine_learning_engineer (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Machine Learning Engineer'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill DevOps Engineer (role_devops_engineer)
INSERT INTO role_devops_engineer (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'DevOps Engineer'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Cyber Security Engineer (role_cyber_security_engineer)
INSERT INTO role_cyber_security_engineer (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Cyber Security Engineer'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Embedded Systems Engineer (role_embedded_systems_engineer)
INSERT INTO role_embedded_systems_engineer (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Embedded Systems Engineer'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill VLSI Engineer (role_vlsi_engineer)
INSERT INTO role_vlsi_engineer (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'VLSI Engineer'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Hardware Engineer (role_hardware_engineer)
INSERT INTO role_hardware_engineer (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Hardware Engineer'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Electrical Engineer (role_electrical_engineer)
INSERT INTO role_electrical_engineer (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Electrical Engineer'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Mechanical Engineer (role_mechanical_engineer)
INSERT INTO role_mechanical_engineer (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Mechanical Engineer'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Civil Engineer (role_civil_engineer)
INSERT INTO role_civil_engineer (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Civil Engineer'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Process Engineer (role_process_engineer)
INSERT INTO role_process_engineer (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Process Engineer'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Biomedical Engineer (role_biomedical_engineer)
INSERT INTO role_biomedical_engineer (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Biomedical Engineer'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Business Analyst (role_business_analyst)
INSERT INTO role_business_analyst (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Business Analyst'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Consultant (role_consultant)
INSERT INTO role_consultant (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Consultant'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Financial Analyst (role_financial_analyst)
INSERT INTO role_financial_analyst (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Financial Analyst'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Product Manager (role_product_manager)
INSERT INTO role_product_manager (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Product Manager'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Graduate Engineer Trainee (GET) (role_graduate_engineer_trainee)
INSERT INTO role_graduate_engineer_trainee (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Graduate Engineer Trainee (GET)'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Cloud Architect (role_cloud_architect)
INSERT INTO role_cloud_architect (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Cloud Architect'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Research Scientist (role_research_scientist)
INSERT INTO role_research_scientist (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Research Scientist'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Senior VLSI Engineer (role_senior_vlsi_engineer)
INSERT INTO role_senior_vlsi_engineer (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Senior VLSI Engineer'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Senior Embedded Systems Engineer (role_senior_embedded_systems_engineer)
INSERT INTO role_senior_embedded_systems_engineer (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Senior Embedded Systems Engineer'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Advanced AI/ML Engineer (role_advanced_ai_ml_engineer)
INSERT INTO role_advanced_ai_ml_engineer (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Advanced AI/ML Engineer'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Bioinformatics Scientist (role_bioinformatics_scientist)
INSERT INTO role_bioinformatics_scientist (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Bioinformatics Scientist'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Marketing Analyst (role_marketing_analyst)
INSERT INTO role_marketing_analyst (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Marketing Analyst'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill HR Specialist (role_hr_specialist)
INSERT INTO role_hr_specialist (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'HR Specialist'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Supply Chain Analyst (role_supply_chain_analyst)
INSERT INTO role_supply_chain_analyst (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Supply Chain Analyst'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Management Trainee (role_management_trainee)
INSERT INTO role_management_trainee (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Management Trainee'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Professor / Academic Researcher (role_professor_academic_researcher)
INSERT INTO role_professor_academic_researcher (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Professor / Academic Researcher'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill AI Research Scientist (role_ai_research_scientist)
INSERT INTO role_ai_research_scientist (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'AI Research Scientist'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Semiconductor Research Scientist (role_semiconductor_research_scientist)
INSERT INTO role_semiconductor_research_scientist (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Semiconductor Research Scientist'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();

-- Backfill Technology Specialist (role_technology_specialist)
INSERT INTO role_technology_specialist (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
SELECT DISTINCT ON (br.student_id)
  br.session_id,
  br.student_id,
  br.student_name,
  br.fit_score::smallint,
  br.grade,
  br.major_strength,
  br.improvement_suggestion,
  br.detailed_analysis::jsonb,
  NOW()
FROM benchmark_results br
JOIN benchmark_sessions bs ON bs.id = br.session_id
WHERE br.role_name = 'Technology Specialist'
  AND bs.status = 'done'
ORDER BY br.student_id, bs.created_at DESC
ON CONFLICT (student_id) DO UPDATE SET
  session_id             = EXCLUDED.session_id,
  student_name           = EXCLUDED.student_name,
  fit_score              = EXCLUDED.fit_score,
  grade                  = EXCLUDED.grade,
  major_strength         = EXCLUDED.major_strength,
  improvement_suggestion = EXCLUDED.improvement_suggestion,
  detailed_analysis      = EXCLUDED.detailed_analysis,
  updated_at             = NOW();
