import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Assign role on user creation
export const setUserRole = functions.auth.user().onCreate(async (user) => {
  const email = user.email;
  let role = "patient"; // default role

  if (email === "humphreykiboi1@gmail.com") {
    role = "admin";
  } else if (email === "andersonwoods254@gmail.com") {
    role = "provider";
  }

  await admin.firestore().collection("users").doc(user.uid).set({
    uid: user.uid,
    email: user.email,
    name: user.displayName || "",
    role: role,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Role '${role}' assigned to user: ${email}`);
});
