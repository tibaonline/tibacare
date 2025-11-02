'use client';

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, query, orderBy, onSnapshot, updateDoc, doc, where, limit, getDocs } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase";

export default function Dashboard() {
  const [user] = useAuthState(auth);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "bookings"),
      orderBy("preferredTime", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, []);

  const startConsultation = async (bookingId) => {
    const bookingRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingRef, { status: "In Progress" });
  };

  const endConsultation = async (bookingId) => {
    const bookingRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingRef, { status: "Completed" });

    // Move next queued patient to Pending
    const nextPatientQuery = query(
      collection(db, "bookings"),
      where("status", "==", "Queued"),
      orderBy("preferredTime", "asc"),
      limit(1)
    );
    const snapshot = await getDocs(nextPatientQuery);
    snapshot.forEach(async (docSnap) => {
      await updateDoc(doc(db, "bookings", docSnap.id), { status: "Pending" });
    });
  };

  // Separate sections
  const current = bookings.find(b => b.status === "Pending" || b.status === "In Progress");
  const queue = bookings.filter(b => b.status === "Queued");
  const upcoming = bookings.filter(b => b.status !== "Queued" && b.status !== "Pending" && b.status !== "In Progress");

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6">
      <h2 className="text-2xl font-bold mb-6">Provider Dashboard — Today</h2>

      {/* Current */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Current</h3>
        {current ? (
          <div className="p-4 border rounded shadow-sm">
            <p><strong>Patient:</strong> {current.patientName}</p>
            <p><strong>Service:</strong> {current.service}</p>
            <p><strong>Time:</strong> {current.preferredTime}</p>
            <p><strong>Status:</strong> {current.status}</p>
            {current.status === "Pending" && (
              <button
                onClick={() => startConsultation(current.id)}
                className="mr-2 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                Start Consultation
              </button>
            )}
            {current.status === "In Progress" && (
              <button
                onClick={() => endConsultation(current.id)}
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                End Consultation
              </button>
            )}
          </div>
        ) : (
          <p>No current patient. When available, the earliest Pending will appear here.</p>
        )}
      </div>

      {/* Queue */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Queue ({queue.length})</h3>
        {queue.length > 0 ? (
          queue.map((b) => (
            <div key={b.id} className="p-4 mb-3 border rounded shadow-sm">
              <p><strong>Patient:</strong> {b.patientName}</p>
              <p><strong>Service:</strong> {b.service}</p>
              <p><strong>Time:</strong> {b.preferredTime}</p>
              <p><strong>Status:</strong> {b.status}</p>
            </div>
          ))
        ) : (
          <p>No one in queue.</p>
        )}
      </div>

      {/* Upcoming */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Upcoming</h3>
        {upcoming.length > 0 ? (
          upcoming.map((b) => (
            <div key={b.id} className="p-4 mb-3 border rounded shadow-sm">
              <p><strong>Patient:</strong> {b.patientName}</p>
              <p><strong>Service:</strong> {b.service}</p>
              <p><strong>Time:</strong> {b.preferredTime}</p>
              <p><strong>Status:</strong> {b.status}</p>
            </div>
          ))
        ) : (
          <p>No other bookings.</p>
        )}
      </div>

      {/* Debug */}
      <div>
        <h3 className="text-xl font-semibold mb-2">All (debug)</h3>
        {bookings.length > 0 ? (
          bookings.map((b) => (
            <div key={b.id} className="p-2 mb-1 border rounded">
              {b.patientName} — {b.service} — {b.status}
            </div>
          ))
        ) : (
          <p>No bookings found.</p>
        )}
      </div>
    </div>
  );
}
