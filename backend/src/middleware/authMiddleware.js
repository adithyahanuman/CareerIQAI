/**
 * middleware/authMiddleware.js
 *
 * Firebase Admin SDK – Bearer token authentication middleware.
 *
 * Flow for every protected request:
 *   1. Extract the Bearer token from the Authorization header.
 *   2. Verify it with Firebase Admin (checks signature + expiry).
 *   3. Find or auto-create a student record in PostgreSQL.
 *   4. Attach the student object to req.user.
 */

'use strict';

const { auth }       = require('../config/firebase');
const authService    = require('../services/authService');

/**
 * Protects a route by verifying a Firebase ID token.
 * On success, req.user is set to the full PostgreSQL student record.
 *
 * @type {import('express').RequestHandler}
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401);
      return next(new Error('Not authorised – no token provided.'));
    }

    const idToken = authHeader.split(' ')[1];

    // ── Step 1: Verify the Firebase ID token ──────────────────────────────
    let decoded;
    try {
      decoded = await auth.verifyIdToken(idToken);
    } catch (firebaseErr) {
      res.status(401);
      return next(new Error('Not authorised – invalid or expired token.'));
    }

    // ── Step 2: Find or create the student record in PostgreSQL ───────────
    const name = decoded.name || (decoded.email ? decoded.email.split('@')[0] : 'Student');
    const student = await authService.findOrCreateStudent({
      firebaseUid: decoded.uid,
      email:       decoded.email       || '',
      name:        name,
      avatar:      decoded.picture     || null,
    });

    // ── Step 3: Attach student to request ─────────────────────────────────
    req.user = student;
    next();

  } catch (err) {
    next(err);
  }
};

/**
 * Optional middleware – allows a route to be accessed without a token
 * but still attaches req.user if a valid token is present.
 *
 * @type {import('express').RequestHandler}
 */
const optionalProtect = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  return protect(req, res, next);
};

module.exports = { protect, optionalProtect };
