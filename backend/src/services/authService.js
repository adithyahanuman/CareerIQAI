/**
 * services/authService.js
 *
 * Authentication business logic – Firebase Auth + PostgreSQL.
 *
 * Core flow:
 *   findOrCreateStudent() is called on every authenticated request.
 *   It looks up the student by firebase_uid; if not found it inserts
 *   a new row automatically (first-login provisioning).
 */

'use strict';

const { query } = require('../config/db');

// ---------------------------------------------------------------------------
// Core: Find or auto-create a student on first Firebase login
// ---------------------------------------------------------------------------

/**
 * Find an existing student by Firebase UID, or create one if this is
 * their first login.
 *
 * @param {{ firebaseUid: string, email: string, name: string, avatar: string|null }} param
 * @returns {Promise<object>} The full student row from PostgreSQL
 */
const findOrCreateStudent = async ({ firebaseUid, email, name, avatar }) => {
  // Ensure full_name is never null (schema has NOT NULL constraint)
  name = name || email?.split('@')[0] || 'Student';

  // ── 1. Try to find existing student by Firebase UID ────────────────────────
  let existing = await getByFirebaseUid(firebaseUid);
  if (existing) {
    // Update last_login_at timestamp
    await query(
      'UPDATE students SET last_login_at = NOW() WHERE firebase_uid = $1',
      [firebaseUid],
    );
    return { ...existing, last_login_at: new Date() };
  }

  // ── 2. If not found, check if a student with the same email exists ─────────
  if (email) {
    const emailResult = await query(
      'SELECT * FROM students WHERE email = $1 LIMIT 1',
      [email]
    );
    if (emailResult.rows.length > 0) {
      existing = emailResult.rows[0];
      console.log(`[authService] Linking existing student email ${email} to Firebase UID: ${firebaseUid}`);
      // Update their firebase_uid and last_login_at
      const { rows } = await query(
        `UPDATE students
         SET    firebase_uid = $1,
                last_login_at = NOW(),
                full_name = COALESCE(full_name, $2)
         WHERE  id = $3
         RETURNING *`,
        [firebaseUid, name, existing.id]
      );
      return rows[0];
    }
  }

  // ── 3. First login – create new student record ───────────────────────────────
  console.log(`[authService] First login – provisioning student for UID: ${firebaseUid}`);

  const { rows } = await query(
    `INSERT INTO students
       (firebase_uid, email, full_name, avatar_url, is_verified, last_login_at)
     VALUES ($1, $2, $3, $4, TRUE, NOW())
     RETURNING *`,
    [firebaseUid, email, name, avatar],
  );

  console.log(`[authService] ✓ Student created – id: ${rows[0].id}`);
  return rows[0];
};

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

/**
 * Find a student by Firebase UID.
 * @param {string} firebaseUid
 * @returns {Promise<object|null>}
 */
const getByFirebaseUid = async (firebaseUid) => {
  const { rows } = await query(
    'SELECT * FROM students WHERE firebase_uid = $1 LIMIT 1',
    [firebaseUid],
  );
  return rows[0] ?? null;
};

/**
 * Find a student by internal PostgreSQL UUID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
const getById = async (id) => {
  const { rows } = await query(
    'SELECT * FROM students WHERE id = $1 LIMIT 1',
    [id],
  );
  return rows[0] ?? null;
};

// ---------------------------------------------------------------------------
// Session helpers (Firebase is stateless – nothing server-side to store)
// ---------------------------------------------------------------------------

/**
 * Firebase tokens expire automatically – nothing to do server-side.
 * Kept for API consistency.
 */
const logout = async (_user) => {
  // Firebase ID tokens expire after 1 hour.
  // For immediate revocation, call admin.auth().revokeRefreshTokens(uid)
  // – add that here if you need forced sign-out.
};

// ---------------------------------------------------------------------------
// Legacy stubs (kept for backward compatibility)
// ---------------------------------------------------------------------------

const register = async ({ email, name }) => {
  console.warn('[authService] register() is a no-op when using Firebase Auth.');
  return { email, name };
};

const login = async ({ email }) => {
  console.warn('[authService] login() is a no-op when using Firebase Auth.');
  return { email };
};

module.exports = {
  findOrCreateStudent,
  getByFirebaseUid,
  getById,
  logout,
  register,
  login,
};
