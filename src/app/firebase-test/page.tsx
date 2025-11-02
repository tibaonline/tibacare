"use client";
import { useEffect } from "react";
import { db } from "../../firebase"; // Adjust if firebase config is in another location
import { doc, setDoc } from "firebase/firestore";

export default function FirebaseTestPage() {
  useEffect(() => {
    const testWrite = async () => {
      try {
        await setDoc(doc(db, "testCollection", "testDoc"), {
          message: "Hello from Firestore!",
          timestamp: new Date().toISOString(),
        });
        console.log("✅ Test document written successfully!");
      } catch (error) {
        console.error("❌ Error writing test document:", error);
      }
    };
    testWrite();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Firestore Test</h1>
      <p>Check your Firestore database for a document in "testCollection".</p>
    </div>
  );
}
