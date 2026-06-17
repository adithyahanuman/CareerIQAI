const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

require('dotenv').config();
const { admin } = require('./src/config/firebase');
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

async function wipeEverythingExceptAdminAccount() {
    try {
        console.log('Starting full data wipe, preserving ONLY the admin login details...');
        const adminEmail = 'careeriqai.admin@gmail.com';

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
        console.log('Truncating PostgreSQL generated data tables...');
        // Omit projects and rankings in case they don't exist in the current schema
        const tablesToTry = ['roadmaps', 'benchmark_results', 'benchmark_sessions', 'resumes'];
        for (const table of tablesToTry) {
            try {
                await pool.query(`TRUNCATE TABLE ${table} CASCADE;`);
                console.log(`Truncated ${table}`);
            } catch (e) {
                console.log(`Skipped truncating ${table}: ${e.message}`);
            }
        }
        
        // Now delete all non-admin students
        console.log('Deleting non-admin users from PostgreSQL students table...');
        const adminUidObj = allUsers.find(u => u.email === adminEmail);
        if (adminUidObj) {
            await pool.query(`DELETE FROM students WHERE firebase_uid != $1`, [adminUidObj.uid]);
        } else {
            // In case admin is missing from firebase auth, just truncate everyone to be safe
            await pool.query(`TRUNCATE TABLE students CASCADE;`);
        }
        
        console.log('Wipe complete. ONLY the admin account remains, with NO generated data attached.');
        process.exit(0);
    } catch (err) {
        console.error('Error wiping data:', err);
        process.exit(1);
    }
}

wipeEverythingExceptAdminAccount();
