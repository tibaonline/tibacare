'use client';

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "@/firebase";
import toast from "react-hot-toast";

type BillingEntry = {
  id: string;
  userEmail: string;
  description: string;
  amount: number;
  timestamp?: any;
};

export default function BillingPage() {
  const [billingEntries, setBillingEntries] = useState<BillingEntry[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState("");
  const [editingAmount, setEditingAmount] = useState<number | "">("");

  // Real-time listener
  useEffect(() => {
    const q = query(collection(db, "billing"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: BillingEntry[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as BillingEntry)
      }));
      setBillingEntries(data);
    });
    return () => unsubscribe();
  }, []);

  // Add new billing entry
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return toast.error("Description and amount required");
    setSending(true);
    try {
      await addDoc(collection(db, "billing"), {
        userEmail: "admin@example.com", // Replace with logged-in user
        description,
        amount: Number(amount),
        timestamp: serverTimestamp()
      });
      setDescription("");
      setAmount("");
      toast.success("Billing entry added!");
    } catch (error) {
      console.error("Error adding billing entry:", error);
      toast.error("Failed to add billing entry");
    } finally {
      setSending(false);
    }
  };

  // Delete billing entry
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this billing entry?")) return;
    try {
      await deleteDoc(doc(db, "billing", id));
      toast.success("Billing entry deleted!");
    } catch (error) {
      console.error("Error deleting billing entry:", error);
      toast.error("Failed to delete billing entry");
    }
  };

  // Save edited billing
  const handleSaveEdit = async (id: string) => {
    if (!editingDescription.trim() || !editingAmount) return toast.error("Description and amount required");
    try {
      await updateDoc(doc(db, "billing", id), {
        description: editingDescription,
        amount: Number(editingAmount)
      });
      setEditingId(null);
      setEditingDescription("");
      setEditingAmount("");
      toast.success("Billing entry updated!");
    } catch (error) {
      console.error("Error updating billing entry:", error);
      toast.error("Failed to update billing entry");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-600">Billing</h1>

      {/* Add Billing Entry */}
      <form onSubmit={handleAdd} className="flex flex-col gap-3">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border p-3 rounded w-full"
          placeholder="Describe the billing action..."
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="border p-3 rounded w-full"
          placeholder="Amount in Ksh"
        />
        <button
          type="submit"
          disabled={sending}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? "Adding..." : "Add Billing Entry"}
        </button>
      </form>

      {/* Billing list */}
      <ul className="list-none p-0 max-h-[400px] overflow-y-auto bg-white p-4 rounded shadow space-y-3">
        {billingEntries.length === 0 ? (
          <p className="text-gray-500">No billing entries found.</p>
        ) : (
          billingEntries.map(({ id, userEmail, description: desc, amount: amt, timestamp }) => (
            <li key={id} className="border-b pb-2 flex justify-between items-start">
              <div className="flex-1">
                <p>
                  <strong>{userEmail}</strong>{" "}
                  <em className="text-gray-500">
                    {timestamp?.seconds ? new Date(timestamp.seconds * 1000).toLocaleString() : "No timestamp"}
                  </em>
                </p>
                {editingId === id ? (
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <input
                      type="text"
                      value={editingDescription}
                      onChange={(e) => setEditingDescription(e.target.value)}
                      className="border px-2 py-1 rounded flex-1"
                    />
                    <input
                      type="number"
                      value={editingAmount}
                      onChange={(e) => setEditingAmount(Number(e.target.value))}
                      className="border px-2 py-1 rounded w-24"
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
                  <p className="mt-1">{desc} - Ksh {amt.toLocaleString()}</p>
                )}
              </div>

              {editingId !== id && (
                <div className="flex flex-col gap-1 ml-4">
                  <button
                    onClick={() => { setEditingId(id); setEditingDescription(desc); setEditingAmount(amt); }}
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
