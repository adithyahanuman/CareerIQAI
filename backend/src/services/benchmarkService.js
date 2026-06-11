/**
 * services/benchmarkService.js  (v3)
 *
 * Smart cache flow — runs in this exact order every time (both on load and on refresh):
 *
 *   1. Fetch current resume raw text from Firestore → compute SHA-256 hash
 *   2. Look for a 'done' session whose resume_text_hash = current hash
 *        → MATCH: resume unchanged → return DB data immediately (no AI)
 *   3. Look for any 'done' session (different hash = old resume)
 *        → Found: show existing DB data (still informative)
 *        → Not found: no data at all → run AI, save hash, return fresh data
 *
 * Refresh button follows the SAME order — AI is only called when there is
 * truly no done session in the database.
 *
 * Multi-candidate session API (kept for admin use) is unchanged at the bottom.
 */

'use strict';

const crypto                               = require('crypto');
const { query }                            = require('../config/db');
const aiService                            = require('../ai/aiService');
const { benchmarkCandidates }              = require('../ai/benchmarkPrompt');
const { getRolesForCourse, detectCourseTier } = require('../ai/rolesList');
const { admin }                            = require('../config/firebase');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** SHA-256 hex of a string (empty string → all-zeros hash). */
function sha256(text) {
  return crypto.createHash('sha256').update(text || '').digest('hex');
}

/**
 * Fetch raw resume text from Firestore for the given firebase_uid.
 * Returns '' on any error.
 */
async function _fetchRawText(firebaseUid) {
  if (!firebaseUid) return '';
  try {
    const snap = await admin.firestore()
      .collection('user_profiles')
      .doc(firebaseUid)
      .get();
    return snap.exists ? (snap.data().resumeText || '') : '';
  } catch (e) {
    console.warn('[benchmark] Firestore fetch failed:', e.message);
    return '';
  }
}

/**
 * Load the most-recent done session for a student.
 * Optionally filter by resume_text_hash.
 *
 * @param {string}      studentId
 * @param {string|null} [hash]   – if provided, only return sessions with this hash
 * @returns {object|null}
 */
async function _getLatestDoneSession(studentId, hash = null) {
  let sql = `SELECT * FROM benchmark_sessions
             WHERE  created_by = $1 AND status = 'done'`;
  const params = [studentId];

  if (hash !== null) {
    sql += ` AND resume_text_hash = $2`;
    params.push(hash);
  }

  sql += ` ORDER BY created_at DESC LIMIT 1`;

  const { rows: [session] } = await query(sql, params);
  if (!session) return null;

  const { rows: results } = await query(
    `SELECT * FROM benchmark_results WHERE session_id = $1 ORDER BY fit_score DESC`,
    [session.id],
  );

  return { ...session, results };
}

/**
 * Extract a plain degree/course string from the student row.
 */
