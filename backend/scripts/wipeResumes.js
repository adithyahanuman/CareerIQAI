const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { admin, db } = require('../src/config/firebase');

async function wipeResumes() {
  try {
    console.log('Starting Firestore resumes wipe...');

    const collectionsToWipe = ['resumes', 'benchmark_sessions', 'benchmark_results'];
    
    for (const collectionName of collectionsToWipe) {
      const snapshot = await db.collection(collectionName).get();
      if (snapshot.empty) continue;

      let batch = db.batch();
      let count = 0;
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
        
        if (count % 500 === 0) {
          batch.commit();
          batch = db.batch();
        }
      });
      
      if (count % 500 !== 0) {
        await batch.commit();
      }
      console.log(` - Deleted ${count} documents from ${collectionName}`);
    }

    // Optionally reset fields on students if necessary, but just deleting resumes is usually enough
    console.log('Resumes wipe complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error wiping resumes:', err);
    process.exit(1);
  }
}

wipeResumes();
