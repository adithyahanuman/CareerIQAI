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

async function wipeResumes() {
    try {
        console.log('Wiping all resume data...');
        
        // 1. Wipe Firestore 'resumes' collection completely
        const resumesSnapshot = await admin.firestore().collection('resumes').get();
        if (!resumesSnapshot.empty) {
            console.log(`Deleting ${resumesSnapshot.docs.length} resumes from Firestore...`);
            const batch = admin.firestore().batch();
            resumesSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        } else {
            console.log('No resumes found in Firestore.');
        }

        // 2. Wipe PostgreSQL 'resumes' table completely
        console.log('Truncating resumes table in PostgreSQL (cascades to projects)...');
        await pool.query('TRUNCATE TABLE resumes CASCADE;');
        
        console.log('Resume data wiped successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error wiping resumes:', err);
        process.exit(1);
    }
}

wipeResumes();
