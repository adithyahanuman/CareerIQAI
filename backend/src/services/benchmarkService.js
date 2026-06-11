/**
 * services/benchmarkService.js  (v2)
 *
 * Personal Role-Fit Benchmarking:
 *   getMyRoleFit(studentId)   – auto-detects course, scores all matching roles,
 *                               caches result in DB, returns sorted by fit_score.
 *   refreshMyRoleFit(sid)     – force a fresh run (deletes cached session first).
 *   getLatestSession(sid)     – load most recent done session for a student.
 *
 * Multi-candidate session API (kept for admin use):
 *   createSession / getSession / listSessions / getAvailableCandidates
 */

'use strict';

const { query }                           = require('../config/db');
const aiService                           = require('../ai/aiService');
const { benchmarkCandidates }             = require('../ai/benchmarkPrompt');
const { getRolesForCourse, detectCourseTier } = require('../ai/rolesList');
const { admin }                           = require('../config/firebase');

// ─────────────────────────────────────────────────────────────────────────────
// PERSONAL ROLE-FIT  (the main feature)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get (or generate) the role-fit benchmark for the current user.
 * Returns cached results if a 'done' session exists for this student.
 *
 * @param {string} studentId
 * @param {boolean} [force=false]  – skip cache, always re-run AI
 */
