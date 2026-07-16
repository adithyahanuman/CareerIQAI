/**
 * controllers/healthController.js
 *
 * Handles GET /api/health
 */

'use strict';

const { db } = require('../config/firebase');

/**
 * @type {import('express').RequestHandler}
 */
const getHealth = async (_req, res) => {
  try {
    // Simple query to verify Firestore connectivity
    await db.collection('students').limit(1).get();
    res.status(200).json({
      success: true,
      message: 'CareerIQ AI API is healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      message: 'CareerIQ AI API is unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'disconnected',
      error: err.message,
    });
  }
};

module.exports = { getHealth };
