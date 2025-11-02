'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/firebase";
import { addDoc, collection, Timestamp } from "firebase/firestore";

export default function NewConsultationPage() {
  const router = useRouter();

  const user = auth.currentUser;
  const isAdmin = user?.email === "humphreykiboi1@gmail.com";

  const [patientName, setPatientName] = useState("");
  const [providerName, setProviderName] = useState("");
  const [date, setDate] = useState("");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      alert("❌ Only admin can add consultations");
      return;
    }

    try {
      await addDoc(collection(db, "consultations"), {
        patientName,
        providerName,
        date,
        summary,
        notes,
        createdAt: Timestamp.now(),
      });
      alert("✅ Consultation created");
      router.push("/manage/consultations");
    } catch {
      alert("❌ Failed to create consultation");
    }
  }

  if (!isAdmin) return <p>❌ Only admin can add consultations</p>;

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold mb-4 text-blue-700">New Consultation</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-semibold">Patient Name</label>
          <input
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block font-semibold">Provider Name</label>
          <input
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block font-semibold">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block font-semibold">Summary</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block font-semibold">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Save Consultation
        </button>
      </form>
    </div>
  );
}
