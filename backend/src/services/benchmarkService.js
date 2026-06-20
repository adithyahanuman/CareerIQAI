/**
 * services/benchmarkService.js  (v4 — role-table edition)
 *
 * Key changes vs v3:
 *  - AI results are written to BOTH benchmark_results (backward compat) AND
 *    the dedicated role table (e.g. role_business_analyst).
 *  - UNIQUE(student_id) on each role table means the latest session always wins
 *    (INSERT … ON CONFLICT DO UPDATE).
 *  - Role ranking is GLOBAL across all tiers — a student's rank in
 *    `role_business_analyst` is their position among EVERY student who has ever
 *    been benchmarked for that role, regardless of course.
 *  - Overall rank is BRANCH-SCOPED — ranked against students in the same branch
 *    using the primary resume's overall_score.
 *
 * Smart cache flow (unchanged from v3):
 *   1. Fetch Firestore raw text → SHA-256 hash
 *   2. Done session with SAME hash + SAME roles → return DB data (no AI)
 *   3. Nothing → run AI, store hash, return fresh data
 */

'use strict';

const crypto                               = require('crypto');
const { query }                            = require('../config/db');
const aiService                            = require('../ai/aiService');
const { benchmarkCandidates }              = require('../ai/benchmarkPrompt');
const { getRolesForCourse, detectCourseTier, getRoleTable } = require('../ai/rolesList');
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
 * Optionally validate against currentJobRoles (invalidates cache if roles changed).
 *
 * Results are enriched with:
 *  - role_rank     : global rank within that role's dedicated table
 *  - total_role_peers : total students benchmarked for that role
 */
async function _getLatestDoneSession(studentId, hash = null, currentJobRoles = null) {
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

  // Cache invalidation: if the required job roles changed, this session is stale
  if (currentJobRoles) {
    const sessionRoles = Array.isArray(session.job_roles)
      ? session.job_roles
      : JSON.parse(session.job_roles || '[]');

    if (JSON.stringify(sessionRoles) !== JSON.stringify(currentJobRoles)) {
      console.log('[benchmark] Cache MISMATCH: Job roles changed. Invalidating cache.');
      return null;
    }
  }

  // Fetch basic results from benchmark_results for this session
  const { rows: results } = await query(
    `SELECT * FROM benchmark_results WHERE session_id = $1 ORDER BY fit_score DESC`,
    [session.id],
  );

  // Role rank — ranked by this resume's exact fit_score, one per resume, all branches.
  // Each benchmark result gets its own rank position based on its own score.
  const enriched = await Promise.all(results.map(async (r) => {
    if (!r.role_name) return { ...r, role_rank: null, total_role_peers: null };

    try {
      const { rows: [rankRow] } = await query(`
        SELECT
          (SELECT COUNT(*) + 1
           FROM   benchmark_results br
           JOIN   benchmark_sessions bs ON bs.id = br.session_id
           WHERE  br.role_name = $1
             AND  bs.status    = 'done'
             AND  br.fit_score > $2)  AS role_rank,
          (SELECT COUNT(*)
           FROM   benchmark_results br
           JOIN   benchmark_sessions bs ON bs.id = br.session_id
           WHERE  br.role_name = $1
             AND  bs.status    = 'done') AS total_role_peers
      `, [r.role_name, r.fit_score]);

      return {
        ...r,
        role_rank:        rankRow ? Number(rankRow.role_rank)        : null,
        total_role_peers: rankRow ? Number(rankRow.total_role_peers) : null,
      };
    } catch (err) {
      console.warn(`[benchmark] role rank query failed for "${r.role_name}":`, err.message);
      return { ...r, role_rank: null, total_role_peers: null };
    }
  }));

  return { ...session, results: enriched };
}


/**
 * Overall rank — branch-scoped, one entry per resume in the peer pool.
 * Student's rank position is based on their PRIMARY resume score.
 * total_peers = total count of all analyzed resumes in the branch.
 */
