'use strict';

/**
 * routes/careerRoutes.js
 *
 * Career endpoints under /api/career.
 *
 * All data (advice, roles, interview questions) is read from the
 * stored resume analysis in the DB — no extra AI calls needed.
 * Only /roadmap triggers a new AI call (needs a user-supplied target role).
 *
 *   GET  /api/career/advice      – career advice from stored analysis
 *   POST /api/career/roadmap     – build a step-by-step career roadmap (AI call)
 *   GET  /api/career/roles       – job roles from stored analysis
 *   GET  /api/career/interview   – interview questions from stored analysis
 */

const express = require('express');
const {
  getAdvice,
  getRoadmap,
  getSavedRoadmap,
  getRoles,
  getInterviewQuestions,
} = require('../controllers/careerController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All career routes require authentication
router.use(protect);

router.get('/advice',          getAdvice);
router.get('/roadmap/saved',   getSavedRoadmap);   // GET saved roadmap from DB
router.post('/roadmap',        getRoadmap);        // AI call — generates + saves
router.get('/roles',           getRoles);
router.get('/interview',       getInterviewQuestions);

module.exports = router;
