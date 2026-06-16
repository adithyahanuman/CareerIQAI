-- =============================================================================
-- 015_role_tables.sql
-- One dedicated table per role for global fit-score benchmarking.
-- All tiers share the same role tables (global ranking across B.Tech / M.Tech / etc.)
-- Depends on: 001_students.sql, 011_benchmarks.sql
-- =============================================================================

-- Helper: reusable trigger function must exist (created in 001_students.sql)
-- Each role table has UNIQUE(student_id) so only the LATEST session result
-- for a student is kept — achieved via INSERT … ON CONFLICT DO UPDATE.

-- ── B.TECH / M.TECH roles ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS role_software_engineer (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_se_score ON role_software_engineer (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_full_stack_developer (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_fsd_score ON role_full_stack_developer (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_data_engineer (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_de_score ON role_data_engineer (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_data_scientist (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_ds_score ON role_data_scientist (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_machine_learning_engineer (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_mle_score ON role_machine_learning_engineer (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_devops_engineer (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_dops_score ON role_devops_engineer (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_cyber_security_engineer (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_cse_score ON role_cyber_security_engineer (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_embedded_systems_engineer (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_ese_score ON role_embedded_systems_engineer (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_vlsi_engineer (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_vlsi_score ON role_vlsi_engineer (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_hardware_engineer (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_hw_score ON role_hardware_engineer (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_electrical_engineer (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_ee_score ON role_electrical_engineer (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_mechanical_engineer (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_me_score ON role_mechanical_engineer (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_civil_engineer (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_ce_score ON role_civil_engineer (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_process_engineer (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_pe_score ON role_process_engineer (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_biomedical_engineer (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_bme_score ON role_biomedical_engineer (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_business_analyst (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_ba_score ON role_business_analyst (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_consultant (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_con_score ON role_consultant (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_financial_analyst (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_fa_score ON role_financial_analyst (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_product_manager (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_pm_score ON role_product_manager (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_graduate_engineer_trainee (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_get_score ON role_graduate_engineer_trainee (fit_score DESC);

-- ── M.TECH additional roles ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS role_cloud_architect (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_ca_score ON role_cloud_architect (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_research_scientist (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_rs_score ON role_research_scientist (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_senior_vlsi_engineer (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_svlsi_score ON role_senior_vlsi_engineer (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_senior_embedded_systems_engineer (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_sese_score ON role_senior_embedded_systems_engineer (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_advanced_ai_ml_engineer (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_aiml_score ON role_advanced_ai_ml_engineer (fit_score DESC);

-- ── M.Sc roles ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS role_bioinformatics_scientist (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_bio_score ON role_bioinformatics_scientist (fit_score DESC);

-- ── MBA roles ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS role_marketing_analyst (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_ma_score ON role_marketing_analyst (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_hr_specialist (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_hr_score ON role_hr_specialist (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_supply_chain_analyst (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_sca_score ON role_supply_chain_analyst (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_management_trainee (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_mt_score ON role_management_trainee (fit_score DESC);

-- ── PhD roles ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS role_professor_academic_researcher (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_par_score ON role_professor_academic_researcher (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_ai_research_scientist (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_airs_score ON role_ai_research_scientist (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_semiconductor_research_scientist (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_srs_score ON role_semiconductor_research_scientist (fit_score DESC);

CREATE TABLE IF NOT EXISTS role_technology_specialist (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID         NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  student_id             UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name           VARCHAR(255) NOT NULL,
  fit_score              SMALLINT     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  grade                  VARCHAR(4)   NOT NULL,
  major_strength         TEXT,
  improvement_suggestion TEXT,
  detailed_analysis      JSONB,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_role_ts_score ON role_technology_specialist (fit_score DESC);
