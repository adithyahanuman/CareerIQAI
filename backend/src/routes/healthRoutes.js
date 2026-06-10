/**
 * routes/healthRoutes.js
 *
 * GET /api/health  – liveness probe used by monitoring tools and the frontend
 *                    to verify the server is reachable.
 */

'use strict';

const express = require('express');
const { getHealth } = require('../controllers/healthController');

const router = express.Router();

router.get('/', getHealth);

module.exports = router;
