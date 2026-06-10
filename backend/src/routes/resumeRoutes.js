/**
 * routes/resumeRoutes.js
 *
 * Resume endpoints under /api/resumes.
 *
 *   POST /api/resumes/upload          – upload resume text (auto-runs Gemini)
 *   POST /api/resumes/analyze         – analyze resume text on-demand with Gemini
 *   GET  /api/resumes/single/:id      – get one resume by UUID
 *   GET  /api/resumes/:studentId      – list all resumes for a student
 */

'use strict';

const express = require('express');
const {
  uploadResume,
  analyzeResume,
  getResumesByStudent,
  getResumeById,
  getActiveResume,
} = require('../controllers/resumeController');

const { protect }  = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');

const router = express.Router();

// All routes below require Firebase authentication
router.use(protect);

// POST /api/resumes/upload – store + auto-analyze resume text
router.post(
  '/upload',
  validate({ resume_text: 'required' }),
  uploadResume,
);

// POST /api/resumes/analyze – analyze resume text on-demand (authenticated)
router.post(
  '/analyze',
  validate({ resume_text: 'required' }),
  analyzeResume,
);

// GET /api/resumes/my/active – get active resume for logged in student
router.get('/my/active', getActiveResume);

// GET /api/resumes/single/:id – must be before /:studentId to avoid conflict
router.get('/single/:id', getResumeById);

// GET /api/resumes/:studentId – all resumes for a student
router.get('/:studentId', getResumesByStudent);

module.exports = router;
