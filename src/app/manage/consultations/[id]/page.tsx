'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "@/firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";

interface Consultation {
  id: string;
  patientName?: string;
  providerName?: string;
  date?: string;
  summary?: string;
}

export default function ConsultationDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);

  const user = auth.currentUser;
  const isAdmin = user?.email === "humphreykiboi1@gmail.com";

  useEffect(() => {
    async function fetchConsultation() {
      if (!id) return;
      try {
        const ref = doc(db, "consultations", id as string);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setConsultation({ id: snap.id, ...(snap.data() as Consultation) });
        } else {
          setConsultation(null);
        }
      } catch (e) {
        console.error("Failed to fetch consultation", e);
      } finally {
        setLoading(false);
      }
    }
    fetchConsultation();
  }, [id]);

  async function handleDelete() {
    if (!id || !isAdmin) return;
    if (!confirm("Are you sure you want to delete this consultation?")) return;
    try {
      await deleteDoc(doc(db, "consultations", id as string));
      alert("Consultation deleted");
      router.push("/manage/consultations");
    } catch (e) {
      console.error("Failed to delete consultation", e);
      alert("Failed to delete consultation");
    }
  }

  if (loading) return <p>Loading consultation details...</p>;
  if (!consultation) return <p>Consultation not found.</p>;

  return (
    <div className="p-6">
      <button
        onClick={() => router.back()}
        className="mb-4 text-blue-600 hover:underline"
      >
        ← Back
      </button>

      <div className="bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-4 text-blue-700">
          Consultation Details
        </h1>
        <p><strong>Patient:</strong> {consultation.patientName ?? "-"}</p>
        <p><strong>Provider:</strong> {consultation.providerName ?? "-"}</p>
        <p><strong>Date:</strong> {consultation.date ?? "-"}</p>
        <p><strong>Summary:</strong> {consultation.summary ?? "-"}</p>

        {isAdmin && (
          <div className="mt-6 flex space-x-4">
            <button
              onClick={() =>
                router.push(`/manage/consultations/${consultation.id}/edit`)
              }
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
