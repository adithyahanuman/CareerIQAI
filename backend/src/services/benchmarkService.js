/**
 * services/benchmarkService.js
 *
 * Benchmark business logic – Firestore implementation.
 */

'use strict';

const crypto = require('crypto');
const { db } = require('../config/firebase');
const aiService = require('../ai/aiService');
const { benchmarkCandidates } = require('../ai/benchmarkPrompt');
const { getRolesForCourse, detectCourseTier, getRoleTable, ROLE_TABLE_MAP } = require('../ai/rolesList');

function sha256(text) {
  return crypto.createHash('sha256').update(text || '').digest('hex');
}

async function _getLatestDoneSession(studentId, hash = null, currentJobRoles = null) {
  let q = db.collection('benchmark_sessions')
    .where('created_by', '==', studentId)
    .where('status', '==', 'done');

  if (hash !== null) {
    q = q.where('resume_text_hash', '==', hash);
  }

  const snapshot = await q.orderBy('created_at', 'desc').limit(1).get();
  if (snapshot.empty) return null;

  const sessionDoc = snapshot.docs[0];
  const session = { id: sessionDoc.id, ...sessionDoc.data() };

  if (currentJobRoles) {
    let sessionRoles = session.job_roles || [];
    if (typeof sessionRoles === 'string') sessionRoles = JSON.parse(sessionRoles);
    if (JSON.stringify(sessionRoles) !== JSON.stringify(currentJobRoles)) {
      return null;
    }
  }

  const resultsSnap = await db.collection('benchmark_results')
    .where('session_id', '==', session.id)
    .get();

  const results = resultsSnap.docs.map(d => d.data());
  results.sort((a, b) => (b.fit_score || 0) - (a.fit_score || 0));

  const enriched = await Promise.all(results.map(async (r) => {
    if (!r.role_name) return { ...r, role_rank: null, total_role_peers: null };

    const roleSnap = await db.collection('role_rankings')
      .where('role_name', '==', r.role_name)
      .get();
      
    let peers = roleSnap.docs.map(d => d.data());
    peers.sort((a, b) => b.fit_score - a.fit_score);
    
    let rank = peers.findIndex(p => p.student_id === studentId) + 1;
    if (rank === 0) rank = null;

    return {
      ...r,
      role_rank: rank,
      total_role_peers: peers.length,
    };
  }));

  return { ...session, results: enriched };
}

async function _getStudentMetrics(studentId) {
  const studentDoc = await db.collection('students').doc(studentId).get();
  if (!studentDoc.exists) return null;
  const branch = studentDoc.data().branch;

  const resumesSnap = await db.collection('resumes')
    .where('status', '==', 'done')
    .where('is_primary', '==', true)
    .get();
    
  let allResumes = [];
  for (const doc of resumesSnap.docs) {
    const data = doc.data();
    // In NoSQL we might need to manually check the student's branch if we don't denormalize
    const sDoc = await db.collection('students').doc(data.student_id).get();
    if (sDoc.exists && sDoc.data().branch === branch) {
      allResumes.push({
        student_id: data.student_id,
        score: Number(data.overall_analysis?.overall_score || 0)
      });
    }
  }

  if (allResumes.length === 0) return null;

  const totalPeers = allResumes.length;
  const topScore = Math.max(...allResumes.map(r => r.score));
  
  const myResume = allResumes.find(r => r.student_id === studentId);
  const myScore = myResume ? myResume.score : 0;
  
  let myRank = allResumes.filter(r => r.score > myScore).length + 1;
  const gap = topScore - myScore;
  const percentile = totalPeers > 1 ? Math.round(((totalPeers - myRank) / (totalPeers - 1)) * 100) : 100;

  return {
    total_peers: totalPeers,
    top_score: topScore,
    my_score: myScore,
    my_rank: myRank,
    top_gap: gap > 0 ? gap : 0,
    percentile: Math.max(0, percentile),
  };
}

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
  return row.course || row.branch || 'B.Tech';
}

