-- =============================================================================
-- 016_fix_role_table_fk.sql
-- Drops the strict session_id FK from all role tables.
-- The session_id is kept as a plain UUID reference (no FK) so that:
--   1. Old sessions can be deleted without cascading to role score rows
--   2. Upserts never fail due to FK violations
-- Also backfills role tables from existing benchmark_results data.
-- =============================================================================

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'role_software_engineer','role_full_stack_developer','role_data_engineer',
    'role_data_scientist','role_machine_learning_engineer','role_devops_engineer',
    'role_cyber_security_engineer','role_embedded_systems_engineer','role_vlsi_engineer',
    'role_hardware_engineer','role_electrical_engineer','role_mechanical_engineer',
    'role_civil_engineer','role_process_engineer','role_biomedical_engineer',
    'role_business_analyst','role_consultant','role_financial_analyst',
    'role_product_manager','role_graduate_engineer_trainee','role_cloud_architect',
    'role_research_scientist','role_senior_vlsi_engineer','role_senior_embedded_systems_engineer',
    'role_advanced_ai_ml_engineer','role_bioinformatics_scientist','role_marketing_analyst',
    'role_hr_specialist','role_supply_chain_analyst','role_management_trainee',
    'role_professor_academic_researcher','role_ai_research_scientist',
    'role_semiconductor_research_scientist','role_technology_specialist'
  ];
  fk_name TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Find and drop the session_id FK constraint
    SELECT tc.constraint_name INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name
    WHERE tc.table_name = tbl
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'session_id'
    LIMIT 1;

    IF fk_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', tbl, fk_name);
      RAISE NOTICE 'Dropped FK % from %', fk_name, tbl;
    END IF;
  END LOOP;
END;
$$;

-- Backfill role tables from benchmark_results using the latest session per student per role
-- This uses the ROLE_TABLE_MAP logic: role_name → table
-- We do this manually for each role by inserting from benchmark_results

CREATE OR REPLACE FUNCTION _backfill_role_table(role_display_name TEXT, role_table TEXT)
RETURNS void AS $$
DECLARE
  v_sql TEXT;
BEGIN
  v_sql := format($q$
    INSERT INTO %I (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
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
    WHERE br.role_name = %L
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
      updated_at             = NOW()
  $q$, role_table, role_display_name);
  EXECUTE v_sql;
  RAISE NOTICE 'Backfilled %', role_table;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error backfilling %: %', role_table, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Run backfill for all roles
SELECT _backfill_role_table('Software Engineer',               'role_software_engineer');
SELECT _backfill_role_table('Full Stack Developer',            'role_full_stack_developer');
SELECT _backfill_role_table('Data Engineer',                   'role_data_engineer');
SELECT _backfill_role_table('Data Scientist',                  'role_data_scientist');
SELECT _backfill_role_table('Machine Learning Engineer',       'role_machine_learning_engineer');
SELECT _backfill_role_table('DevOps Engineer',                 'role_devops_engineer');
SELECT _backfill_role_table('Cyber Security Engineer',         'role_cyber_security_engineer');
SELECT _backfill_role_table('Embedded Systems Engineer',       'role_embedded_systems_engineer');
SELECT _backfill_role_table('VLSI Engineer',                   'role_vlsi_engineer');
SELECT _backfill_role_table('Hardware Engineer',               'role_hardware_engineer');
SELECT _backfill_role_table('Electrical Engineer',             'role_electrical_engineer');
SELECT _backfill_role_table('Mechanical Engineer',             'role_mechanical_engineer');
SELECT _backfill_role_table('Civil Engineer',                  'role_civil_engineer');
SELECT _backfill_role_table('Process Engineer',                'role_process_engineer');
SELECT _backfill_role_table('Biomedical Engineer',             'role_biomedical_engineer');
SELECT _backfill_role_table('Business Analyst',                'role_business_analyst');
SELECT _backfill_role_table('Consultant',                      'role_consultant');
SELECT _backfill_role_table('Financial Analyst',               'role_financial_analyst');
SELECT _backfill_role_table('Product Manager',                 'role_product_manager');
SELECT _backfill_role_table('Graduate Engineer Trainee (GET)', 'role_graduate_engineer_trainee');
SELECT _backfill_role_table('Cloud Architect',                 'role_cloud_architect');
SELECT _backfill_role_table('Research Scientist',              'role_research_scientist');
SELECT _backfill_role_table('Senior VLSI Engineer',            'role_senior_vlsi_engineer');
SELECT _backfill_role_table('Senior Embedded Systems Engineer','role_senior_embedded_systems_engineer');
SELECT _backfill_role_table('Advanced AI/ML Engineer',         'role_advanced_ai_ml_engineer');
SELECT _backfill_role_table('Bioinformatics Scientist',        'role_bioinformatics_scientist');
SELECT _backfill_role_table('Marketing Analyst',               'role_marketing_analyst');
SELECT _backfill_role_table('HR Specialist',                   'role_hr_specialist');
SELECT _backfill_role_table('Supply Chain Analyst',            'role_supply_chain_analyst');
SELECT _backfill_role_table('Management Trainee',              'role_management_trainee');
SELECT _backfill_role_table('Professor / Academic Researcher', 'role_professor_academic_researcher');
SELECT _backfill_role_table('AI Research Scientist',           'role_ai_research_scientist');
SELECT _backfill_role_table('Semiconductor Research Scientist','role_semiconductor_research_scientist');
SELECT _backfill_role_table('Technology Specialist',           'role_technology_specialist');

DROP FUNCTION IF EXISTS _backfill_role_table(TEXT, TEXT);
