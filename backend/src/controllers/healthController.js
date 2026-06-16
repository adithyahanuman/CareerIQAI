/**
 * controllers/healthController.js
 *
 * Handles GET /api/health
 */

'use strict';

const { testConnection, closePool } = require('../config/db');

/**
 * @type {import('express').RequestHandler}
 */
const getHealth = async (_req, res) => {
  try {
    await testConnection();
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