const getMyRoleFit = async (studentId) => {
  const studentDoc = await db.collection('students').doc(studentId).get();
  if (!studentDoc.exists) throw new Error('Student not found');
  const studentData = studentDoc.data();

  const resumesSnap = await db.collection('resumes')
    .where('student_id', '==', studentId)
    .where('is_primary', '==', true)
    .where('status', '==', 'done')
    .limit(1)
    .get();

  if (resumesSnap.empty) {
    const err = new Error('No analysed resume found. Please upload and analyse your resume first.');
    err.statusCode = 422;
    throw err;
  }
  
  const resumeData = resumesSnap.docs[0].data();
  const rawText = resumeData.raw_text || '';
  const currentHash = resumeData.resume_text_hash || sha256(rawText);

  const studentRow = { ...studentData, ...resumeData, id: studentId };
  const eduText = _extractDegreeText(studentRow);
  const tier = detectCourseTier(eduText);
  const currentJobRoles = getRolesForCourse(eduText);

  const exactMatch = await _getLatestDoneSession(studentId, currentHash, currentJobRoles);
  if (exactMatch) {
    return { ...exactMatch, status: 'done', cache: 'hash_match', metrics: await _getStudentMetrics(studentId) };
  }

  const runningSnap = await db.collection('benchmark_sessions')
    .where('created_by', '==', studentId)
    .where('status', '==', 'running')
    .orderBy('created_at', 'desc')
    .limit(1)
    .get();

  if (!runningSnap.empty) {
    const running = runningSnap.docs[0];
    const createdTime = running.data().created_at.toDate();
    if (new Date() - createdTime < 5 * 60 * 1000) {
      return { status: 'running', session_id: running.id, results: [], metrics: await _getStudentMetrics(studentId) };
    }
  }

  const runResult = await _runAI(studentId, studentRow, rawText, currentHash, currentJobRoles, tier);
  runResult.metrics = await _getStudentMetrics(studentId);
  return runResult;
};

const refreshMyRoleFit = async (studentId) => getMyRoleFit(studentId);

const getMyStatus = async (studentId) => {
  const metrics = await _getStudentMetrics(studentId);
  const runningSnap = await db.collection('benchmark_sessions')
    .where('created_by', '==', studentId)
    .where('status', '==', 'running')
    .orderBy('created_at', 'desc')
    .limit(1)
    .get();

  if (!runningSnap.empty) {
    const running = runningSnap.docs[0];
    if (new Date() - running.data().created_at.toDate() < 5 * 60 * 1000) {
      return { status: 'running', session_id: running.id, results: [], metrics };
    }
  }

  const done = await _getLatestDoneSession(studentId, null);
  if (done) {
    const sDoc = await db.collection('students').doc(studentId).get();
    const rSnap = await db.collection('resumes').where('student_id', '==', studentId).where('is_primary', '==', true).where('status', '==', 'done').limit(1).get();
    let eduText = 'B.Tech';
    if (sDoc.exists && !rSnap.empty) {
      eduText = _extractDegreeText({ ...sDoc.data(), ...rSnap.docs[0].data() });
    }
    const tier = detectCourseTier(eduText);
    return { status: 'done', ...done, course_tier: tier, metrics };
  }

  return { status: 'none', results: [], metrics };
};

const getLatestSession = (studentId) => _getLatestDoneSession(studentId, null);

async function _runAI(studentId, studentRow, rawText, resumeHash, jobRoles, tier) {
  const resumePayload = [{
    id: studentId,
    name: studentRow.full_name,
    raw_text: rawText,
    analysis: {
      skills: studentRow.skills_analysis || {},
      projects: studentRow.projects_analysis || {},
      experience: studentRow.experience_analysis || {},
      education: studentRow.education_analysis || {},
      certifications: studentRow.certifications_analysis || {},
      extracurriculars: studentRow.extracurriculars_analysis || {},
      overall: studentRow.overall_analysis || {},
      analysis_confidence: studentRow.confidence_analysis || {},
      action_plan: studentRow.action_plan_analysis || {},
    },
  }];

  const errSnap = await db.collection('benchmark_sessions').where('created_by', '==', studentId).where('status', '==', 'error').get();
  const batch = db.batch();
  errSnap.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  const sessionRef = db.collection('benchmark_sessions').doc();
  await sessionRef.set({
    created_by: studentId,
    job_roles: jobRoles,
    candidate_ids: [studentId],
    status: 'running',
    resume_text_hash: resumeHash,
    created_at: new Date(),
    updated_at: new Date()
  });

  try {
    const aiResp = await aiService.benchmarkResumes(benchmarkCandidates(resumePayload, jobRoles));
    
    const checkSnap = await sessionRef.get();
    if (!checkSnap.exists || checkSnap.data().status !== 'running') {
      throw new Error('Cancelled by user');
    }

    const results = Array.isArray(aiResp.data) ? aiResp.data : [];
    if (!results.length) throw new Error('AI returned an empty response.');

    const writeBatch = db.batch();
    for (const r of results) {
      const detailedAnalysis = {
        role_description: r.role_description || '',
        readiness_score: r.readiness_score || 0,
        growth_potential: r.growth_potential || '',
        required_skills: Array.isArray(r.required_skills) ? r.required_skills : [],
        missing_competencies: Array.isArray(r.missing_competencies) ? r.missing_competencies : [],
        common_projects: Array.isArray(r.common_projects) ? r.common_projects : [],
        recommended_certifications: Array.isArray(r.recommended_certifications) ? r.recommended_certifications : [],
      };
      
      const fitScore = Math.min(100, Math.max(0, Math.round(Number(r.fit_score) || 0)));
      const grade = r.grade || 'F';
      const roleName = r.role_name || '';

      const resRef = db.collection('benchmark_results').doc();
      writeBatch.set(resRef, {
        session_id: sessionRef.id,
        student_id: studentId,
        student_name: studentRow.full_name,
        role_name: roleName,
        fit_score: fitScore,
        grade: grade,
        major_strength: r.major_strength || null,
        improvement_suggestion: r.improvement_suggestion || null,
        detailed_analysis: detailedAnalysis
      });

      const roleTable = getRoleTable(roleName);
      if (roleTable) {
        const rrRef = db.collection('role_rankings').doc(`${roleName}_${studentId}`);
        writeBatch.set(rrRef, {
          role_name: roleName,
          session_id: sessionRef.id,
          student_id: studentId,
          student_name: studentRow.full_name,
          fit_score: fitScore,
          grade: grade,
          major_strength: r.major_strength || null,
          improvement_suggestion: r.improvement_suggestion || null,
          detailed_analysis: detailedAnalysis,
          updated_at: new Date()
        });
      }

      const rankRef = db.collection('rankings').doc(studentId);
      writeBatch.set(rankRef, {
        student_id: studentId,
        student_name: studentRow.full_name || 'Unknown',
        overall_score: Number(studentRow.overall_analysis?.overall_score) || 0,
        updated_at: new Date()
      }, { merge: true });
    }

    writeBatch.update(sessionRef, { status: 'done', updated_at: new Date() });
    await writeBatch.commit();

    results.sort((a, b) => b.fit_score - a.fit_score);
    const sessionData = (await sessionRef.get()).data();
    return { id: sessionRef.id, ...sessionData, course_tier: tier, results, cache: 'fresh' };

  } catch (err) {
    await sessionRef.update({ status: 'error', error_message: err.message, updated_at: new Date() });
    throw err;
  }
}

