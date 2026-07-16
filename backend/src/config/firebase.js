/**
 * config/firebase.js – Firebase Admin SDK initialisation.
 *
 * Reads the service-account key from:
 *   1. FIREBASE_SERVICE_ACCOUNT env variable (for production / Render)
 *   2. backend/serviceAccountKey.json file (for local development)
 *
 * Prerequisites:
 *   Production: Set FIREBASE_SERVICE_ACCOUNT env var with the full JSON string.
 *   Local dev:  Place your Firebase service-account JSON at:
 *               backend/serviceAccountKey.json
 */

'use strict';

const admin = require('firebase-admin');
const path  = require('path');
const env   = require('./env');

let serviceAccount;

// ── Option 1: Read from environment variable (Render / production) ──────────
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('[Firebase] ✓ Service account loaded from FIREBASE_SERVICE_ACCOUNT env var.');
  } catch (err) {
    console.error('[Firebase] ✗ Failed to parse FIREBASE_SERVICE_ACCOUNT env var:', err.message);
    process.exit(1);
  }
} else {
  // ── Option 2: Read from local file (local development) ────────────────────
  const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', '..', 'serviceAccountKey.json');
  try {
    serviceAccount = require(SERVICE_ACCOUNT_PATH);
    console.log('[Firebase] ✓ Service account loaded from serviceAccountKey.json file.');
  } catch {
    console.error(
      '[Firebase] ✗ serviceAccountKey.json not found at:',
      SERVICE_ACCOUNT_PATH,
    );
    console.error(
      '           Either set FIREBASE_SERVICE_ACCOUNT env var (production)',
    );
    console.error(
      '           or download serviceAccountKey.json from Firebase Console → Project Settings → Service accounts',
    );
    process.exit(1);
  }
}

// Initialise only once (guards against hot-reload double-init)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId:  env.firebaseProjectId || serviceAccount.project_id,
  });
  console.log(
    `[Firebase] ✓ Admin SDK initialised (project: ${serviceAccount.project_id})`,
  );
}

const auth = admin.auth();
const db = admin.firestore();

module.exports = { admin, auth, db };