async function _getStudentMetrics(studentId) {
  const sql = `
    WITH my_branch AS (
      SELECT branch FROM students WHERE id = $1
    ),
    all_resumes AS (
      -- Every analyzed resume in the branch (one per resume, not per student)
      SELECT
        r.id         AS resume_id,
        r.student_id,
        COALESCE(CAST(r.overall_analysis->>'overall_score' AS numeric), 0) AS score
      FROM resumes r
      JOIN students s ON s.id = r.student_id
      WHERE r.status = 'done'
        AND s.branch IS NOT DISTINCT FROM (SELECT branch FROM my_branch)
    ),
    my_primary AS (
      -- This student's primary resume score
      SELECT
        COALESCE(CAST(r.overall_analysis->>'overall_score' AS numeric), 0) AS score
      FROM resumes r
      WHERE r.student_id = $1
        AND r.is_primary  = TRUE
        AND r.status      = 'done'
      LIMIT 1
    )
    SELECT
      (SELECT COUNT(*)     FROM all_resumes)                                  AS total_peers,
      (SELECT MAX(score)   FROM all_resumes)                                  AS top_score,
      (SELECT score        FROM my_primary)                                   AS my_score,
      (SELECT COUNT(*) + 1 FROM all_resumes
       WHERE  score > (SELECT score FROM my_primary))                         AS my_rank
  `;
  try {
    const { rows } = await query(sql, [studentId]);
    if (!rows || !rows.length) return null;
    const row = rows[0];

    const totalPeers = Number(row.total_peers) || 0;
    const topScore   = Number(row.top_score)   || 0;
    const myScore    = Number(row.my_score)    || 0;
    const myRank     = Number(row.my_rank)     || 0;

    const gap        = topScore - myScore;
    const percentile = totalPeers > 1
      ? Math.round(((totalPeers - myRank) / (totalPeers - 1)) * 100)
      : 100;

    return {
      total_peers: totalPeers,
      top_score:   topScore,
      my_score:    myScore,
      my_rank:     myRank,
      top_gap:     gap > 0 ? gap : 0,
      percentile:  Math.max(0, percentile),
    };
  } catch (e) {
    console.warn('[benchmark] Error calculating student metrics:', e.message);
    return null;
  }
}



/**
 * Extract a plain degree/course string.
 * Priority: 1. Resume's education_analysis, 2. Profile course, 3. Profile branch
 */
function _extractDegreeText(row) {
  try {
    const edu = row.education_analysis;
    if (edu) {
      const d = edu.education_entries?.[0]?.degree ||
                edu.degree ||
                edu.degrees?.[0]?.degree ||
                edu.institution?.degree;
      if (d) return d;
    }
  } catch (_) {}

  if (row.course)  return row.course;
  if (row.branch)  return row.branch;
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
 *   2. Detect course and target roles
 *   3. Done session with SAME hash AND SAME roles → return it (no AI)
 *   4. Nothing in DB matching both → run AI, store hash, return fresh data
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
            r.action_plan_analysis,
            r.resume_text_hash,
            r.raw_text
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
  const rawText     = studentRow.raw_text || '';
  const currentHash = studentRow.resume_text_hash || sha256(rawText);

  // ── Step 3: detect current roles expected for this student ─────────────────
  const eduText       = _extractDegreeText(studentRow);
  const tier          = detectCourseTier(eduText);
  const currentJobRoles = getRolesForCourse(eduText);
  console.log(`[benchmark] uid=${studentRow.firebase_uid} tier=${tier} hash=${currentHash.slice(0, 12)}…`);

  // ── Step 4: done session with SAME hash AND SAME roles → return immediately ──
  const exactMatch = await _getLatestDoneSession(studentId, currentHash, currentJobRoles);
  if (exactMatch) {
    console.log('[benchmark] Cache HIT (hash match) — returning DB data');
    const metrics = await _getStudentMetrics(studentId);
    return { ...exactMatch, status: 'done', cache: 'hash_match', metrics };
  }

  // ── Step 5: in-progress session? tell caller to poll ──────────────────────
  const { rows: [running] } = await query(
    `SELECT id FROM benchmark_sessions
     WHERE  created_by = $1
       AND status = 'running'
       AND created_at > NOW() - INTERVAL '5 minutes'
     ORDER  BY created_at DESC LIMIT 1`,
    [studentId],
  );
  if (running) {
    return { status: 'running', session_id: running.id, results: [], metrics: await _getStudentMetrics(studentId) };
  }

  // ── Step 6: nothing at all → run AI ───────────────────────────────────────
  const runResult = await _runAI(studentId, studentRow, rawText, currentHash, currentJobRoles, tier);
  runResult.metrics = await _getStudentMetrics(studentId);
  return runResult;
};

