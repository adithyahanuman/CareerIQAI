require('dotenv').config();
const { admin } = require('../src/config/firebase');async function provisionAdmin() {
  const email = 'careeriqai.admin@gmail.com';
  const password = 'admin@careeriqai';
  const name = 'Admin User';

  try {
    let userRecord;
    try {
      // Check if user already exists
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('User already exists in Firebase Auth. Updating password...');
      await admin.auth().updateUser(userRecord.uid, { password });
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        console.log('Creating new user in Firebase Auth...');
        userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: name,
          emailVerified: true
        });
      } else {
        throw err;
      }
    }

    const uid = userRecord.uid;
    console.log(`User UID: ${uid}`);

    // Set super_admin role in Firestore
    console.log('Setting super_admin role in Firestore...');
    await admin.firestore().collection('users').doc(uid).set({
      email,
      name,
      role: 'super_admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('Admin account provisioned successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error provisioning admin:', err);
    process.exit(1);
  }
}

provisionAdmin();
