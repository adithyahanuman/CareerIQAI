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

async function wipeAllData() {
    try {
        console.log('Starting full data wipe...');
        // ONLY KEEP THE OFFICIAL ADMIN
        const keepEmails = ['careeriqai.admin@gmail.com'];

        // 1. Get Firebase Users
        console.log('Fetching Firebase Auth Users...');
        let nextPageToken;
        const allUsers = [];
        do {
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
            listUsersResult.users.forEach(u => allUsers.push(u));
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        const usersToDelete = allUsers.filter(u => !keepEmails.includes(u.email));
        const uidsToDelete = usersToDelete.map(u => u.uid);

        // 2. Wipe Firestore Data for those UIDs
        if (uidsToDelete.length > 0) {
            console.log(`Deleting ${uidsToDelete.length} users from Firestore...`);
            // Commit in chunks of 500 (Firestore limit)
            for (let i = 0; i < uidsToDelete.length; i += 100) {
                const chunk = uidsToDelete.slice(i, i + 100);
                const chunkBatch = admin.firestore().batch();
                chunk.forEach(uid => {
                    chunkBatch.delete(admin.firestore().collection('user_profiles').doc(uid));
                    chunkBatch.delete(admin.firestore().collection('users').doc(uid));
                    chunkBatch.delete(admin.firestore().collection('resumes').doc(uid));
                    chunkBatch.delete(admin.firestore().collection('roadmaps').doc(uid));
                    chunkBatch.delete(admin.firestore().collection('benchmarks').doc(uid));
                });
                await chunkBatch.commit();
            }
        }

        // 3. Delete from Firebase Auth
        if (uidsToDelete.length > 0) {
            await admin.auth().deleteUsers(uidsToDelete);
            console.log(`Deleted ${uidsToDelete.length} users from Firebase Auth.`);
        } else {
            console.log('No users to delete in Firebase Auth.');
        }

        // 4. Delete from PostgreSQL
        console.log('Deleting from PostgreSQL (keeping admins)...');
        
        // Find UIDs to keep
        const keepUids = allUsers.filter(u => keepEmails.includes(u.email)).map(u => u.uid);
        
        if (keepUids.length === 0) {
            // Truncate all if no one to keep
            await pool.query('TRUNCATE TABLE roadmaps, benchmark_results, benchmark_sessions, projects, rankings, resumes, students CASCADE;');
        } else {
            // Delete those who are not in keepUids. CASCADE handles the rest.
            const uidsList = keepUids.map(id => `'${id}'`).join(',');
            await pool.query(`DELETE FROM students WHERE firebase_uid NOT IN (${uidsList})`);
        }
        
        console.log('PostgreSQL wipe complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error wiping data:', err);
        process.exit(1);
    }
}

wipeAllData();
