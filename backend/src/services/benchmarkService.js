/**
 * services/benchmarkService.js
 *
 * Business logic for the Benchmarking feature.
 *
 *  createSession   – validate input, create DB session, fetch candidate resumes,
 *                    call AI, persist results.
 *  getSession      – fetch one session with all its results.
 *  listSessions    – list sessions for a user (newest first).
 */

'use strict';

const { query }          = require('../config/db');
const aiService          = require('../ai/aiService');
const { benchmarkCandidates } = require('../ai/benchmarkPrompt');

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run a benchmark session.
 *
 * @param {{
 *   createdBy:    string,   // student UUID (the user triggering the run)
 *   candidateIds: string[], // UUIDs of students to benchmark
 *   jobRoles:     string[], // job role strings
 * }} params
 * @returns {Promise<object>} Completed session row with nested results
 */
const createSession = async ({ createdBy, candidateIds, jobRoles }) => {
  if (!candidateIds?.length)  throw Object.assign(new Error('candidateIds must be a non-empty array.'), { statusCode: 422 });
  if (!jobRoles?.length)      throw Object.assign(new Error('jobRoles must be a non-empty array.'), { statusCode: 422 });
  if (candidateIds.length > 20) throw Object.assign(new Error('Maximum 20 candidates per session.'), { statusCode: 422 });
  if (jobRoles.length > 10)     throw Object.assign(new Error('Maximum 10 job roles per session.'), { statusCode: 422 });

  // ── 1. Create session row ──────────────────────────────────────────────────
  const { rows: [session] } = await query(
    `INSERT INTO benchmark_sessions (created_by, job_roles, candidate_ids, status)
     VALUES ($1, $2, $3, 'running') RETURNING *`,
    [createdBy, JSON.stringify(jobRoles), JSON.stringify(candidateIds)],
  );

  try {
    // ── 2. Fetch each candidate's primary resume analysis ──────────────────
    const resumeRows = await Promise.all(
      candidateIds.map(sid =>
        query(
          `SELECT r.id, s.name,
                  r.skills_analysis, r.projects_analysis, r.experience_analysis,
                  r.education_analysis, r.certifications_analysis, r.overall_analysis,
                  r.confidence_analysis, r.action_plan_analysis
           FROM   resumes  r
           JOIN   students s ON s.id = r.student_id
           WHERE  r.student_id = $1 AND r.is_primary = TRUE
           LIMIT  1`,
          [sid],
        ).then(res => res.rows[0] ?? null),
      ),
    );

    // Filter out candidates without a resume
    const validResumes = resumeRows.filter(Boolean).map(r => ({
      id:   r.id,
      name: r.name,
      analysis: {
        skills:           r.skills_analysis           ?? {},
        projects:         r.projects_analysis         ?? {},
        experience:       r.experience_analysis       ?? {},
        education:        r.education_analysis        ?? {},
        certifications:   r.certifications_analysis   ?? {},
        overall:          r.overall_analysis          ?? {},
        analysis_confidence: r.confidence_analysis    ?? {},
        action_plan:      r.action_plan_analysis      ?? {},
      },
    }));

    if (!validResumes.length) {
      throw Object.assign(
        new Error('None of the selected candidates have an analysed resume.'),
        { statusCode: 422 },
      );
    }

    // ── 3. Call AI ─────────────────────────────────────────────────────────
    const prompt   = benchmarkCandidates(validResumes, jobRoles);
    const aiResp   = await aiService.benchmarkResumes(prompt);
    const results  = Array.isArray(aiResp.data) ? aiResp.data : [];

    if (!results.length) throw new Error('AI returned an empty benchmarking response.');

    for (const r of results) {
      await query(
        `INSERT INTO benchmark_results
           (session_id, student_id, student_name, role_name, fit_score, grade, major_strength, improvement_suggestion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          session.id,
          r.student_id   || null,
          r.student_name || 'Unknown',
          r.role_name    || '',
          Math.min(100, Math.max(0, Math.round(Number(r.fit_score) || 0))),
          r.grade        || 'F',
          r.major_strength             || null,
          r.improvement_suggestion     || null,
        ],
      );
    }

    // ── 5. Mark session done ───────────────────────────────────────────────
    const { rows: [done] } = await query(
      `UPDATE benchmark_sessions
       SET status = 'done', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [session.id],
    );

    return { ...done, results };

  } catch (err) {
    // Mark session as errored
    await query(
      `UPDATE benchmark_sessions SET status = 'error', error_message = $1, updated_at = NOW() WHERE id = $2`,
      [err.message, session.id],
    );
    throw err;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a single session with all its results.
 */
const getSession = async (sessionId) => {
  const { rows: [session] } = await query(
    `SELECT * FROM benchmark_sessions WHERE id = $1 LIMIT 1`,
    [sessionId],
  );
  if (!session) return null;

  const { rows: results } = await query(
    `SELECT * FROM benchmark_results WHERE session_id = $1 ORDER BY fit_score DESC`,
    [sessionId],
  );

  return { ...session, results };
};

/**
 * List recent sessions for a user (newest first).
 */
const listSessions = async (userId, limit = 20) => {
  const { rows } = await query(
    `SELECT id, status, job_roles, candidate_ids, error_message, created_at, updated_at
     FROM   benchmark_sessions
     WHERE  created_by = $1
     ORDER  BY created_at DESC
     LIMIT  $2`,
    [userId, limit],
  );
  return rows;
};

/**
 * Get all students who have an analysed primary resume — for the "pick candidates" UI.
 */
const getAvailableCandidates = async () => {
  const { rows } = await query(
    `SELECT s.id, s.name, s.email,
            r.ats_score, r.id AS resume_id,
            r.overall_analysis->>'overall_score' AS overall_score,
            r.overall_analysis->>'letter_grade'  AS grade
     FROM   students s
     JOIN   resumes  r ON r.student_id = s.id AND r.is_primary = TRUE AND r.status = 'done'
     ORDER  BY s.name`,
  );
  return rows;
};

module.exports = { createSession, getSession, listSessions, getAvailableCandidates };