const refreshMyRoleFit = async (studentId) => {
  // Delegate to getMyRoleFit which perfectly handles:
  // 1. Checking the exact hash of the *current* resume.
  // 2. Returning the live SQL ranks instantly without AI if it's already analyzed.
  // 3. Not cancelling any actively running sessions.
  return getMyRoleFit(studentId);
};

const getMyStatus = async (studentId) => {
  const metrics = await _getStudentMetrics(studentId);

  const { rows: [running] } = await query(
    `SELECT id FROM benchmark_sessions
     WHERE  created_by = $1
       AND status = 'running'
       AND created_at > NOW() - INTERVAL '5 minutes'
     ORDER  BY created_at DESC LIMIT 1`,
    [studentId],
  );
  if (running) return { status: 'running', session_id: running.id, results: [], metrics };

  const done = await _getLatestDoneSession(studentId, null);
  if (done) {
    // Also pull course_tier so the frontend can show the correct tier label
    const { rows: [studentRow] } = await query(
      `SELECT s.course, s.branch, r.education_analysis
       FROM students s
       LEFT JOIN resumes r ON r.student_id = s.id AND r.is_primary = TRUE AND r.status = 'done'
       WHERE s.id = $1 LIMIT 1`,
      [studentId],
    );
    const eduText  = studentRow ? _extractDegreeText(studentRow) : 'B.Tech';
    const tier     = detectCourseTier(eduText);
    return { status: 'done', ...done, course_tier: tier, metrics };
  }

  return { status: 'none', results: [], metrics };
};

/** Load most-recent completed session (public helper). */
const getLatestSession = (studentId) => _getLatestDoneSession(studentId, null);

// ─────────────────────────────────────────────────────────────────────────────
// AI EXECUTION  (private — only called when DB has no done session)
// ─────────────────────────────────────────────────────────────────────────────

