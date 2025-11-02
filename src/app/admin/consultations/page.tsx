'use client';

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "@/firebase";
import toast from "react-hot-toast";

type Consultation = {
  id: string;
  patientName: string;
  providerName: string;
  date: string;
  notes: string;
};

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    patientName: "",
    providerName: "",
    date: "",
    notes: ""
  });
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    patientName: "",
    providerName: "",
    date: "",
    notes: ""
  });

  // Real-time listener
  useEffect(() => {
    const q = query(collection(db, "consultations"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Consultation[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Consultation)
      }));
      setConsultations(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Add consultation
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName || !formData.providerName || !formData.date) {
      toast.error("Patient name, provider name, and date are required.");
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(db, "consultations"), {
        ...formData,
        timestamp: serverTimestamp()
      });
      toast.success("Consultation added!");
      setFormData({ patientName: "", providerName: "", date: "", notes: "" });
    } catch (error) {
      console.error("Error adding consultation:", error);
      toast.error("Failed to add consultation");
    } finally {
      setSending(false);
    }
  };

  // Delete consultation
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this consultation?")) return;
    try {
      await deleteDoc(doc(db, "consultations", id));
      toast.success("Consultation deleted!");
    } catch (error) {
      console.error("Error deleting consultation:", error);
      toast.error("Failed to delete consultation");
    }
  };

  // Save edit
  const handleSaveEdit = async (id: string) => {
    if (!editData.patientName || !editData.providerName || !editData.date) {
      toast.error("Patient name, provider name, and date are required.");
      return;
    }
    try {
      await updateDoc(doc(db, "consultations", id), editData);
      setEditingId(null);
      toast.success("Consultation updated!");
    } catch (error) {
      console.error("Error updating consultation:", error);
      toast.error("Failed to update consultation");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-600">Consultations</h1>

      {/* Add consultation */}
      <form onSubmit={handleAdd} className="flex flex-col gap-3 bg-white p-4 rounded shadow">
        <input
          type="text"
          placeholder="Patient Name"
          value={formData.patientName}
          onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
          className="border p-2 rounded w-full"
        />
        <input
          type="text"
          placeholder="Provider Name"
          value={formData.providerName}
          onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
          className="border p-2 rounded w-full"
        />
        <input
          type="datetime-local"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="border p-2 rounded w-full"
        />
        <textarea
          placeholder="Notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="border p-2 rounded w-full"
        />
        <button
          type="submit"
          disabled={sending}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? "Adding..." : "Add Consultation"}
        </button>
      </form>

      {/* Consultation list */}
      {loading ? (
        <p>Loading consultations...</p>
      ) : consultations.length === 0 ? (
        <p className="text-gray-500">No consultations found.</p>
      ) : (
        <ul className="list-none p-0 max-h-[500px] overflow-y-auto bg-white p-4 rounded shadow space-y-3">
          {consultations.map(({ id, patientName, providerName, date, notes }) => (
            <li key={id} className="border-b pb-2 flex justify-between items-start">
              <div className="flex-1">
                {editingId === id ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={editData.patientName}
                      onChange={(e) => setEditData({ ...editData, patientName: e.target.value })}
                      className="border p-2 rounded w-full"
                    />
                    <input
                      type="text"
                      value={editData.providerName}
                      onChange={(e) => setEditData({ ...editData, providerName: e.target.value })}
                      className="border p-2 rounded w-full"
                    />
                    <input
                      type="datetime-local"
                      value={editData.date}
                      onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                      className="border p-2 rounded w-full"
                    />
                    <textarea
                      value={editData.notes}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      className="border p-2 rounded w-full"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(id)}
                        className="text-green-600 hover:underline"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-600 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p>
                      <strong>{patientName}</strong> with <em>{providerName}</em> on {new Date(date).toLocaleString()}
                    </p>
                    <p>Notes: {notes}</p>
                  </>
                )}
              </div>
              {editingId !== id && (
                <div className="flex flex-col gap-1 ml-4">
                  <button
                    onClick={() => { setEditingId(id); setEditData({ patientName, providerName, date, notes }); }}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
