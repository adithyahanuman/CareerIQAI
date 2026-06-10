'use strict';

/**
 * controllers/careerController.js
 *
 * Serves career data from the stored resume analysis (DB read — no AI call).
 * Only /roadmap triggers a fresh AI call since it needs a user-specified target role.
 */

const careerService = require('../services/careerService');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/career/advice
// Returns career advice stored from the single resume analysis call.
// ─────────────────────────────────────────────────────────────────────────────
const getAdvice = async (req, res, next) => {
  try {
    const advice = await careerService.getCareerAdvice(req.user.id);
    res.status(200).json({ success: true, data: advice });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/career/roadmap
// Calls AI with a user-supplied target role to build a transition plan.
// ─────────────────────────────────────────────────────────────────────────────
const getRoadmap = async (req, res, next) => {
  try {
    const { currentRole, targetRole, skills } = req.body;
    if (!currentRole || !targetRole) {
      res.status(422);
      return next(new Error('currentRole and targetRole are required.'));
    }
    const roadmap = await careerService.buildRoadmap({ currentRole, targetRole, skills });
    res.status(200).json({ success: true, data: roadmap });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/career/roles
// Returns job roles stored from the single resume analysis call.
// ─────────────────────────────────────────────────────────────────────────────
const getRoles = async (req, res, next) => {
  try {
    const roles = await careerService.getJobRoles(req.user.id);
    res.status(200).json({ success: true, data: roles });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/career/interview
// Returns interview questions stored from the single resume analysis call.
// ─────────────────────────────────────────────────────────────────────────────
const getInterviewQuestions = async (req, res, next) => {
  try {
    const questions = await careerService.getInterviewQuestions(req.user.id);
    res.status(200).json({ success: true, data: questions });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
};

module.exports = { getAdvice, getRoadmap, getRoles, getInterviewQuestions };
