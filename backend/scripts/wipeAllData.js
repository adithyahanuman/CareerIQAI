const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { admin, db } = require('../src/config/firebase');

async function wipeAllData() {
  try {
    console.log('Starting full Firebase data wipe (Keeping admin account)...');
    const keepEmails = ['careeriqai.admin@gmail.com'];

    // 1. Wipe Firebase Auth Users except Admin
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

    if (uidsToDelete.length > 0) {
        await admin.auth().deleteUsers(uidsToDelete);
        console.log(`Deleted ${uidsToDelete.length} users from Firebase Auth.`);
    } else {
        console.log('No users to delete in Firebase Auth.');
    }

    // 2. Wipe Firestore Collections
    // Note: Firestore doesn't have a "truncate" command. We must query and delete all documents in each collection.
    const collectionsToWipe = [
      'students', 'resumes', 'benchmark_sessions', 'benchmark_results',
      'roadmaps', 'rankings', 'projects', 'user_profiles', 'users'
    ];
    
    // Add dynamic role tables
    const rolePrefix = 'role_';
    const collections = await db.listCollections();
    collections.forEach(col => {
      if (col.id.startsWith(rolePrefix) && !collectionsToWipe.includes(col.id)) {
        collectionsToWipe.push(col.id);
      }
    });

    console.log(`Wiping Firestore collections: ${collectionsToWipe.join(', ')}`);

    for (const collectionName of collectionsToWipe) {
      const snapshot = await db.collection(collectionName).get();
      if (snapshot.empty) continue;

      let batch = db.batch();
      let count = 0;
      
      snapshot.docs.forEach((doc) => {
        // If collection is users/students/user_profiles, don't delete the admin
        if (['users', 'students', 'user_profiles'].includes(collectionName)) {
           const isAdmin = allUsers.some(u => keepEmails.includes(u.email) && u.uid === doc.id);
           if (isAdmin) return;
        }

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

    console.log('Firebase wipe complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error wiping data:', err);
    process.exit(1);
  }
}

wipeAllData();
