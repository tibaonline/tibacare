// test-firestore.js
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, connectFirestoreEmulator } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "test",
  authDomain: "localhost",
  projectId: "tibacare-1807d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connect to emulator
connectFirestoreEmulator(db, "localhost", 8080);

async function addTestData() {
  try {
    const docRef = await addDoc(collection(db, "patients"), {
      name: "John Doe",
      age: 30,
      condition: "Fever and cough",
      createdAt: new Date()
    });
    console.log("Document added with ID:", docRef.id);
  } catch (e) {
    console.error("Error adding document:", e);
  }
}

addTestData();
