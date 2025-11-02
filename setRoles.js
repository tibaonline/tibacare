const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const users = [
  { uid: '2E5UjoYcx7PDXJ2Qwgr2s9xgrEI2', role: 'admin' },   // admin
  { uid: 'PROVIDER_UID_1', role: 'provider' }              // provider
];

users.forEach(({ uid, role }) => {
  admin.auth().setCustomUserClaims(uid, { role })
    .then(() => console.log(`✅ Role '${role}' set for UID: ${uid}`))
    .catch(err => console.error(err));
});
