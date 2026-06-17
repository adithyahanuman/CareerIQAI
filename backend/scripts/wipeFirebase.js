require('dotenv').config();
const { admin } = require('./src/config/firebase');

async function wipeFirebase() {
  try {
    // 1. Wipe Firestore user_profiles
    const profilesSnapshot = await admin.firestore().collection('user_profiles').get();
    const batch = admin.firestore().batch();
    profilesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`Deleted ${profilesSnapshot.docs.length} Firestore user_profiles.`);

    // 2. Wipe Firebase Auth Users
    let nextPageToken;
    let totalDeleted = 0;
    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      const uids = listUsersResult.users.map(user => user.uid);
      if (uids.length > 0) {
        await admin.auth().deleteUsers(uids);
        totalDeleted += uids.length;
      }
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    
    console.log(`Deleted ${totalDeleted} Firebase Auth users.`);
    process.exit(0);
  } catch (err) {
    console.error('Error wiping Firebase:', err);
    process.exit(1);
  }
}

wipeFirebase();
