'use client';

import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc
} from "firebase/firestore";
import { db } from "@/firebase";
import toast from "react-hot-toast";

type LogEntry = {
  id: string;
  userEmail: string;
  action: string;
  timestamp?: any;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [action, setAction] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAction, setEditingAction] = useState("");

  // Real-time listener
  useEffect(() => {
    const q = query(collection(db, "logs"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as LogEntry) }));
      setLogs(data);
    });
    return () => unsubscribe();
  }, []);

  // Add new log
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action.trim()) return toast.error("Action description is required");
    setAdding(true);
    try {
      await addDoc(collection(db, "logs"), {
        userEmail: "admin@example.com", // Replace with logged-in admin email
        action,
        timestamp: serverTimestamp(),
      });
      setAction("");
      toast.success("Log added!");
    } catch (error) {
      console.error("Error adding log:", error);
      toast.error("Failed to add log");
    } finally {
      setAdding(false);
    }
  };

  // Delete log
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this log?")) return;
    try {
      await deleteDoc(doc(db, "logs", id));
      toast.success("Log deleted!");
    } catch (error) {
      console.error("Error deleting log:", error);
      toast.error("Failed to delete log");
    }
  };

  // Save edited action
  const handleSaveEdit = async (id: string) => {
    if (!editingAction.trim()) return toast.error("Action cannot be empty");
    try {
      await updateDoc(doc(db, "logs", id), { action: editingAction });
      setEditingId(null);
      setEditingAction("");
      toast.success("Log updated!");
    } catch (error) {
      console.error("Error updating log:", error);
      toast.error("Failed to update log");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-600">Logs</h1>

      <form onSubmit={handleAdd} className="flex flex-col gap-3">
        <textarea
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="border p-3 rounded w-full h-24"
          placeholder="Describe the action..."
        />
        <button
          type="submit"
          disabled={adding}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {adding ? "Adding..." : "Add Log Entry"}
        </button>
      </form>

      <ul className="list-none p-0 max-h-[400px] overflow-y-auto bg-white p-4 rounded shadow space-y-3">
        {logs.length === 0 ? (
          <p className="text-gray-500">No logs found.</p>
        ) : (
          logs.map(({ id, userEmail, action: logAction, timestamp }) => (
            <li key={id} className="border-b pb-2 flex justify-between items-start">
              <div className="flex-1">
                <p>
                  <strong>{userEmail}</strong>{" "}
                  <em className="text-gray-500">
                    {timestamp?.seconds ? new Date(timestamp.seconds * 1000).toLocaleString() : "No timestamp"}
                  </em>
                </p>
                {editingId === id ? (
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={editingAction}
                      onChange={(e) => setEditingAction(e.target.value)}
                      className="border px-2 py-1 rounded flex-1"
                    />
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
                ) : (
                  <p className="mt-1">{logAction}</p>
                )}
              </div>
              {editingId !== id && (
                <div className="flex flex-col gap-1 ml-4">
                  <button
                    onClick={() => { setEditingId(id); setEditingAction(logAction); }}
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
          ))
        )}
      </ul>
    </div>
  );
}
