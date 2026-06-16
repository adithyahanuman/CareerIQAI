/**
 * routes/authRoutes.js
 *
 * Authentication endpoints under /api/auth.
 *
 *   POST /api/auth/session  – verify Firebase token + return/create student profile
 *   GET  /api/auth/me       – return authenticated student's profile
 *   POST /api/auth/logout   – client-side signout (stateless)
 *   POST /api/auth/register – legacy no-op (Firebase handles registration)
 *   POST /api/auth/login    – legacy no-op (Firebase handles login)
 */

'use strict';

const express = require('express');
const {
  session,
  getMe,
  logout,
  register,
  login,
  checkEmail,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// ── Firebase Auth routes ───────────────────────────────────────────────────
router.post('/session',  protect, session);   // called after Firebase sign-in
router.get('/me',        protect, getMe);     // get current student profile
router.post('/logout',   protect, logout);    // client-side signout

// ── Legacy routes (kept for backward compatibility) ────────────────────────
router.post('/register', register);
router.post('/login',    login);
router.post('/check-email', checkEmail);

module.exports = router;
