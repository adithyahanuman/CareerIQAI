/**
 * services/resumeService.js
 *
 * Resume business logic – PostgreSQL queries for upload and retrieval.
 * Uses the Master Prompt (13 sections). Each section is stored in its
 * own dedicated JSONB column. The legacy `analysis` column is also
 * populated for backward compatibility.
 */

'use strict';

const crypto              = require('crypto');
const { query }           = require('../config/db');
const aiService           = require('../ai/aiService');
const prompts             = require('../ai/prompts');
// Lazy-required to avoid a circular dependency at module load time
const getBenchmarkService = () => require('./benchmarkService');

/** SHA-256 hex of a string */
function sha256(text) {
  return crypto.createHash('sha256').update(text || '').digest('hex');
}

// ---------------------------------------------------------------------------
// CREATE / UPLOAD
// ---------------------------------------------------------------------------

/**
 * Store a new resume text record in PostgreSQL and run master analysis.
 *
 * @param {{ student_id: string, resume_text: string, file_name?: string, target_role_type?: string }} data
 * @returns {Promise<object>} Created/updated resume row
 */
const uploadResume = async ({ student_id, resume_text, file_name = 'resume.txt', target_role_type = 'internship' }) => {
  // Validate student exists
  const studentCheck = await query(
    'SELECT id FROM students WHERE id = $1 LIMIT 1',
    [student_id],
  );
  if (studentCheck.rows.length === 0) {
    const err = new Error(`Student with id "${student_id}" not found.`);
    err.statusCode = 404;
    throw err;
  }

  // ── Content-hash cache: only reuse analysis if the TEXT and TARGET are identical ──────
  // Compute SHA-256 of the raw resume text + target role type so any edit (even one word) or changing target busts
  // the cache and forces a fresh AI run. Added |v3 to bust previous hallucinated AI caches.
  const contentHash = sha256(resume_text + '|' + target_role_type + '|v5');
  console.log(`[resumeService] content hash = ${contentHash.slice(0, 12)}… (target: ${target_role_type})`);

  const cached = await query(
    `SELECT * FROM resumes
     WHERE  student_id       = $1
       AND  resume_text_hash = $2
       AND  status           = 'done'
       AND  overall_analysis IS NOT NULL
     ORDER  BY created_at DESC
     LIMIT  1`,
    [student_id, contentHash],
  );

  if (cached.rows.length > 0) {
    // Same content already analyzed — just re-promote as primary
    await query(
      'UPDATE resumes SET is_primary = FALSE WHERE student_id = $1 AND is_primary = TRUE',
      [student_id],
    );
    const { rows: promoted } = await query(
      `UPDATE resumes SET is_primary = TRUE WHERE id = $1 RETURNING *`,
      [cached.rows[0].id],
    );
    console.log('[resumeService] Cache HIT (hash match) – returning existing analysis for:', file_name);
    return promoted[0];
  }

  // ── No cache hit — content is new or changed. Insert a fresh record ────────
  await query(
    'UPDATE resumes SET is_primary = FALSE WHERE student_id = $1 AND is_primary = TRUE',
    [student_id],
  );

  const { rows } = await query(
    `INSERT INTO resumes
       (student_id, file_name, resume_text_hash, status, is_primary)
     VALUES ($1, $2, $3, 'parsed', TRUE)
     RETURNING *`,
    [student_id, file_name, contentHash],
  );

  // ONE AI call — master prompt returns 13 sections
  try {
    const aiResponse = await aiService.analyzeResume(prompts.fullResumeAnalysis(resume_text, target_role_type));
    const analysis = aiResponse.data;

    // Recalculate raw score and overall score manually to prevent AI math hallucinations
    let calculatedRawScore = 0;
    calculatedRawScore += Number(analysis.contact?.contact_score || 0);
    calculatedRawScore += Number(analysis.summary?.summary_score || 0);
    calculatedRawScore += Number(analysis.experience?.experience_score || 0);
    calculatedRawScore += Number(analysis.education?.education_score || 0);
    calculatedRawScore += Number(analysis.skills?.skills_score || 0);
    calculatedRawScore += Number(analysis.projects?.projects_score || 0);
    calculatedRawScore += Number(analysis.formatting?.formatting_score || 0);
    calculatedRawScore += Number(analysis.certifications?.certifications_score || 0);
    calculatedRawScore += Number(analysis.extracurriculars?.extracurricular_score || 0);

    const calculatedOverallScore = Math.round((calculatedRawScore / 130) * 100);

    let completeness = 0;
    if (analysis.contact?.contact_score > 0) completeness += 20;
    if (analysis.summary?.summary_score > 0) completeness += 20;
    if (analysis.experience?.experience_score > 0) completeness += 20;
    if (analysis.education?.education_score > 0) completeness += 20;
    if (analysis.skills?.skills_score > 0) completeness += 20;

    if (analysis.overall) {
      analysis.overall.raw_score = calculatedRawScore;
      analysis.overall.overall_score = calculatedOverallScore;
    }
    if (analysis.completeness) {
      analysis.completeness.completeness_score = completeness;
    }
    
    // Extract overall score for ats_score column and ensure it is an integer to prevent db cast errors
    const overallScore = calculatedOverallScore;

    // Sanitize AI hallucinations: if fulltime is requested, strictly remove 'Intern' from roles
    if (target_role_type === 'fulltime') {
      const sanitizeRole = (r) => {
        if (typeof r === 'string') {
          return r.replace(/internships?/ig, '').replace(/interns?/ig, 'Junior').trim();
        } else if (r && typeof r === 'object') {
          if (r.role) r.role = r.role.replace(/internships?/ig, '').replace(/interns?/ig, 'Junior').trim();
          if (r.title) r.title = r.title.replace(/internships?/ig, '').replace(/interns?/ig, 'Junior').trim();
          return r;
        }
        return r;
      };

      if (analysis.overall && analysis.overall.recommended_roles) {
        analysis.overall.recommended_roles = analysis.overall.recommended_roles.map(sanitizeRole);
      }
      if (analysis.action_plan && analysis.action_plan.recommended_roles) {
        analysis.action_plan.recommended_roles = analysis.action_plan.recommended_roles.map(sanitizeRole);
      }
    }

    // Build the UPDATE query with all 13 section columns + legacy analysis column
    const updated = await query(
      `UPDATE resumes
       SET    contact_analysis          = $1,
              summary_analysis          = $2,
              experience_analysis       = $3,
              education_analysis        = $4,
              skills_analysis           = $5,
              projects_analysis         = $6,
              formatting_analysis       = $7,
              certifications_analysis   = $8,
              extracurriculars_analysis = $9,
              overall_analysis          = $10,
              action_plan_analysis      = $11,
              completeness_analysis     = $12,
              confidence_analysis       = $13,
              analysis                  = $14,
              ats_score                 = $15,
              status                    = 'done'
       WHERE  id = $16
       RETURNING *`,
      [
        JSON.stringify(analysis.contact          ?? null),
        JSON.stringify(analysis.summary          ?? null),
        JSON.stringify(analysis.experience       ?? null),
        JSON.stringify(analysis.education        ?? null),
        JSON.stringify(analysis.skills           ?? null),
        JSON.stringify(analysis.projects         ?? null),
        JSON.stringify(analysis.formatting       ?? null),
        JSON.stringify(analysis.certifications   ?? null),
        JSON.stringify(analysis.extracurriculars ?? null),
        JSON.stringify(analysis.overall          ?? null),
        JSON.stringify(analysis.action_plan      ?? null),
        JSON.stringify(analysis.resume_completeness  ?? null),
        JSON.stringify(analysis.analysis_confidence  ?? null),
        JSON.stringify(analysis),          // legacy full blob
        overallScore,
        rows[0].id,
      ],
    );

    const saved = updated.rows[0];

    // ── Background: refresh role-fit benchmark scores ──────────────────────
    // Fire-and-forget: does NOT block or affect the resume upload response.
    const studentId = saved.student_id;
    setImmediate(() => {
      getBenchmarkService()
        .refreshMyRoleFit(studentId)
        .then(() => console.log(`[benchmark] Auto-refreshed role-fit for student ${studentId}`))
        .catch(err  => console.warn(`[benchmark] Auto-refresh skipped: ${err.message}`));
    });

    return saved;
  } catch (aiErr) {
    console.error('[resumeService] AI analysis failed:', aiErr.message);
    await query(
      `UPDATE resumes SET status = 'error', error_message = $1 WHERE id = $2`,
      [aiErr.message, rows[0].id],
    );
    return rows[0];
  }
};

