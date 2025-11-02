'use client';

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { db, auth } from "@/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import jsPDF from "jspdf";
import Papa from "papaparse";

interface Client {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
}

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });

  const user = auth.currentUser;
  const isAdmin = user?.email === "humphreykiboi1@gmail.com"; // ✅ admin only

  useEffect(() => {
    async function fetchData() {
      try {
        if (!id) {
          setError("Invalid client ID");
          setLoading(false);
          return;
        }

        const ref = doc(db, "clients", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const clientData = { id: snap.id, ...snap.data() } as Client;
          setClient(clientData);
          setForm({
            fullName: clientData.fullName,
            email: clientData.email,
            phone: clientData.phone ?? "",
          });
        } else {
          setError("Client not found");
        }
      } catch {
        setError("❌ Failed to load client data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  async function handleSave() {
    if (!client) return;
    try {
      await updateDoc(doc(db, "clients", client.id), form);
      setClient({ ...client, ...form });
      setEditing(false);
      alert("✅ Client updated successfully");
    } catch {
      alert("❌ Failed to update client");
    }
  }

  async function handleDelete() {
    if (!client) return;
    if (!isAdmin) {
      alert("❌ Only admin can delete clients");
      return;
    }
    if (!confirm("⚠️ Are you sure you want to delete this client AND all their related data?")) return;

    try {
      const batch = writeBatch(db);

      // delete client
      batch.delete(doc(db, "clients", client.id));

      // delete related appointments
      const appointments = await getDocs(
        query(collection(db, "appointments"), where("clientId", "==", client.id))
      );
      appointments.forEach((a) => batch.delete(a.ref));

      // delete related messages
      const messages = await getDocs(
        query(collection(db, "messages"), where("participants", "array-contains", client.email))
      );
      messages.forEach((m) => batch.delete(m.ref));

      // delete related notifications
      const notifications = await getDocs(
        query(collection(db, "notifications"), where("recipient", "==", client.email))
      );
      notifications.forEach((n) => batch.delete(n.ref));

      await batch.commit();
      alert("✅ Client and related data deleted successfully.");
      router.push("/manage/clients");
    } catch {
      alert("❌ Failed to delete client and related data");
    }
  }

  // ✅ Export as PDF
  function exportPDF() {
    if (!client) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Client Profile", 10, 10);

    doc.setFontSize(12);
    doc.text(`Full Name: ${client.fullName}`, 10, 30);
    doc.text(`Email: ${client.email}`, 10, 40);
    doc.text(`Phone: ${client.phone ?? "-"}`, 10, 50);

    doc.save(`${client.fullName}_Profile.pdf`);
  }

  // ✅ Export as CSV
  function exportCSV() {
    if (!client) return;
    const csv = Papa.unparse([client]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${client.fullName}_Profile.csv`;
    link.click();
  }

  if (loading) return <p>Loading client details...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!client) return <p>No client data available.</p>;

  return (
    <div className="p-6">
      <Link
        href="/manage/clients"
        className="text-blue-600 hover:underline mb-4 inline-block"
      >
        ← Back to Clients
      </Link>

      <h1 className="text-3xl font-bold text-blue-700 mb-4">Client Profile</h1>

      <div className="bg-white p-6 rounded shadow max-w-lg">
        {editing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="border px-3 py-2 w-full rounded"
              placeholder="Full Name"
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border px-3 py-2 w-full rounded"
              placeholder="Email"
            />
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="border px-3 py-2 w-full rounded"
              placeholder="Phone"
            />
            <div className="space-x-2">
              <button
                onClick={handleSave}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-2"><span className="font-semibold">Full Name:</span> {client.fullName}</p>
            <p className="mb-2"><span className="font-semibold">Email:</span> {client.email}</p>
            <p className="mb-2"><span className="font-semibold">Phone:</span> {client.phone ?? "-"}</p>

            <div className="space-x-2 mt-4">
              <button
                onClick={() => setEditing(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Edit
              </button>
              {isAdmin && (
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  Delete
                </button>
              )}
              <button
                onClick={exportPDF}
                className="bg-purple-600 text-white px-4 py-2 rounded"
              >
                Export PDF
              </button>
              <button
                onClick={exportCSV}
                className="bg-teal-600 text-white px-4 py-2 rounded"
              >
                Export CSV
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