const getMyRoleFit = async (studentId, force = false) => {
  // ── 1. Check cache ─────────────────────────────────────────────────────────
  if (!force) {
    const cached = await _getLatestDoneSession(studentId);
    if (cached) return cached;
  }

  // ── 2. Fetch student + primary resume ──────────────────────────────────────
  const { rows: [studentRow] } = await query(
    `SELECT s.id, s.full_name, s.course, s.branch, s.firebase_uid,
            r.id          AS resume_id,
            r.skills_analysis,
            r.projects_analysis,
            r.experience_analysis,
            r.education_analysis,
            r.certifications_analysis,
            r.extracurriculars_analysis,
            r.overall_analysis,
            r.confidence_analysis,
            r.action_plan_analysis
     FROM   students s
     JOIN   resumes  r ON r.student_id = s.id
                      AND r.is_primary  = TRUE
                      AND r.status      = 'done'
     WHERE  s.id = $1
     LIMIT  1`,
    [studentId],
  );

  if (!studentRow) {
    const err = new Error('No analysed resume found. Please upload and analyse your resume first.');
    err.statusCode = 422;
    throw err;
  }

  // ── 3. Detect course ─────────────────────────────────────────────────────────────
  const eduText  = _extractDegreeText(studentRow);
  const tier     = detectCourseTier(eduText);
  const jobRoles = getRolesForCourse(eduText);

  // ── 3b. Fetch raw resume text from Firestore ───────────────────────────────────────
  // Firestore stores the PDF-extracted text at: user_profiles/{firebase_uid}.resumeText
  let rawText = '';
  try {
    const uid = studentRow.firebase_uid;
    if (uid) {
      const snap = await admin.firestore()
        .collection('user_profiles')
        .doc(uid)
        .get();
      rawText = snap.exists ? (snap.data().resumeText || '') : '';
      if (rawText) console.log(`[benchmark] Loaded raw_text from Firestore for uid=${uid} (${rawText.length} chars)`);
      else         console.warn(`[benchmark] No resumeText in Firestore for uid=${uid}`);
    }
  } catch (fsErr) {
    console.warn('[benchmark] Firestore raw_text fetch failed:', fsErr.message);
  }

  // ── 4. Build the resume payload for the AI ─────────────────────────────────
  // raw_text = from Firestore (primary source)
  // analysis = structured 13-section JSON from PostgreSQL (supporting signal)
  const resumePayload = [{
    id:       studentRow.id,
    name:     studentRow.full_name,
    raw_text: rawText,
    analysis: {
      skills:              studentRow.skills_analysis           ?? {},
      projects:            studentRow.projects_analysis         ?? {},
      experience:          studentRow.experience_analysis       ?? {},
      education:           studentRow.education_analysis        ?? {},
      certifications:      studentRow.certifications_analysis   ?? {},
      extracurriculars:    studentRow.extracurriculars_analysis ?? {},
      overall:             studentRow.overall_analysis          ?? {},
      analysis_confidence: studentRow.confidence_analysis       ?? {},
      action_plan:         studentRow.action_plan_analysis      ?? {},
    },
  }];

  // ── 5. Create session row ──────────────────────────────────────────────────
  // Delete any old 'error' sessions for cleanliness
  await query(
    `DELETE FROM benchmark_sessions WHERE created_by = $1 AND status = 'error'`,
    [studentId],
  );

  const { rows: [session] } = await query(
    `INSERT INTO benchmark_sessions (created_by, job_roles, candidate_ids, status)
     VALUES ($1, $2, $3, 'running') RETURNING *`,
    [studentId, JSON.stringify(jobRoles), JSON.stringify([studentId])],
  );

  try {
    // ── 6. Call AI ────────────────────────────────────────────────────────────
    const prompt  = benchmarkCandidates(resumePayload, jobRoles);
    const aiResp  = await aiService.benchmarkResumes(prompt);
    const results = Array.isArray(aiResp.data) ? aiResp.data : [];

    if (!results.length) throw new Error('AI returned an empty response.');

    // ── 7. Persist results ────────────────────────────────────────────────────
    for (const r of results) {
      await query(
        `INSERT INTO benchmark_results
           (session_id, student_id, student_name, role_name, fit_score, grade, major_strength, improvement_suggestion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          session.id,
          studentId,
          studentRow.full_name,
          r.role_name    || '',
          Math.min(100, Math.max(0, Math.round(Number(r.fit_score) || 0))),
          r.grade        || 'F',
          r.major_strength             || null,
          r.improvement_suggestion     || null,
        ],
      );
    }

    // ── 8. Mark done ──────────────────────────────────────────────────────────
    const { rows: [done] } = await query(
      `UPDATE benchmark_sessions SET status='done', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [session.id],
    );

    // Sort by fit_score DESC
    results.sort((a, b) => b.fit_score - a.fit_score);
    return { ...done, course_tier: tier, results };

  } catch (err) {
    await query(
      `UPDATE benchmark_sessions SET status='error', error_message=$1, updated_at=NOW() WHERE id=$2`,
      [err.message, session.id],
    );
    throw err;
  }
};

/**
 * Force a fresh AI run (bypass cache).
 */
const refreshMyRoleFit = (studentId) => getMyRoleFit(studentId, true);

/**
 * Retrieve the most recent completed session for a student.
 * @returns {object|null}
 */
const getLatestSession = async (studentId) => _getLatestDoneSession(studentId);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function _getLatestDoneSession(studentId) {
  const { rows: [session] } = await query(
    `SELECT * FROM benchmark_sessions
     WHERE  created_by = $1 AND status = 'done'
     ORDER  BY created_at DESC
     LIMIT  1`,
    [studentId],
  );
  if (!session) return null;

  const { rows: results } = await query(
    `SELECT * FROM benchmark_results WHERE session_id = $1 ORDER BY fit_score DESC`,
    [session.id],
  );

  // Detect tier from stored job_roles (first role as heuristic)
  const roles = Array.isArray(session.job_roles) ? session.job_roles : JSON.parse(session.job_roles || '[]');
  return { ...session, results };
}

/**
 * Extract a plain degree/course string from the student row.
 * Priority: student.course → student.branch → education_analysis JSON fields
 */
function _extractDegreeText(row) {
  if (row.course) return row.course;
  if (row.branch) return row.branch;

  // Try education_analysis JSONB
  try {
    const edu = row.education_analysis;
    if (edu) {
      const d = edu.degree || edu.degrees?.[0]?.degree || edu.institution?.degree || '';
      if (d) return d;
    }
  } catch (_) {}

  return 'B.Tech'; // safe default
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY multi-candidate (kept for admin future use)
// ─────────────────────────────────────────────────────────────────────────────

const createSession = async ({ createdBy, candidateIds, jobRoles }) => {
  if (!candidateIds?.length)    throw Object.assign(new Error('candidateIds required.'), { statusCode: 422 });
  if (!jobRoles?.length)        throw Object.assign(new Error('jobRoles required.'), { statusCode: 422 });

  const { rows: [session] } = await query(
    `INSERT INTO benchmark_sessions (created_by, job_roles, candidate_ids, status)
     VALUES ($1, $2, $3, 'running') RETURNING *`,
    [createdBy, JSON.stringify(jobRoles), JSON.stringify(candidateIds)],
  );

  try {
    const resumeRows = await Promise.all(
      candidateIds.map(sid =>
        query(
          `SELECT r.id, s.full_name AS name,
                  r.skills_analysis, r.projects_analysis, r.experience_analysis,
                  r.education_analysis, r.certifications_analysis, r.overall_analysis,
                  r.confidence_analysis, r.action_plan_analysis
           FROM   resumes r JOIN students s ON s.id = r.student_id
           WHERE  r.student_id = $1 AND r.is_primary = TRUE LIMIT 1`,
          [sid],
        ).then(res => res.rows[0] ?? null),
      ),
    );

    const validResumes = resumeRows.filter(Boolean).map(r => ({
      id: r.id, name: r.name,
      raw_text: '', // raw text not fetched for legacy multi-candidate admin endpoint
      analysis: {
        skills: r.skills_analysis ?? {}, projects: r.projects_analysis ?? {},
        experience: r.experience_analysis ?? {}, education: r.education_analysis ?? {},
        certifications: r.certifications_analysis ?? {}, overall: r.overall_analysis ?? {},
        analysis_confidence: r.confidence_analysis ?? {}, action_plan: r.action_plan_analysis ?? {},
      },
    }));

    if (!validResumes.length) throw Object.assign(new Error('No candidates have analysed resumes.'), { statusCode: 422 });

    const aiResp  = await aiService.benchmarkResumes(benchmarkCandidates(validResumes, jobRoles));
    const results = Array.isArray(aiResp.data) ? aiResp.data : [];
    if (!results.length) throw new Error('AI returned empty response.');

    for (const r of results) {
      await query(
        `INSERT INTO benchmark_results (session_id,student_id,student_name,role_name,fit_score,grade,major_strength,improvement_suggestion)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [session.id, r.student_id||null, r.student_name||'Unknown', r.role_name||'',
         Math.min(100,Math.max(0,Math.round(Number(r.fit_score)||0))), r.grade||'F',
         r.major_strength||null, r.improvement_suggestion||null],
      );
    }

    const { rows: [done] } = await query(
      `UPDATE benchmark_sessions SET status='done', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [session.id],
    );
    return { ...done, results };
  } catch (err) {
    await query(`UPDATE benchmark_sessions SET status='error', error_message=$1 WHERE id=$2`, [err.message, session.id]);
    throw err;
  }
};

const getSession = async (sessionId) => {
  const { rows: [s] } = await query(`SELECT * FROM benchmark_sessions WHERE id=$1`, [sessionId]);
  if (!s) return null;
  const { rows: results } = await query(`SELECT * FROM benchmark_results WHERE session_id=$1 ORDER BY fit_score DESC`, [sessionId]);
  return { ...s, results };
};

const listSessions = async (userId, limit = 20) => {
  const { rows } = await query(
    `SELECT id,status,job_roles,candidate_ids,error_message,created_at,updated_at
     FROM benchmark_sessions WHERE created_by=$1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit],
  );
  return rows;
};

const getAvailableCandidates = async () => {
  const { rows } = await query(
    `SELECT s.id, s.full_name AS name, s.email,
            r.ats_score, r.id AS resume_id,
            r.overall_analysis->>'overall_score' AS overall_score,
            r.overall_analysis->>'letter_grade'  AS grade
     FROM   students s
     JOIN   resumes  r ON r.student_id=s.id AND r.is_primary=TRUE AND r.status='done'
     ORDER  BY s.full_name`,
  );
  return rows;
};

module.exports = {
  getMyRoleFit, refreshMyRoleFit, getLatestSession,
  createSession, getSession, listSessions, getAvailableCandidates,
};
