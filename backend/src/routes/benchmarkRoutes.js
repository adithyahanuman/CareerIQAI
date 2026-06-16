/**
 * routes/benchmarkRoutes.js  (v3 — role-table edition)
 *
 *   GET  /api/benchmark/my-role-fit              – get (or generate) personal role-fit scores
 *   GET  /api/benchmark/my-role-fit/status       – lightweight poll, never triggers AI
 *   POST /api/benchmark/my-role-fit/refresh      – force refresh (re-run AI)
 *   GET  /api/benchmark/my-role-ranks            – student's rank in every benchmarked role
 *   GET  /api/benchmark/leaderboard/:role        – global top-N for a specific role
 *   POST /api/benchmark/run                      – legacy multi-candidate run (admin)
 *   GET  /api/benchmark/sessions                 – list my sessions
 *   GET  /api/benchmark/sessions/:id             – get one session + results
 *   GET  /api/benchmark/candidates               – all students with analysed resumes
 */

'use strict';

const express     = require('express');
const ctrl        = require('../controllers/benchmarkController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

// ── Personal role-fit ─────────────────────────────────────────────────────────
router.get('/my-role-fit',          ctrl.getMyRoleFit);
router.get('/my-role-fit/status',   ctrl.getMyStatus);
router.post('/my-role-fit/refresh', ctrl.refreshMyRoleFit);

// ── Per-role ranking ──────────────────────────────────────────────────────────
// GET /api/benchmark/my-role-ranks
//   → student's rank in every role they've been benchmarked for
router.get('/my-role-ranks',        ctrl.getMyRoleRanks);

// GET /api/benchmark/leaderboard/:role?limit=50
//   → global leaderboard for a role (all tiers, ranked by fit_score)
//   → :role must be URL-encoded, e.g. "Business%20Analyst"
router.get('/leaderboard/:role',    ctrl.getRoleLeaderboard);

// ── Legacy / admin ────────────────────────────────────────────────────────────
router.post('/run',             ctrl.runBenchmark);
router.get('/sessions',         ctrl.listSessions);
router.get('/sessions/:id',     ctrl.getSession);
router.get('/candidates',       ctrl.getCandidates);

module.exports = router;
