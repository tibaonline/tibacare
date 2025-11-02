'use client';

import React, { useEffect, useState } from "react";
import { db, auth } from "@/firebase";
import {
  collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc
} from "firebase/firestore";
import { jsPDF } from "jspdf";
import Link from "next/link";

interface Consultation {
  id: string;
  patientName?: string;
  providerName?: string;
  date?: string;
  preferredTime?: string;
  service?: string;
  summary?: string;
  status?: "Pending" | "In-Progress" | "Completed";
  files?: string[];
}

export default function ManageConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const user = auth.currentUser;
  const isAdmin = user?.email === "humphreykiboi1@gmail.com";

  useEffect(() => {
    const q = query(collection(db, "consultations"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setConsultations(snap.docs.map(d => ({ id: d.id, ...(d.data() as Consultation) })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = consultations.filter(c => {
    const term = search.toLowerCase();
    return (
      (c.patientName ?? "").toLowerCase().includes(term) ||
      (c.providerName ?? "").toLowerCase().includes(term) ||
      (c.service ?? "").toLowerCase().includes(term) ||
      (c.summary ?? "").toLowerCase().includes(term)
    );
  });

  const updateStatus = async (id: string, status: Consultation["status"]) => {
    if (!isAdmin) return;
    await updateDoc(doc(db, "consultations", id), { status });
  };

  const deleteConsultation = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm("Delete this consultation?")) return;
    await deleteDoc(doc(db, "consultations", id));
    alert("Deleted ✅");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Consultations Report", 14, 20);
    let y = 30;
    filtered.forEach((c, i) => {
      doc.setFontSize(12);
      doc.text(`${i+1}. Patient: ${c.patientName ?? "-"}`, 14, y);
      doc.text(`   Provider: ${c.providerName ?? "-"}`, 14, y + 6);
      doc.text(`   Service: ${c.service ?? "-"}`, 14, y + 12);
      doc.text(`   Date: ${c.date ?? "-"} ${c.preferredTime ?? ""}`, 14, y + 18);
      doc.text(`   Summary: ${c.summary ?? "-"}`, 14, y + 24);
      doc.text(`   Status: ${c.status ?? "Pending"}`, 14, y + 30);
      y += 42;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    doc.save(`consultations_${Date.now()}.pdf`);
  };

  if (loading) return <p className="p-6">Loading consultations...</p>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">Manage Consultations</h1>

      <div className="mb-4 flex justify-between items-center">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border px-3 py-2 rounded w-1/3"
        />
        <div className="space-x-2">
          <button onClick={exportPDF} className="bg-gray-200 px-3 py-2 rounded hover:bg-gray-300">
            Export PDF
          </button>
          {isAdmin && (
            <Link href="/manage/consultations/new" className="bg-blue-600 text-white px-4 py-2 rounded">
              + New Consultation
            </Link>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p>No consultations found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2">Patient</th>
                <th className="border px-4 py-2">Provider</th>
                <th className="border px-4 py-2">Service</th>
                <th className="border px-4 py-2">Date / Time</th>
                <th className="border px-4 py-2">Status</th>
                <th className="border px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className={`border-t hover:bg-gray-50 ${c.status==="Pending"?"bg-yellow-50":c.status==="In-Progress"?"bg-blue-50":"bg-green-50"}`}>
                  <td className="border px-4 py-2">{c.patientName ?? "-"}</td>
                  <td className="border px-4 py-2">{c.providerName ?? "-"}</td>
                  <td className="border px-4 py-2">{c.service ?? "-"}</td>
                  <td className="border px-4 py-2">{c.date ?? "-"} {c.preferredTime ?? ""}</td>
                  <td className="border px-4 py-2">
                    <span className="font-semibold">{c.status ?? "Pending"}</span>
                    {isAdmin && (
                      <div className="mt-1 space-x-1">
                        {["Pending","In-Progress","Completed"].map(s => (
                          <button
                            key={s}
                            onClick={() => updateStatus(c.id, s as Consultation["status"])}
                            className="px-2 py-1 text-xs rounded border hover:bg-gray-100"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="border px-4 py-2 space-x-3">
                    <Link href={`/manage/consultations/${c.id}`} className="text-blue-600 hover:underline">View</Link>
                    {isAdmin && <>
                      <Link href={`/manage/consultations/${c.id}/edit`} className="text-green-600 hover:underline">Edit</Link>
                      <button onClick={() => deleteConsultation(c.id)} className="text-red-600 hover:underline">Delete</button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
