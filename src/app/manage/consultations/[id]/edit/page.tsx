'use client';

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function EditConsultationPage() {
  const { id } = useParams();
  const router = useRouter();

  const user = auth.currentUser;
  const isAdmin = user?.email === "humphreykiboi1@gmail.com";

  const [patientName, setPatientName] = useState("");
  const [providerName, setProviderName] = useState("");
  const [date, setDate] = useState("");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return; // prevent non-admin access
    async function fetchConsultation() {
      if (!id) return;
      const ref = doc(db, "consultations", id as string);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setPatientName(data.patientName || "");
        setProviderName(data.providerName || "");
        setDate(data.date || "");
        setSummary(data.summary || "");
        setNotes(data.notes || "");
      }
      setLoading(false);
    }
    fetchConsultation();
  }, [id, isAdmin]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !isAdmin) return;
    try {
      await updateDoc(doc(db, "consultations", id as string), {
        patientName,
        providerName,
        date,
        summary,
        notes,
      });
      alert("✅ Consultation updated successfully");
      router.push(`/manage/consultations/${id}`);
    } catch {
      alert("❌ Failed to update consultation");
    }
  }

  if (!isAdmin) return <p>❌ Only admin can edit consultations</p>;
  if (loading) return <p>Loading consultation...</p>;

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold mb-4 text-blue-700">Edit Consultation</h1>
      <form onSubmit={handleUpdate} className="space-y-4">
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
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Update Consultation
        </button>
      </form>
    </div>
  );
}
