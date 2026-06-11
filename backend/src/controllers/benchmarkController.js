/**
 * controllers/benchmarkController.js
 *
 * Thin HTTP handlers for /api/benchmark routes.
 */

'use strict';

const benchmarkService = require('../services/benchmarkService');

// POST /api/benchmark/run
const runBenchmark = async (req, res, next) => {
  try {
    const { candidate_ids, job_roles } = req.body;

    if (!Array.isArray(candidate_ids) || !candidate_ids.length) {
      res.status(422);
      return next(new Error('candidate_ids must be a non-empty array.'));
    }
    if (!Array.isArray(job_roles) || !job_roles.length) {
      res.status(422);
      return next(new Error('job_roles must be a non-empty array.'));
    }

    const session = await benchmarkService.createSession({
      createdBy:    req.user.id,
      candidateIds: candidate_ids,
      jobRoles:     job_roles,
    });

    res.status(201).json({ success: true, data: session });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
};

// GET /api/benchmark/sessions
const listSessions = async (req, res, next) => {
  try {
    const sessions = await benchmarkService.listSessions(req.user.id);
    res.status(200).json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
};

// GET /api/benchmark/sessions/:id
const getSession = async (req, res, next) => {
  try {
    const session = await benchmarkService.getSession(req.params.id);
    if (!session) {
      res.status(404);
      return next(new Error('Benchmark session not found.'));
    }
    res.status(200).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// GET /api/benchmark/candidates
const getCandidates = async (req, res, next) => {
  try {
    const candidates = await benchmarkService.getAvailableCandidates();
    res.status(200).json({ success: true, data: candidates });
  } catch (err) {
    next(err);
  }
};

module.exports = { runBenchmark, listSessions, getSession, getCandidates };
