/**
 * controllers/benchmarkController.js  (v3 — role-table edition)
 */

'use strict';

const benchmarkService = require('../services/benchmarkService');

// ── GET /api/benchmark/my-role-fit  ──────────────────────────────────────────
const getMyRoleFit = async (req, res, next) => {
  try {
    const data = await benchmarkService.getMyRoleFit(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
};

// ── GET /api/benchmark/my-role-fit/status  ───────────────────────────────────
const getMyStatus = async (req, res, next) => {
  try {
    const data = await benchmarkService.getMyStatus(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
};

// ── POST /api/benchmark/my-role-fit/refresh  ─────────────────────────────────
const refreshMyRoleFit = async (req, res, next) => {
  try {
    const data = await benchmarkService.refreshMyRoleFit(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
};

// ── GET /api/benchmark/leaderboard/:role  ────────────────────────────────────
// Returns the global leaderboard for a role (all tiers, ranked by fit_score).
// Example: GET /api/benchmark/leaderboard/Business%20Analyst?limit=25
const getRoleLeaderboard = async (req, res, next) => {
  try {
    const roleName = decodeURIComponent(req.params.role);
    const limit    = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const data     = await benchmarkService.getRoleLeaderboard(roleName, limit);
    res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
};

// ── GET /api/benchmark/my-role-ranks  ────────────────────────────────────────
// Returns the logged-in student's rank in every role they've been benchmarked for.
const getMyRoleRanks = async (req, res, next) => {
  try {
    const data = await benchmarkService.getMyRoleRanks(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
};

// ── POST /api/benchmark/run  ─────────────────────────────────────────────────
const runBenchmark = async (req, res, next) => {
  try {
    const { candidate_ids, job_roles } = req.body;
    if (!Array.isArray(candidate_ids) || !candidate_ids.length) {
      res.status(422); return next(new Error('candidate_ids required.'));
    }
    if (!Array.isArray(job_roles) || !job_roles.length) {
      res.status(422); return next(new Error('job_roles required.'));
    }
    const session = await benchmarkService.createSession({
      createdBy: req.user.id, candidateIds: candidate_ids, jobRoles: job_roles,
    });
    res.status(201).json({ success: true, data: session });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
};

// ── GET /api/benchmark/sessions  ─────────────────────────────────────────────
const listSessions = async (req, res, next) => {
  try {
    const sessions = await benchmarkService.listSessions(req.user.id);
    res.status(200).json({ success: true, data: sessions });
  } catch (err) { next(err); }
};

// ── GET /api/benchmark/sessions/:id  ─────────────────────────────────────────
const getSession = async (req, res, next) => {
  try {
    const session = await benchmarkService.getSession(req.params.id);
    if (!session) { res.status(404); return next(new Error('Session not found.')); }
    res.status(200).json({ success: true, data: session });
  } catch (err) { next(err); }
};

// ── GET /api/benchmark/candidates  ───────────────────────────────────────────
const getCandidates = async (req, res, next) => {
  try {
    const candidates = await benchmarkService.getAvailableCandidates();
    res.status(200).json({ success: true, data: candidates });
  } catch (err) { next(err); }
};

module.exports = {
  getMyRoleFit, getMyStatus, refreshMyRoleFit,
  getRoleLeaderboard, getMyRoleRanks,
  runBenchmark, listSessions, getSession, getCandidates,
};
