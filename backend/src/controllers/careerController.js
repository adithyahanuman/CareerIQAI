'use strict';

/**
 * controllers/careerController.js
 *
 * Serves career data from the stored resume analysis (DB read — no AI call).
 * Only /roadmap triggers a fresh AI call since it needs a user-specified target role.
 */

const careerService = require('../services/careerService');
const { db } = require('../config/firebase');

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

    // ── Persist: one roadmap per student (upsert — replaces previous) ──────
    try {
      const roadmapText = typeof roadmap === 'string' ? roadmap : JSON.stringify(roadmap);
      let parsedData = null;
      try {
        const clean = roadmapText.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(clean);
      } catch (_) { parsedData = { steps: [], raw: roadmapText }; }

      await db.collection('roadmaps').doc(req.user.id).set({
        student_id: req.user.id,
        from_role: currentRole,
        to_role: targetRole,
        roadmap_data: parsedData,
        raw_text: roadmapText,
        updated_at: new Date()
      }, { merge: true });
      
    } catch (dbErr) {
      console.warn('[careerController] Roadmap DB save failed:', dbErr.message);
    }

    res.status(200).json({ success: true, data: roadmap });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/career/roadmap/saved
// Returns the previously generated roadmap stored in the DB for this student.
// ─────────────────────────────────────────────────────────────────────────────
const getSavedRoadmap = async (req, res, next) => {
  try {
    const doc = await db.collection('roadmaps').doc(req.user.id).get();
    if (!doc.exists) {
      return res.status(200).json({ success: true, data: null });
    }
    const data = doc.data();
    res.status(200).json({ 
      success: true, 
      data: {
        from_role: data.from_role,
        to_role: data.to_role,
        roadmap_data: data.roadmap_data,
        updated_at: data.updated_at
      }
    });
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

module.exports = { getAdvice, getRoadmap, getSavedRoadmap, getRoles, getInterviewQuestions };
