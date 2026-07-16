/**
 * services/authService.js
 *
 * Authentication business logic – Firebase Auth + Firestore.
 *
 * Core flow:
 *   findOrCreateStudent() is called on every authenticated request.
 *   It looks up the student by firebase_uid; if not found it inserts
 *   a new document automatically (first-login provisioning).
 */

'use strict';

const { db } = require('../config/firebase');

// ---------------------------------------------------------------------------
// Core: Find or auto-create a student on first Firebase login
// ---------------------------------------------------------------------------

/**
 * Find an existing student by Firebase UID, or create one if this is
 * their first login.
 *
 * @param {{ firebaseUid: string, email: string, name: string, avatar: string|null }} param
 * @returns {Promise<object>} The full student document from Firestore
 */
const findOrCreateStudent = async ({ firebaseUid, email, name, avatar }) => {
  name = name || email?.split('@')[0] || 'Student';

  const docRef = db.collection('students').doc(firebaseUid);
  const docSnap = await docRef.get();

  if (docSnap.exists) {
    // ── 1. Update last_login_at timestamp ────────────────────────
    await docRef.update({ last_login_at: new Date() });
    return { id: docSnap.id, ...docSnap.data(), last_login_at: new Date() };
  }

  // ── 2. If not found, check if a student with the same email exists ─────────
  if (email) {
    const emailSnapshot = await db.collection('students')
      .where('email', '==', email)
      .limit(1)
      .get();
      
    if (!emailSnapshot.empty) {
      const existingDoc = emailSnapshot.docs[0];
      console.log(`[authService] Linking existing student email ${email} to Firebase UID: ${firebaseUid}`);
      
      // Update their firebase_uid and last_login_at
      const updateData = {
        firebase_uid: firebaseUid,
        last_login_at: new Date(),
        full_name: existingDoc.data().full_name || name
      };
      
      await existingDoc.ref.update(updateData);
      return { id: existingDoc.id, ...existingDoc.data(), ...updateData };
    }
  }

  // ── 3. First login – create new student record ───────────────────────────────
  console.log(`[authService] First login – provisioning student for UID: ${firebaseUid}`);

  const newStudent = {
    firebase_uid: firebaseUid,
    email: email,
    full_name: name,
    avatar_url: avatar,
    is_verified: true,
    last_login_at: new Date(),
    created_at: new Date()
  };

  await docRef.set(newStudent);

  console.log(`[authService] ✓ Student created – id: ${firebaseUid}`);
  return { id: firebaseUid, ...newStudent };
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
  const docRef = db.collection('students').doc(firebaseUid);
  const docSnap = await docRef.get();
  
  if (docSnap.exists) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  
  // Fallback in case the document ID is not the firebaseUid
  const snapshot = await db.collection('students')
    .where('firebase_uid', '==', firebaseUid)
    .limit(1)
    .get();
    
  if (!snapshot.empty) {
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }
  
  return null;
};

/**
 * Find a student by internal Firestore ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
const getById = async (id) => {
  const docRef = db.collection('students').doc(id);
  const docSnap = await docRef.get();
  return docSnap.exists ? { id: docSnap.id, ...docSnap.data() } : null;
};

// ---------------------------------------------------------------------------
// Session helpers (Firebase is stateless – nothing server-side to store)
// ---------------------------------------------------------------------------

const logout = async (_user) => {};

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