async function _runAI(studentId, studentRow, rawText, resumeHash, jobRoles, tier) {
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
    
    // Check if the session was cancelled or deleted while the AI was processing
    const { rows: [checkSession] } = await query(
      `SELECT status FROM benchmark_sessions WHERE id = $1`,
      [session.id]
    );
    if (!checkSession || checkSession.status !== 'running') {
      console.log(`[benchmark] Auto-refresh skipped: Session ${session.id} was cancelled or deleted during AI processing.`);
      throw new Error('Cancelled by user');
    }

    const results = Array.isArray(aiResp.data) ? aiResp.data : [];

    if (!results.length) throw new Error('AI returned an empty response.');

    for (const r of results) {
      const detailedAnalysis = {
        role_description:           r.role_description          || '',
        readiness_score:            r.readiness_score           || 0,
        growth_potential:           r.growth_potential          || '',
        required_skills:            Array.isArray(r.required_skills)            ? r.required_skills            : [],
        missing_competencies:       Array.isArray(r.missing_competencies)       ? r.missing_competencies       : [],
        common_projects:            Array.isArray(r.common_projects)            ? r.common_projects            : [],
        recommended_certifications: Array.isArray(r.recommended_certifications) ? r.recommended_certifications : [],
      };

      r.detailed_analysis = detailedAnalysis;

      const fitScore  = Math.min(100, Math.max(0, Math.round(Number(r.fit_score) || 0)));
      const grade     = r.grade        || 'F';
      const strength  = r.major_strength         || null;
      const suggest   = r.improvement_suggestion || null;
      const roleName  = r.role_name || '';

      // ── 1. Write to benchmark_results (backward compat) ───────────────────
      await query(
        `INSERT INTO benchmark_results
           (session_id, student_id, student_name, role_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [session.id, studentId, studentRow.full_name, roleName, fitScore, grade, strength, suggest, JSON.stringify(detailedAnalysis)],
      );

      // ── 2. Upsert into dedicated role table (global ranking) ───────────────
      const roleTable = getRoleTable(roleName);
      if (roleTable) {
        try {
          await query(
            `INSERT INTO ${roleTable}
               (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, detailed_analysis, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             ON CONFLICT (student_id) DO UPDATE SET
               session_id             = EXCLUDED.session_id,
               student_name           = EXCLUDED.student_name,
               fit_score              = EXCLUDED.fit_score,
               grade                  = EXCLUDED.grade,
               major_strength         = EXCLUDED.major_strength,
               improvement_suggestion = EXCLUDED.improvement_suggestion,
               detailed_analysis      = EXCLUDED.detailed_analysis,
               updated_at             = NOW()`,
            [session.id, studentId, studentRow.full_name, fitScore, grade, strength, suggest, JSON.stringify(detailedAnalysis)],
          );
        } catch (roleErr) {
          console.error(`[benchmark] ❌ Role table upsert FAILED for "${roleName}" → ${roleTable}: ${roleErr.message}`);
        }
      } else {
        console.warn(`[benchmark] No role table mapped for role: "${roleName}"`);
      }

      // ── 3. Insert into legacy rankings table ──────────────────────────────────
      try {
        const resumeAnalysisScore = Number(studentRow.overall_analysis?.overall_score) || 0;
        await query(
          `INSERT INTO rankings
             (student_id, student_name, overall_score, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (student_id) DO UPDATE SET
             student_name  = EXCLUDED.student_name,
             overall_score = EXCLUDED.overall_score,
             updated_at    = NOW()`,
          [studentId, studentRow.full_name || 'Unknown', resumeAnalysisScore]
        );
      } catch (rankingErr) {
        console.error(`[benchmark] ❌ Legacy rankings table upsert FAILED: ${rankingErr.message}`);
      }

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
// LEADERBOARD  — global top-N students for a specific role
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the global leaderboard for a given role.
 * Ranking is done across ALL tiers on fit_score DESC.
 *
 * @param {string} roleName   – display name, e.g. "Business Analyst"
 * @param {number} [limit=50] – max rows to return
 * @returns {{ role_name, table_name, total, leaderboard: Array }}
 */
const getRoleLeaderboard = async (roleName, limit = 50) => {
  const table = getRoleTable(roleName);
  if (!table) {
    const err = new Error(`Unknown role: "${roleName}". No dedicated table exists.`);
    err.statusCode = 404;
    throw err;
  }

  const { rows } = await query(`
    SELECT
      rt.student_id,
      rt.student_name,
      rt.fit_score,
      rt.grade,
      rt.major_strength,
      rt.improvement_suggestion,
      rt.updated_at,
      s.branch,
      s.course,
      rt.resume_id,
      RANK()  OVER (ORDER BY rt.fit_score DESC) AS role_rank,
      COUNT(*) OVER ()                           AS total_peers
    FROM ${table} rt
    JOIN students s ON s.id = rt.student_id
    ORDER BY rt.fit_score DESC
    LIMIT $1
  `, [limit]);

  return {
    role_name:  roleName,
    table_name: table,
    total:      rows.length ? Number(rows[0].total_peers) : 0,
    leaderboard: rows.map(r => ({
      rank:                   Number(r.role_rank),
      student_id:             r.student_id,
      student_name:           r.student_name,
      fit_score:              r.fit_score,
      grade:                  r.grade,
      major_strength:         r.major_strength,
      improvement_suggestion: r.improvement_suggestion,
      branch:                 r.branch,
      course:                 r.course,
      resume_id:              r.resume_id,
      updated_at:             r.updated_at,
    })),
  };
};

/**
 * Fetch a student's rank in every role they've been benchmarked for.
 * Returns one row per role, sorted by fit_score DESC.
 *
 * @param {string} studentId
 */
const getMyRoleRanks = async (studentId) => {
  const { ROLE_TABLE_MAP } = require('../ai/rolesList');

  const rankPromises = Object.entries(ROLE_TABLE_MAP).map(async ([roleName, table]) => {
    try {
      // Subquery: compute ranks over the full table, then filter for this student.
      // (WHERE before the window fn would collapse the window to 1 row → rank always 1)
      const { rows: [row] } = await query(`
        SELECT fit_score, grade, role_rank, total_peers
        FROM (
          SELECT
            student_id,
            fit_score,
            grade,
            RANK()   OVER (ORDER BY fit_score DESC) AS role_rank,
            COUNT(*) OVER ()                         AS total_peers
          FROM ${table}
        ) ranked
        WHERE student_id = $1
        ORDER BY fit_score DESC
        LIMIT 1
      `, [studentId]);

      if (!row) return null;
      return {
        role_name:    roleName,
        fit_score:    row.fit_score,
        grade:        row.grade,
        role_rank:    Number(row.role_rank),
        total_peers:  Number(row.total_peers),
      };
    } catch (_) {
      return null;
    }
  });

  const results = (await Promise.all(rankPromises)).filter(Boolean);
  results.sort((a, b) => b.fit_score - a.fit_score);
  return results;
};

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

      const roleTable = getRoleTable(r.role_name || '');
      if (roleTable && r.student_id) {
        const fitScore = Math.min(100, Math.max(0, Math.round(Number(r.fit_score) || 0)));
        await query(
          `INSERT INTO ${roleTable}
             (session_id, student_id, student_name, fit_score, grade, major_strength, improvement_suggestion, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
           ON CONFLICT (student_id) DO UPDATE SET
             session_id = EXCLUDED.session_id, student_name = EXCLUDED.student_name,
             fit_score = EXCLUDED.fit_score, grade = EXCLUDED.grade,
             major_strength = EXCLUDED.major_strength,
             improvement_suggestion = EXCLUDED.improvement_suggestion,
             updated_at = NOW()`,
          [session.id, r.student_id, r.student_name||'Unknown', fitScore, r.grade||'F',
           r.major_strength||null, r.improvement_suggestion||null],
        );
      }
      
      // Also insert into legacy rankings table
      if (r.student_id) {
        // Find matching resume to get overall_analysis score
        const match = validResumes.find(v => String(v.id) === String(r.student_id));
        const resumeAnalysisScore = Number(match?.analysis?.overall?.overall_score) || 0;

        try {
          await query(
            `INSERT INTO rankings
               (student_id, student_name, overall_score, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (student_id) DO UPDATE SET
               student_name  = EXCLUDED.student_name,
               overall_score = EXCLUDED.overall_score,
               updated_at    = NOW()`,
            [r.student_id, r.student_name || match?.name || 'Unknown', resumeAnalysisScore]
          );
        } catch (rankingErr) {
          console.error(`[benchmark] ❌ Legacy rankings table upsert FAILED: ${rankingErr.message}`);
        }
      }
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
  getRoleLeaderboard, getMyRoleRanks,
  createSession, getSession, listSessions, getAvailableCandidates,
};
