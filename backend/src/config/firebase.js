/**
 * config/firebase.js – Firebase Admin SDK initialisation.
 *
 * Reads the service-account key from the project root and initialises
 * the Admin SDK once.  All other modules import { admin, auth } from here.
 *
 * Prerequisites:
 *   1. Place your Firebase service-account JSON at:
 *      backend/serviceAccountKey.json
 *   2. Set FIREBASE_PROJECT_ID in your .env file.
 */

'use strict';

const admin = require('firebase-admin');
const path  = require('path');
const env   = require('./env');

// Path to the service-account key (never commit this file – it's in .gitignore)
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', '..', 'serviceAccountKey.json');

let serviceAccount;
try {
  serviceAccount = require(SERVICE_ACCOUNT_PATH);
} catch {
  console.error(
    '[Firebase] ✗ serviceAccountKey.json not found at:',
    SERVICE_ACCOUNT_PATH,
  );
  console.error(
    '           Download it from Firebase Console → Project Settings → Service accounts',
  );
  process.exit(1);
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

module.exports = { admin, auth };
