/**
 * controllers/resumeController.js
 *
 * Thin handlers for /api/resumes routes.
 * All DB + AI logic lives in services/.
 */

'use strict';

const resumeService = require('../services/resumeService');

// ---------------------------------------------------------------------------
// POST /api/resumes/upload
// ---------------------------------------------------------------------------

/**
 * Upload resume text → auto-runs Gemini analysis → stores everything.
 *
 * Body: { student_id*, resume_text*, file_name? }
 * @type {import('express').RequestHandler}
 */
const uploadResume = async (req, res, next) => {
  try {
    const { student_id, resume_text, file_name } = req.body;
    const targetStudentId = student_id || req.user.id;

    if (req.user.id !== targetStudentId && req.user.role !== 'admin') {
      res.status(403);
      return next(new Error('You can only upload resumes for your own account.'));
    }

    const resume = await resumeService.uploadResume({ student_id: targetStudentId, resume_text, file_name });

    const statusCode = resume.status === 'done' && resume.analysis ? 200 : 201;
    res.status(statusCode).json({ success: true, data: resume });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/resumes/analyze
// ---------------------------------------------------------------------------

/**
 * Analyze a resume text on-demand with Gemini (does NOT require a stored resume).
 * Optionally saves the scores back to a resume row if resume_id is provided.
 *
 * Body: { resume_text*, resume_id? }
 *
 * Response: { skills_score, education_score, experience_score,
 *             overall_resume_score, feedback }
 *
 * @type {import('express').RequestHandler}
 */
const analyzeResume = async (req, res, next) => {
  try {
    const { resume_text, resume_id } = req.body;

    if (!resume_text || resume_text.trim().length === 0) {
      res.status(422);
      return next(new Error('resume_text is required and cannot be empty.'));
    }

    // ONE AI call — scores + career advice + job roles + interview questions
    const aiResponse = await aiService.analyzeResume(prompts.fullResumeAnalysis(resume_text));
    const analysis = aiResponse.data;

    // If a resume_id is provided, persist the scores via the service layer
    if (resume_id) {
      await resumeService.updateAnalysis(resume_id, analysis);
    }

    res.status(200).json({ success: true, data: analysis });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/resumes/:studentId
// ---------------------------------------------------------------------------

/**
 * Get all resumes for a student.
 * @type {import('express').RequestHandler}
 */
const getResumesByStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    if (req.user.id !== studentId && req.user.role !== 'admin') {
      res.status(403);
      return next(new Error('You can only view your own resumes.'));
    }

    const resumes = await resumeService.getResumesByStudentId(studentId);
    res.status(200).json({ success: true, data: resumes, meta: { count: resumes.length } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/resumes/single/:id
// ---------------------------------------------------------------------------

/**
 * Get a single resume by UUID.
 * @type {import('express').RequestHandler}
 */
const getResumeById = async (req, res, next) => {
  try {
    const resume = await resumeService.getResumeById(req.params.id);

    if (!resume) {
      res.status(404);
      return next(new Error(`Resume with id "${req.params.id}" not found.`));
    }

    if (req.user.id !== resume.student_id && req.user.role !== 'admin') {
      res.status(403);
      return next(new Error('You can only view your own resumes.'));
    }

    res.status(200).json({ success: true, data: resume });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/resumes/my/active
// ---------------------------------------------------------------------------

/**
 * Get active (primary) resume for current user.
 * @type {import('express').RequestHandler}
 */
const getActiveResume = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const resume = await resumeService.getPrimaryResume(studentId);
    res.status(200).json({ success: true, data: resume });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadResume, analyzeResume, getResumesByStudent, getResumeById, getActiveResume };
