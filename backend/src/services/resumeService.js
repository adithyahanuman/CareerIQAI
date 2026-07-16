/**
 * services/resumeService.js
 *
 * Resume business logic – Firestore implementation.
 */

'use strict';

const crypto              = require('crypto');
const { db }              = require('../config/firebase');
const aiService           = require('../ai/aiService');
const prompts             = require('../ai/prompts');
const getBenchmarkService = () => require('./benchmarkService');

/** SHA-256 hex of a string */
function sha256(text) {
  return crypto.createHash('sha256').update(text || '').digest('hex');
}

// ---------------------------------------------------------------------------
// CREATE / UPLOAD
// ---------------------------------------------------------------------------

const uploadResume = async ({ student_id, resume_text, file_name = 'resume.txt', target_role_type = 'internship' }) => {
  // Validate student exists
  const studentDoc = await db.collection('students').doc(student_id).get();
  if (!studentDoc.exists) {
    const err = new Error(`Student with id "${student_id}" not found.`);
    err.statusCode = 404;
    throw err;
  }

  const contentHash = sha256(resume_text + '|' + target_role_type + '|v6');
  console.log(`[resumeService] content hash = ${contentHash.slice(0, 12)}… (target: ${target_role_type})`);

  // Try to find cached analysis
  const cachedSnapshot = await db.collection('resumes')
    .where('student_id', '==', student_id)
    .where('resume_text_hash', '==', contentHash)
    .where('status', '==', 'done')
    .orderBy('created_at', 'desc')
    .limit(1)
    .get();

  if (!cachedSnapshot.empty) {
    const cachedDoc = cachedSnapshot.docs[0];
    
    // Set other resumes to is_primary: false
    const primarySnapshot = await db.collection('resumes')
      .where('student_id', '==', student_id)
      .where('is_primary', '==', true)
      .get();
      
    const batch = db.batch();
    primarySnapshot.forEach(doc => {
      if (doc.id !== cachedDoc.id) {
        batch.update(doc.ref, { is_primary: false });
      }
    });
    batch.update(cachedDoc.ref, { is_primary: true });
    await batch.commit();

    console.log('[resumeService] Cache HIT (hash match) – returning existing analysis for:', file_name);
    return { id: cachedDoc.id, ...cachedDoc.data(), is_primary: true };
  }

  // ── No cache hit — content is new or changed. Insert a fresh record ────────
  const primarySnapshot = await db.collection('resumes')
    .where('student_id', '==', student_id)
    .where('is_primary', '==', true)
    .get();
    
  const batch = db.batch();
  primarySnapshot.forEach(doc => {
    batch.update(doc.ref, { is_primary: false });
  });
  
  const newResumeRef = db.collection('resumes').doc();
  const newResumeData = {
    student_id,
    file_name,
    resume_text_hash: contentHash,
    raw_text: resume_text,
    status: 'parsed',
    is_primary: true,
    created_at: new Date(),
    updated_at: new Date()
  };
  
  batch.set(newResumeRef, newResumeData);
  await batch.commit();

  try {
    const aiResponse = await aiService.analyzeResume(prompts.fullResumeAnalysis(resume_text, target_role_type));
    const analysis = aiResponse.data;

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
    
    const overallScore = calculatedOverallScore;

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

    const updateData = {
      contact_analysis:          analysis.contact ?? null,
      summary_analysis:          analysis.summary ?? null,
      experience_analysis:       analysis.experience ?? null,
      education_analysis:        analysis.education ?? null,
      skills_analysis:           analysis.skills ?? null,
      projects_analysis:         analysis.projects ?? null,
      formatting_analysis:       analysis.formatting ?? null,
      certifications_analysis:   analysis.certifications ?? null,
      extracurriculars_analysis: analysis.extracurriculars ?? null,
      overall_analysis:          analysis.overall ?? null,
      action_plan_analysis:      analysis.action_plan ?? null,
      completeness_analysis:     analysis.resume_completeness ?? null,
      confidence_analysis:       analysis.analysis_confidence ?? null,
      analysis:                  analysis,
      ats_score:                 overallScore,
      status:                    'done',
      updated_at:                new Date()
    };

    await newResumeRef.update(updateData);
    const saved = { id: newResumeRef.id, ...newResumeData, ...updateData };

    setImmediate(() => {
      getBenchmarkService()
        .refreshMyRoleFit(student_id)
        .then(() => console.log(`[benchmark] Auto-refreshed role-fit for student ${student_id}`))
        .catch(err  => console.warn(`[benchmark] Auto-refresh skipped: ${err.message}`));
    });

    return saved;
  } catch (aiErr) {
    console.error('[resumeService] AI analysis failed:', aiErr.message);
    await newResumeRef.update({ status: 'error', error_message: aiErr.message });
    return { id: newResumeRef.id, ...newResumeData, status: 'error', error_message: aiErr.message };
  }
};

// ---------------------------------------------------------------------------
// READ
// ---------------------------------------------------------------------------

const getResumesByStudentId = async (studentId) => {
  const snapshot = await db.collection('resumes')
    .where('student_id', '==', studentId)
    .orderBy('created_at', 'desc')
    .get();
    
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      student_id: data.student_id,
      file_name: data.file_name,
      ats_score: data.ats_score,
      status: data.status,
      is_primary: data.is_primary,
      error_message: data.error_message,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  });
};

const getResumeById = async (id) => {
  const doc = await db.collection('resumes').doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

const getPrimaryResume = async (studentId) => {
  const snapshot = await db.collection('resumes')
    .where('student_id', '==', studentId)
    .where('is_primary', '==', true)
    .limit(1)
    .get();
    
  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
};

const updateAnalysis = async (resumeId, analysis) => {
  const overallScore = analysis.overall?.overall_score ?? analysis.overall_resume_score ?? null;
  
  await db.collection('resumes').doc(resumeId).update({
    contact_analysis:          analysis.contact ?? null,
    summary_analysis:          analysis.summary ?? null,
    experience_analysis:       analysis.experience ?? null,
    education_analysis:        analysis.education ?? null,
    skills_analysis:           analysis.skills ?? null,
    projects_analysis:         analysis.projects ?? null,
    formatting_analysis:       analysis.formatting ?? null,
    certifications_analysis:   analysis.certifications ?? null,
    extracurriculars_analysis: analysis.extracurriculars ?? null,
    overall_analysis:          analysis.overall ?? null,
    action_plan_analysis:      analysis.action_plan ?? null,
    completeness_analysis:     analysis.resume_completeness ?? null,
    confidence_analysis:       analysis.analysis_confidence ?? null,
    analysis:                  analysis,
    ats_score:                 overallScore,
    status:                    'done',
    updated_at:                new Date()
  });
};

module.exports = {
  uploadResume,
  getResumesByStudentId,
  getResumeById,
  getPrimaryResume,
  updateAnalysis,
};
