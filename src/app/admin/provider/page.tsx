'use client';

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { db, auth } from "@/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import toast from "react-hot-toast";

type Provider = {
  id: string;
  name: string;
  email: string;
  specialty: string;
  active: boolean;
};

export default function ProviderPanelPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("");
  const [viewProvider, setViewProvider] = useState<Provider | null>(null); // For modal
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addSpecialty, setAddSpecialty] = useState("General");

  // Fetch providers
  useEffect(() => {
    const providersRef = collection(db, "users");
    const q = query(providersRef, where("role", "==", "provider"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Provider[] = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || "N/A",
        email: doc.data().email || "N/A",
        specialty: doc.data().specialty || "General",
        active: doc.data().active ?? true
      }));
      setProviders(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Toggle active status
  const toggleActive = async (id: string, current: boolean) => {
    await updateDoc(doc(db, "users", id), { active: !current });
  };

  // Delete provider
  const deleteProvider = async (id: string) => {
    if (confirm("Are you sure you want to delete this provider?")) {
      await deleteDoc(doc(db, "users", id));
      toast.success("Provider deleted");
    }
  };

  // Start editing
  const startEdit = (provider: Provider) => {
    setEditingId(provider.id);
    setNewName(provider.name);
    setNewEmail(provider.email);
    setNewSpecialty(provider.specialty);
  };

  // Save edits
  const saveEdit = async (id: string) => {
    await updateDoc(doc(db, "users", id), {
      name: newName,
      email: newEmail,
      specialty: newSpecialty
    });
    setEditingId(null);
    toast.success("Provider updated");
  };

  // Add new provider
  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail || !addName) return toast.error("Name and Email are required");

    try {
      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, addEmail, "DefaultPassword123!");
      const uid = userCredential.user.uid;

      // Save provider in Firestore
      const docRef = await addDoc(collection(db, "users"), {
        uid,
        name: addName,
        email: addEmail,
        specialty: addSpecialty,
        role: "provider",
        active: true
      });

      toast.success("Provider added successfully");
      setShowAddForm(false);
      setAddName("");
      setAddEmail("");
      setAddSpecialty("General");
    } catch (error: any) {
      console.error(error);
      if (error.code === "auth/email-already-in-use") {
        toast.error("Email already exists");
      } else {
        toast.error("Failed to add provider");
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">Provider Panel</h1>
        <button
          onClick={() => setShowAddForm(prev => !prev)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          {showAddForm ? "Cancel" : "Add Provider"}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddProvider} className="bg-white p-4 rounded shadow-md flex gap-4 flex-wrap items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input type="text" value={addName} onChange={e => setAddName(e.target.value)} required className="border p-2 rounded w-64" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)} required className="border p-2 rounded w-64" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Specialty</label>
            <input type="text" value={addSpecialty} onChange={e => setAddSpecialty(e.target.value)} className="border p-2 rounded w-48" />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">Add</button>
        </form>
      )}

      {loading ? (
        <p>Loading providers...</p>
      ) : providers.length === 0 ? (
        <p>No providers found.</p>
      ) : (
        <table className="w-full table-auto border-collapse bg-white rounded shadow">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Specialty</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {providers.map(provider => (
              <tr key={provider.id} className="border-t">
                <td className="px-4 py-2">
                  {editingId === provider.id ? (
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="border px-2 py-1 rounded w-full" />
                  ) : provider.name}
                </td>
                <td className="px-4 py-2">
                  {editingId === provider.id ? (
                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="border px-2 py-1 rounded w-full" />
                  ) : provider.email}
                </td>
                <td className="px-4 py-2">
                  {editingId === provider.id ? (
                    <input type="text" value={newSpecialty} onChange={e => setNewSpecialty(e.target.value)} className="border px-2 py-1 rounded w-full" />
                  ) : provider.specialty}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleActive(provider.id, provider.active)}
                    className={provider.active ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}
                  >
                    {provider.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-2 flex gap-2">
                  {editingId === provider.id ? (
                    <button onClick={() => saveEdit(provider.id)} className="text-green-600 hover:underline">Save</button>
                  ) : (
                    <>
                      <button onClick={() => setViewProvider(provider)} className="text-blue-600 hover:underline">View</button>
                      <button onClick={() => startEdit(provider)} className="text-yellow-600 hover:underline">Edit</button>
                      <button onClick={() => deleteProvider(provider.id)} className="text-red-600 hover:underline">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {viewProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96 relative">
            <h2 className="text-2xl font-bold mb-4">Provider Details</h2>
            <p><strong>Name:</strong> {viewProvider.name}</p>
            <p><strong>Email:</strong> {viewProvider.email}</p>
            <p><strong>Specialty:</strong> {viewProvider.specialty}</p>
            <p>
              <strong>Status:</strong>{" "}
              {viewProvider.active ? (
                <span className="text-green-600 font-semibold">Active</span>
              ) : (
                <span className="text-red-600 font-semibold">Inactive</span>
              )}
            </p>
            <button onClick={() => setViewProvider(null)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
