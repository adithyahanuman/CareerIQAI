/**
 * routes/benchmarkRoutes.js
 *
 *   POST GET /api/benchmark/run           – run a new benchmark session
 *   GET      /api/benchmark/sessions      – list my sessions
 *   GET      /api/benchmark/sessions/:id  – get one session + results
 *   GET      /api/benchmark/candidates    – all students with analysed resumes
 */

'use strict';

const express = require('express');
const { runBenchmark, listSessions, getSession, getCandidates } = require('../controllers/benchmarkController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.post('/run',            runBenchmark);
router.get('/sessions',        listSessions);
router.get('/sessions/:id',    getSession);
router.get('/candidates',      getCandidates);

module.exports = router;
