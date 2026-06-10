/**
 * controllers/authController.js
 *
 * Handles all /api/auth/* requests.
 * Business logic lives in services/authService.js – controllers stay thin.
 *
 * With Firebase Auth the flow is:
 *   Frontend signs in via Firebase SDK → gets an ID token →
 *   sends it as `Authorization: Bearer <token>` with every request.
 *   The `protect` middleware verifies the token and populates req.user.
 */

'use strict';

const authService = require('../services/authService');

/**
 * POST /api/auth/session
 *
 * Called by the frontend immediately after a successful Firebase sign-in.
 * The `protect` middleware has already verified the token and found/created
 * the student record – this controller just returns it.
 *
 * @type {import('express').RequestHandler}
 */
const session = async (req, res, next) => {
  try {
    // req.user is populated by authMiddleware.protect
    res.status(200).json({
      success: true,
      data:    req.user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated student's profile.
 * req.user is already set by the protect middleware.
 *
 * @type {import('express').RequestHandler}
 */
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: req.user });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 *
 * Firebase tokens expire client-side; nothing to invalidate server-side.
 * The frontend should call firebase.auth().signOut() to clear the local token.
 *
 * @type {import('express').RequestHandler}
 */
const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user);
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/register  (legacy – no-op with Firebase Auth)
 * POST /api/auth/login     (legacy – no-op with Firebase Auth)
 *
 * Kept so existing route definitions don't break.
 * Frontend should use Firebase SDK for registration and login.
 */
const register = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Registration is handled by Firebase Auth on the frontend. Use POST /api/auth/session after sign-in.',
  });
};

const login = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Login is handled by Firebase Auth on the frontend. Use POST /api/auth/session after sign-in.',
  });
};

module.exports = { session, getMe, logout, register, login };