function _extractDegreeText(row) {
  if (row.course) return row.course;
  if (row.branch) return row.branch;
  try {
    const edu = row.education_analysis;
    if (edu) {
      const d = edu.degree || edu.degrees?.[0]?.degree || edu.institution?.degree || '';
      if (d) return d;
    }
  } catch (_) {}
  return 'B.Tech';
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONAL ROLE-FIT  (the main feature)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Smart benchmark retrieval.
 *
 * Follows this order every time (load or refresh):
 *   1. Fetch current Firestore raw text → compute hash
 *   2. Done session with SAME hash → return it (resume unchanged, no AI)
 *   3. Done session with ANY hash  → return it (old resume, still useful)
 *   4. Nothing in DB              → run AI, store hash, return fresh data
 *
 * @param {string}  studentId
 */
const getMyRoleFit = async (studentId) => {
  // ── Step 1: fetch student + primary resume from DB ─────────────────────────
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

  // ── Step 2: get current resume text + hash ─────────────────────────────────
  const rawText    = await _fetchRawText(studentRow.firebase_uid);
  const currentHash = sha256(rawText);
  console.log(`[benchmark] resume hash for uid=${studentRow.firebase_uid}: ${currentHash.slice(0, 12)}…`);

  // ── Step 3: done session with SAME hash → return immediately (no AI) ───────
  const exactMatch = await _getLatestDoneSession(studentId, currentHash);
  if (exactMatch) {
    console.log('[benchmark] Cache HIT (hash match) — returning DB data');
    return { ...exactMatch, status: 'done', cache: 'hash_match' };
  }

  // ── Step 4: done session with ANY hash → return it (different resume) ──────
  const anyDone = await _getLatestDoneSession(studentId, null);
  if (anyDone) {
    console.log('[benchmark] Cache HIT (old resume) — returning existing DB data');
    return { ...anyDone, status: 'done', cache: 'old_resume' };
  }

  // ── Step 5: in-progress session? tell caller to poll ──────────────────────
  const { rows: [running] } = await query(
    `SELECT id FROM benchmark_sessions
     WHERE  created_by = $1 AND status = 'running'
     ORDER  BY created_at DESC LIMIT 1`,
    [studentId],
  );
  if (running) {
    return { status: 'running', session_id: running.id, results: [] };
  }

  // ── Step 6: nothing at all → run AI ───────────────────────────────────────
  return _runAI(studentId, studentRow, rawText, currentHash);
};

/**
 * Refresh endpoint — follows EXACTLY the same smart order as getMyRoleFit.
 * AI is only triggered when there is NO done session in the DB at all.
 */
const refreshMyRoleFit = (studentId) => getMyRoleFit(studentId);

/**
 * Lightweight status check — never triggers AI.
 */
const getMyStatus = async (studentId) => {
  const done = await _getLatestDoneSession(studentId, null);
  if (done) return { status: 'done', ...done };

  const { rows: [running] } = await query(
    `SELECT id FROM benchmark_sessions
     WHERE  created_by = $1 AND status = 'running'
     ORDER  BY created_at DESC LIMIT 1`,
    [studentId],
  );
  if (running) return { status: 'running', session_id: running.id, results: [] };

  return { status: 'none', results: [] };
};

/** Load most-recent completed session (public helper). */
const getLatestSession = (studentId) => _getLatestDoneSession(studentId, null);

// ─────────────────────────────────────────────────────────────────────────────
// AI EXECUTION  (private — only called when DB has no done session)
// ─────────────────────────────────────────────────────────────────────────────

async function _runAI(studentId, studentRow, rawText, resumeHash) {
  const eduText  = _extractDegreeText(studentRow);
  const tier     = detectCourseTier(eduText);
  const jobRoles = getRolesForCourse(eduText);

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

  // Delete stale error sessions
  await query(
    `DELETE FROM benchmark_sessions WHERE created_by = $1 AND status = 'error'`,
    [studentId],
  );

  // Create running session — store hash for future comparisons
  const { rows: [session] } = await query(
    `INSERT INTO benchmark_sessions (created_by, job_roles, candidate_ids, status, resume_text_hash)
     VALUES ($1, $2, $3, 'running', $4) RETURNING *`,
    [studentId, JSON.stringify(jobRoles), JSON.stringify([studentId]), resumeHash],
  );

  try {
    console.log(`[benchmark] Running AI for studentId=${studentId}`);
    const prompt  = benchmarkCandidates(resumePayload, jobRoles);
    const aiResp  = await aiService.benchmarkResumes(prompt);
    const results = Array.isArray(aiResp.data) ? aiResp.data : [];

    if (!results.length) throw new Error('AI returned an empty response.');

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
          r.major_strength         || null,
          r.improvement_suggestion || null,
        ],
      );
    }

    const { rows: [done] } = await query(
      `UPDATE benchmark_sessions SET status='done', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [session.id],
    );

    results.sort((a, b) => b.fit_score - a.fit_score);
    return { ...done, course_tier: tier, results, cache: 'fresh' };

  } catch (err) {
    await query(
      `UPDATE benchmark_sessions SET status='error', error_message=$1, updated_at=NOW() WHERE id=$2`,
      [err.message, session.id],
    );
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY multi-candidate (kept for admin use)
// ─────────────────────────────────────────────────────────────────────────────

const createSession = async ({ createdBy, candidateIds, jobRoles }) => {
  if (!candidateIds?.length)  throw Object.assign(new Error('candidateIds required.'), { statusCode: 422 });
  if (!jobRoles?.length)      throw Object.assign(new Error('jobRoles required.'),     { statusCode: 422 });

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
      raw_text: '',
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
  getMyRoleFit, getMyStatus, refreshMyRoleFit, getLatestSession,
  createSession, getSession, listSessions, getAvailableCandidates,
};
