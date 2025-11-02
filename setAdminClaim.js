// setAdminClaim.js
import admin from "firebase-admin";

// Initialize with service account
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const uid = "2E5UjoYcx7PDXJ2Qwgr2s9xgrEI2"; // <-- your Firebase UID

async function setAdmin() {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`✅ Admin claim set for UID: ${uid}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error setting admin claim:", err);
    process.exit(1);
  }
}

setAdmin();