// ---------------------------------------------------------------------------
// READ
// ---------------------------------------------------------------------------

/**
 * Get all resumes belonging to a student (newest first).
 */
const getResumesByStudentId = async (studentId) => {
  const { rows } = await query(
    `SELECT
       id, student_id, file_name,
       ats_score, status, is_primary, error_message,
       created_at, updated_at
     FROM   resumes
     WHERE  student_id = $1
     ORDER  BY created_at DESC`,
    [studentId],
  );
  return rows;
};

/**
 * Get a single resume by its UUID (includes all analysis columns).
 */
const getResumeById = async (id) => {
  const { rows } = await query(
    `SELECT * FROM resumes WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
};

/**
 * Get the primary (active) resume for a student — returns all columns
 * so the frontend can read each of the 13 section columns directly.
 */
const getPrimaryResume = async (studentId) => {
  const { rows } = await query(
    `SELECT * FROM resumes
     WHERE  student_id = $1 AND is_primary = TRUE
     LIMIT  1`,
    [studentId],
  );
  return rows[0] ?? null;
};

/**
 * Persist analysis scores back to an existing resume row.
 */
const updateAnalysis = async (resumeId, analysis) => {
  const overallScore = analysis.overall?.overall_score ?? analysis.overall_resume_score ?? null;
  await query(
    `UPDATE resumes
     SET    contact_analysis          = $1,
            summary_analysis          = $2,
            experience_analysis       = $3,
            education_analysis        = $4,
            skills_analysis           = $5,
            projects_analysis         = $6,
            formatting_analysis       = $7,
            certifications_analysis   = $8,
            extracurriculars_analysis = $9,
            overall_analysis          = $10,
            action_plan_analysis      = $11,
            completeness_analysis     = $12,
            confidence_analysis       = $13,
            analysis                  = $14,
            ats_score                 = $15,
            status                    = 'done'
     WHERE  id = $16`,
    [
      JSON.stringify(analysis.contact          ?? null),
      JSON.stringify(analysis.summary          ?? null),
      JSON.stringify(analysis.experience       ?? null),
      JSON.stringify(analysis.education        ?? null),
      JSON.stringify(analysis.skills           ?? null),
      JSON.stringify(analysis.projects         ?? null),
      JSON.stringify(analysis.formatting       ?? null),
      JSON.stringify(analysis.certifications   ?? null),
      JSON.stringify(analysis.extracurriculars ?? null),
      JSON.stringify(analysis.overall          ?? null),
      JSON.stringify(analysis.action_plan      ?? null),
      JSON.stringify(analysis.resume_completeness  ?? null),
      JSON.stringify(analysis.analysis_confidence  ?? null),
      JSON.stringify(analysis),
      overallScore,
      resumeId,
    ],
  );
};

module.exports = {
  uploadResume,
  getResumesByStudentId,
  getResumeById,
  getPrimaryResume,
  updateAnalysis,
};
