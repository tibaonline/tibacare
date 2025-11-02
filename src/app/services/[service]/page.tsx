'use client';

import { useState } from "react";
import { db } from "@/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy } from "firebase/firestore";

export default function Booking({ params }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [message, setMessage] = useState("");

  const handleBooking = async () => {
    if (!name || !age || !preferredTime) {
      setMessage("Please fill all fields");
      return;
    }

    const providerId = "provider123"; // replace with dynamic provider logic
    const bookingsRef = collection(db, "bookings");

    // Check for existing bookings at the same time
    const q = query(
      bookingsRef,
      where("providerId", "==", providerId),
      where("preferredTime", "==", preferredTime)
    );

    const querySnapshot = await getDocs(q);
    let status = "Pending";
    if (!querySnapshot.empty) {
      status = "Queued";
    }

    await addDoc(bookingsRef, {
      patientName: name,
      age,
      service: params.service,
      preferredTime,
      status,
      providerId,
      createdAt: serverTimestamp(),
    });

    setMessage(
      status === "Pending"
        ? "Booking confirmed!"
        : "Booking added to queue. You will be notified when it's your turn."
    );

    setName("");
    setAge("");
    setPreferredTime("");
  };

  return (
    <div className="max-w-md mx-auto p-6 mt-10 bg-white shadow-md rounded">
      <h2 className="text-xl font-bold mb-4">Book {params.service} Consultation</h2>
      <input
        type="text"
        placeholder="Full Name"
        className="w-full p-2 mb-3 border rounded"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="number"
        placeholder="Age"
        className="w-full p-2 mb-3 border rounded"
        value={age}
        onChange={(e) => setAge(e.target.value)}
      />
      <input
        type="datetime-local"
        className="w-full p-2 mb-3 border rounded"
        value={preferredTime}
        onChange={(e) => setPreferredTime(e.target.value)}
      />
      <button
        onClick={handleBooking}
        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
      >
        Book Now
      </button>
      {message && <p className="mt-3">{message}</p>}
    </div>
  );
}
