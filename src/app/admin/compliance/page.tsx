'use client';

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase";
import toast from "react-hot-toast";

type Compliance = {
  id: string;
  userEmail: string;
  action: string;
  status: string;
  timestamp?: any;
};

export default function CompliancePage() {
  const [records, setRecords] = useState<Compliance[]>([]);
  const [action, setAction] = useState("");
  const [status, setStatus] = useState("pending");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAction, setEditingAction] = useState("");

  // Real-time listener
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "compliance"), (snapshot) => {
      const data: Compliance[] = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Compliance) }));
      setRecords(data);
    });
    return () => unsubscribe();
  }, []);

  // Add new compliance record
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action.trim()) return toast.error("Action description is required");
    setAdding(true);
    try {
      await addDoc(collection(db, "compliance"), {
        userEmail: "admin@example.com",
        action,
        status,
        timestamp: serverTimestamp(),
      });
      setAction("");
      setStatus("pending");
      toast.success("Compliance record added!");
    } catch (error) {
      console.error("Error adding record:", error);
      toast.error("Failed to add record");
    } finally {
      setAdding(false);
    }
  };

  // Delete record
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this compliance record?")) return;
    try {
      await deleteDoc(doc(db, "compliance", id));
      toast.success("Record deleted!");
    } catch (error) {
      console.error("Error deleting record:", error);
      toast.error("Failed to delete record");
    }
  };

  // Update status
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "compliance", id), { status: newStatus });
      toast.success("Status updated!");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  // Save edited action
  const handleSaveEdit = async (id: string) => {
    if (!editingAction.trim()) return toast.error("Action cannot be empty");
    try {
      await updateDoc(doc(db, "compliance", id), { action: editingAction });
      setEditingId(null);
      setEditingAction("");
      toast.success("Action updated!");
    } catch (error) {
      console.error("Error editing action:", error);
      toast.error("Failed to update action");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-600">Compliance Records</h1>

      {/* Add compliance */}
      <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-2 mb-4 flex-wrap">
        <input
          type="text"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Describe the action..."
          className="border px-3 py-2 rounded flex-1"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="reviewed">Reviewed</option>
        </select>
        <button
          type="submit"
          disabled={adding}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {adding ? "Adding..." : "Add Compliance"}
        </button>
      </form>

      {/* Records table */}
      <table className="w-full table-auto border-collapse bg-white rounded shadow">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left px-4 py-2">User Email</th>
            <th className="text-left px-4 py-2">Action</th>
            <th className="text-left px-4 py-2">Status</th>
            <th className="text-left px-4 py-2">Timestamp</th>
            <th className="text-left px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr><td colSpan={5} className="text-center p-4">No compliance records found.</td></tr>
          ) : (
            records.map((record) => (
              <tr key={record.id} className="border-t">
                <td className="px-4 py-2">{record.userEmail}</td>
                
                <td className="px-4 py-2">
                  {editingId === record.id ? (
                    <input
                      type="text"
                      value={editingAction}
                      onChange={(e) => setEditingAction(e.target.value)}
                      className="border px-2 py-1 rounded w-full"
                    />
                  ) : (
                    record.action
                  )}
                </td>

                <td className="px-4 py-2 capitalize">
                  <select
                    value={record.status}
                    onChange={(e) => handleStatusChange(record.id, e.target.value)}
                    className="border px-2 py-1 rounded"
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="reviewed">Reviewed</option>
                  </select>
                </td>

                <td className="px-4 py-2">{record.timestamp?.seconds ? new Date(record.timestamp.seconds * 1000).toLocaleString() : "-"}</td>

                <td className="px-4 py-2 flex gap-2">
                  {editingId === record.id ? (
                    <>
                      <button
                        className="text-green-600 hover:underline"
                        onClick={() => handleSaveEdit(record.id)}
                      >
                        Save
                      </button>
                      <button
                        className="text-gray-600 hover:underline"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => { setEditingId(record.id); setEditingAction(record.action); }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => handleDelete(record.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