const getRoleLeaderboard = async (roleName, limit = 50) => {
  const roleSnap = await db.collection('role_rankings')
    .where('role_name', '==', roleName)
    .orderBy('fit_score', 'desc')
    .get();

  let peers = roleSnap.docs.map(d => d.data());
  const total = peers.length;
  peers = peers.slice(0, limit);

  // Note: Firestore doesn't easily let us join with students table, so we do it in memory.
  const leaderboard = await Promise.all(peers.map(async (p, idx) => {
    const sDoc = await db.collection('students').doc(p.student_id).get();
    const branch = sDoc.exists ? sDoc.data().branch : null;
    const course = sDoc.exists ? sDoc.data().course : null;
    
    return {
      rank: idx + 1,
      student_id: p.student_id,
      student_name: p.student_name,
      fit_score: p.fit_score,
      grade: p.grade,
      major_strength: p.major_strength,
      improvement_suggestion: p.improvement_suggestion,
      branch: branch,
      course: course,
      updated_at: p.updated_at,
    };
  }));

  return {
    role_name: roleName,
    table_name: getRoleTable(roleName),
    total,
    leaderboard
  };
};

const getMyRoleRanks = async (studentId) => {
  const roleSnap = await db.collection('role_rankings')
    .where('student_id', '==', studentId)
    .get();
    
  const myRanks = [];
  for (const doc of roleSnap.docs) {
    const myData = doc.data();
    const allRolesSnap = await db.collection('role_rankings')
      .where('role_name', '==', myData.role_name)
      .get();
      
    let peers = allRolesSnap.docs.map(d => d.data());
    peers.sort((a, b) => b.fit_score - a.fit_score);
    const rank = peers.findIndex(p => p.student_id === studentId) + 1;
    
    myRanks.push({
      role_name: myData.role_name,
      fit_score: myData.fit_score,
      grade: myData.grade,
      role_rank: rank,
      total_peers: peers.length
    });
  }
  
  myRanks.sort((a, b) => b.fit_score - a.fit_score);
  return myRanks;
};

// ... remaining multi-candidate legacy functions omitted for brevity or implemented similarly if needed ...
const createSession = async () => { throw new Error('Legacy createSession not fully migrated'); };
const getSession = async () => { throw new Error('Legacy getSession not fully migrated'); };
const listSessions = async () => { throw new Error('Legacy listSessions not fully migrated'); };
const getAvailableCandidates = async () => { throw new Error('Legacy getAvailableCandidates not fully migrated'); };

module.exports = {
  getMyRoleFit, getMyStatus, refreshMyRoleFit, getLatestSession,
  getRoleLeaderboard, getMyRoleRanks,
  createSession, getSession, listSessions, getAvailableCandidates,
};
