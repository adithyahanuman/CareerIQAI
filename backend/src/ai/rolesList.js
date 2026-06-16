'use strict';

/**
 * ai/rolesList.js
 *
 * Predefined placement role lists by course level.
 * Tiers: btech | mtech | msc | mba | phd
 */

const ROLES = {

  btech: [
    'Software Engineer',
    'Full Stack Developer',
    'Data Engineer',
    'Data Scientist',
    'Machine Learning Engineer',
    'DevOps Engineer',
    'Cyber Security Engineer',
    'Embedded Systems Engineer',
    'VLSI Engineer',
    'Hardware Engineer',
    'Electrical Engineer',
    'Mechanical Engineer',
    'Civil Engineer',
    'Process Engineer',
    'Biomedical Engineer',
    'Business Analyst',
    'Consultant',
    'Financial Analyst',
    'Product Manager',
    'Graduate Engineer Trainee (GET)',
  ],

  mtech: [
    // All B.Tech roles
    'Software Engineer',
    'Full Stack Developer',
    'Data Engineer',
    'Data Scientist',
    'Machine Learning Engineer',
    'DevOps Engineer',
    'Cyber Security Engineer',
    'Embedded Systems Engineer',
    'VLSI Engineer',
    'Hardware Engineer',
    'Electrical Engineer',
    'Mechanical Engineer',
    'Civil Engineer',
    'Process Engineer',
    'Biomedical Engineer',
    'Business Analyst',
    'Consultant',
    'Financial Analyst',
    'Product Manager',
    'Graduate Engineer Trainee (GET)',
    // M.Tech additions
    'Cloud Architect',
    'Research Scientist',
    'Senior VLSI Engineer',
    'Senior Embedded Systems Engineer',
    'Advanced AI/ML Engineer',
  ],

  msc: [
    'Data Scientist',
    'Data Engineer',
    'Bioinformatics Scientist',
    'Research Scientist',
    'Financial Analyst',
    'Business Analyst',
  ],

  mba: [
    'Business Analyst',
    'Consultant',
    'Product Manager',
    'Financial Analyst',
    'Marketing Analyst',
    'HR Specialist',
    'Supply Chain Analyst',
    'Management Trainee',
  ],

  phd: [
    'Research Scientist',
    'Professor / Academic Researcher',
    'AI Research Scientist',
    'Semiconductor Research Scientist',
    'Technology Specialist',
  ],
};

/**
 * Detect the course tier from free-text degree/course strings.
 *
 * @param {string} degreeText  - e.g. "B.Tech Computer Science", "M.Tech AI", "MBA", "PhD"
 * @returns {'btech'|'mtech'|'msc'|'mba'|'phd'}
 */
function detectCourseTier(degreeText) {
  if (!degreeText) return 'btech';
  const t = degreeText.toLowerCase();

  if (t.includes('ph.d') || t.includes('phd') || t.includes('doctorate') || t.includes('doctor of')) {
    return 'phd';
  }
  if (t.includes('mba') || t.includes('m.b.a') || t.includes('master of business')) {
    return 'mba';
  }
  if (
    t.includes('m.sc') || t.includes('msc') || t.includes('m.s.') ||
    (t.includes('master') && (t.includes('science') || t.includes('sc')))
  ) {
    return 'msc';
  }
  if (
    t.includes('m.tech') || t.includes('mtech') || t.includes('m tech') ||
    t.includes('m.e') || t.includes('master of technology') || t.includes('master of engineering') ||
    t.includes('pg') || t.includes('post grad') || t.includes('master')
  ) {
    return 'mtech';
  }
  // Default: B.Tech / B.E / BE / any undergrad
  return 'btech';
}

/**
 * Return the role list for a given course text.
 *
 * @param {string} courseText
 * @returns {string[]}
 */
function getRolesForCourse(courseText) {
  return ROLES[detectCourseTier(courseText)] || ROLES.btech;
}

/**
 * Maps every role string → its dedicated PostgreSQL table name.
 * Rule: lowercase, non-alphanumeric runs → single underscore, prefix `role_`.
 * Special cases (GET, AI/ML, /) are handled explicitly below.
 */
const ROLE_TABLE_MAP = {
  // ── B.Tech / M.Tech ────────────────────────────────────────────────────────
  'Software Engineer':                    'role_software_engineer',
  'Full Stack Developer':                 'role_full_stack_developer',
  'Data Engineer':                        'role_data_engineer',
  'Data Scientist':                       'role_data_scientist',
  'Machine Learning Engineer':            'role_machine_learning_engineer',
  'DevOps Engineer':                      'role_devops_engineer',
  'Cyber Security Engineer':              'role_cyber_security_engineer',
  'Embedded Systems Engineer':            'role_embedded_systems_engineer',
  'VLSI Engineer':                        'role_vlsi_engineer',
  'Hardware Engineer':                    'role_hardware_engineer',
  'Electrical Engineer':                  'role_electrical_engineer',
  'Mechanical Engineer':                  'role_mechanical_engineer',
  'Civil Engineer':                       'role_civil_engineer',
  'Process Engineer':                     'role_process_engineer',
  'Biomedical Engineer':                  'role_biomedical_engineer',
  'Business Analyst':                     'role_business_analyst',
  'Consultant':                           'role_consultant',
  'Financial Analyst':                    'role_financial_analyst',
  'Product Manager':                      'role_product_manager',
  'Graduate Engineer Trainee (GET)':      'role_graduate_engineer_trainee',
  // ── M.Tech additions ───────────────────────────────────────────────────────
  'Cloud Architect':                      'role_cloud_architect',
  'Research Scientist':                   'role_research_scientist',
  'Senior VLSI Engineer':                 'role_senior_vlsi_engineer',
  'Senior Embedded Systems Engineer':     'role_senior_embedded_systems_engineer',
  'Advanced AI/ML Engineer':              'role_advanced_ai_ml_engineer',
  // ── M.Sc ───────────────────────────────────────────────────────────────────
  'Bioinformatics Scientist':             'role_bioinformatics_scientist',
  // ── MBA ────────────────────────────────────────────────────────────────────
  'Marketing Analyst':                    'role_marketing_analyst',
  'HR Specialist':                        'role_hr_specialist',
  'Supply Chain Analyst':                 'role_supply_chain_analyst',
  'Management Trainee':                   'role_management_trainee',
  // ── PhD ────────────────────────────────────────────────────────────────────
  'Professor / Academic Researcher':      'role_professor_academic_researcher',
  'AI Research Scientist':                'role_ai_research_scientist',
  'Semiconductor Research Scientist':     'role_semiconductor_research_scientist',
  'Technology Specialist':                'role_technology_specialist',
};

/**
 * Resolve a role display name to its DB table name.
 * Returns null if the role is not in the map (safe fallback).
 * @param {string} roleName
 * @returns {string|null}
 */
function getRoleTable(roleName) {
  return ROLE_TABLE_MAP[roleName] ?? null;
}

module.exports = { ROLES, ROLE_TABLE_MAP, detectCourseTier, getRolesForCourse, getRoleTable };
