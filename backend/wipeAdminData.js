require('dotenv').config();
const { admin } = require('./src/config/firebase');
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function wipeAdminData() {
    try {
        console.log('Wiping all generated data (resumes, roadmaps, benchmarks) for all users, including admins...');
        
        // 1. Wipe Firestore collections: resumes, roadmaps, benchmarks
        const collections = ['roadmaps', 'benchmarks', 'resumes'];
        for (const col of collections) {
            const snapshot = await admin.firestore().collection(col).get();
            if (!snapshot.empty) {
                console.log(`Deleting ${snapshot.docs.length} docs from Firestore collection '${col}'...`);
                const batch = admin.firestore().batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            } else {
                console.log(`No docs found in Firestore collection '${col}'.`);
            }
        }

        // 2. Wipe PostgreSQL tables (without deleting the student accounts)
        console.log('Deleting records from PostgreSQL tables...');
        await pool.query('TRUNCATE TABLE roadmaps, benchmark_results, benchmark_sessions, projects, rankings, resumes CASCADE;');
        
        console.log('Successfully wiped all generated data while preserving user accounts.');
        process.exit(0);
    } catch (err) {
        console.error('Error wiping data:', err);
        process.exit(1);
    }
}

wipeAdminData();
