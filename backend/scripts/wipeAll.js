const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

require('dotenv').config();
const { admin } = require('../src/config/firebase');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const isCockroach = connectionString
  ? connectionString.includes('cockroachlabs.cloud')
  : (process.env.DB_HOST || '').includes('cockroachlabs.cloud');

const poolConfig = connectionString ? {
  connectionString,
  ssl: isCockroach ? { rejectUnauthorized: true } : false,
} : {
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     process.env.DB_PORT,
  ssl: isCockroach ? { rejectUnauthorized: true } : false,
};

const pool = new Pool(poolConfig);

async function wipe() {
    try {
        console.log('Starting full data wipe, preserving ONLY admin@placementiq.ai...');
        const adminEmail = 'admin@placementiq.ai';

        // 1. Fetch Firebase Users
        let nextPageToken;
        const allUsers = [];
        do {
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
            listUsersResult.users.forEach(u => allUsers.push(u));
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        const usersToDelete = allUsers.filter(u => u.email !== adminEmail);
        const uidsToDelete = usersToDelete.map(u => u.uid);

        // 2. Wipe Firestore collections entirely for user content
        const collections = ['roadmaps', 'benchmarks', 'resumes'];
        for (const col of collections) {
            const snapshot = await admin.firestore().collection(col).get();
            if (!snapshot.empty) {
                console.log(`Deleting ${snapshot.docs.length} docs from Firestore collection '${col}'...`);
                const batch = admin.firestore().batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        }

        // 3. Wipe non-admin profiles from Firestore
        if (uidsToDelete.length > 0) {
            console.log(`Deleting ${uidsToDelete.length} non-admin user profiles from Firestore...`);
            for (let i = 0; i < uidsToDelete.length; i += 100) {
                const chunk = uidsToDelete.slice(i, i + 100);
                const batch = admin.firestore().batch();
                chunk.forEach(uid => {
                    batch.delete(admin.firestore().collection('user_profiles').doc(uid));
                    batch.delete(admin.firestore().collection('users').doc(uid));
                });
                await batch.commit();
            }
            // Delete from Firebase Auth
            await admin.auth().deleteUsers(uidsToDelete);
            console.log(`Deleted ${uidsToDelete.length} users from Firebase Auth.`);
        }

        // 4. PostgreSQL Wipe
        // Use DELETE to prevent Serverless tier hanging on TRUNCATE CASCADE
        console.log('Deleting from CockroachDB...');
        const tables = ['roadmaps', 'benchmark_results', 'benchmark_sessions', 'resumes', 'rankings', 'projects'];
        for (const table of tables) {
            try {
                await pool.query(`DELETE FROM ${table} WHERE 1=1`);
                console.log(`Cleared ${table}`);
            } catch(e) {
                console.log(`Skipped clearing ${table}: ${e.message}`);
            }
        }

        console.log('Clearing students table except admin...');
        await pool.query(`DELETE FROM students WHERE email != $1`, [adminEmail]);
        console.log('Students table cleared.');
        
        console.log('Wipe complete. ONLY the admin account remains.');
        process.exit(0);
    } catch (err) {
        console.error('Error wiping data:', err);
        process.exit(1);
    }
}

wipe();
