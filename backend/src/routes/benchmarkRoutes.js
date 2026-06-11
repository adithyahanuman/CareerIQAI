/**
 * routes/benchmarkRoutes.js  (v2)
 *
 *   GET  /api/benchmark/my-role-fit          – get (or generate) personal role-fit scores
 *   POST /api/benchmark/my-role-fit/refresh  – force refresh (re-run AI)
 *   POST /api/benchmark/run                  – legacy multi-candidate run
 *   GET  /api/benchmark/sessions             – list my sessions
 *   GET  /api/benchmark/sessions/:id         – get one session + results
 *   GET  /api/benchmark/candidates           – all students with analysed resumes
 */

'use strict';

const express    = require('express');
const ctrl       = require('../controllers/benchmarkController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

// Personal role-fit (primary feature)
router.get('/my-role-fit',           ctrl.getMyRoleFit);
router.get('/my-role-fit/status',    ctrl.getMyStatus);
router.post('/my-role-fit/refresh',  ctrl.refreshMyRoleFit);

// Legacy / admin
router.post('/run',             ctrl.runBenchmark);
router.get('/sessions',         ctrl.listSessions);
router.get('/sessions/:id',     ctrl.getSession);
router.get('/candidates',       ctrl.getCandidates);

module.exports = router;
