'use client';

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import toast from "react-hot-toast";

type Client = {
  id: string;
  name: string;
  email: string;
  age?: number;
  gender?: string;
  phoneNumber?: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [adding, setAdding] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "clients"), (snapshot) => {
      const data: Client[] = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Client) }));
      setClients(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Add new client
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return toast.error("Name and Email are required");
    setAdding(true);
    try {
      await addDoc(collection(db, "clients"), { name, email, age: age || null, gender, phoneNumber });
      setName(""); setEmail(""); setAge(""); setGender(""); setPhoneNumber("");
      toast.success("Client added successfully!");
    } catch (error) {
      console.error("Error adding client:", error);
      toast.error("Failed to add client");
    } finally {
      setAdding(false);
    }
  };

  // Delete client
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this client?")) return;
    try {
      await deleteDoc(doc(db, "clients", id));
      toast.success("Client deleted!");
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Failed to delete client");
    }
  };

  // Start editing
  const startEdit = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setEmail(client.email);
    setAge(client.age || "");
    setGender(client.gender || "");
    setPhoneNumber(client.phoneNumber || "");
  };

  // Update client
  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "clients", editingClient.id), {
        name, email, age: age || null, gender, phoneNumber
      });
      setEditingClient(null);
      setName(""); setEmail(""); setAge(""); setGender(""); setPhoneNumber("");
      toast.success("Client updated successfully!");
    } catch (error) {
      console.error("Error updating client:", error);
      toast.error("Failed to update client");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-600">Client Records</h1>

      {/* Add / Edit client form */}
      <form onSubmit={editingClient ? handleUpdateClient : handleAddClient} className="flex flex-col md:flex-row gap-2 mb-4 flex-wrap">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="border px-3 py-2 rounded" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="border px-3 py-2 rounded" />
        <input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} placeholder="Age" className="border px-3 py-2 rounded" />
        <select value={gender} onChange={(e) => setGender(e.target.value)} className="border px-3 py-2 rounded">
          <option value="">Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone Number" className="border px-3 py-2 rounded" />
        <button type="submit" disabled={adding || updating} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {editingClient ? (updating ? "Updating..." : "Update Client") : (adding ? "Adding..." : "Add Client")}
        </button>
        {editingClient && (
          <button type="button" onClick={() => { setEditingClient(null); setName(""); setEmail(""); setAge(""); setGender(""); setPhoneNumber(""); }} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
            Cancel
          </button>
        )}
      </form>

      {/* Clients table */}
      {loading ? (
        <p>Loading clients...</p>
      ) : clients.length === 0 ? (
        <p>No clients found.</p>
      ) : (
        <table className="w-full table-auto border-collapse bg-white rounded shadow">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Age</th>
              <th className="text-left px-4 py-2">Gender</th>
              <th className="text-left px-4 py-2">Phone Number</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-t">
                <td className="px-4 py-2">{client.name}</td>
                <td className="px-4 py-2">{client.email}</td>
                <td className="px-4 py-2">{client.age || "-"}</td>
                <td className="px-4 py-2">{client.gender || "-"}</td>
                <td className="px-4 py-2">{client.phoneNumber || "-"}</td>
                <td className="px-4 py-2 space-x-2">
                  <button onClick={() => setSelectedClient(client)} className="text-blue-600 hover:underline">View</button>
                  <button onClick={() => startEdit(client)} className="text-yellow-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(client.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal for client details */}
      {selectedClient && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Client Details</h2>
            <p><strong>Name:</strong> {selectedClient.name}</p>
            <p><strong>Email:</strong> {selectedClient.email}</p>
            <p><strong>Age:</strong> {selectedClient.age || "-"}</p>
            <p><strong>Gender:</strong> {selectedClient.gender || "-"}</p>
            <p><strong>Phone:</strong> {selectedClient.phoneNumber || "-"}</p>
            <div className="flex justify-end mt-4">
              <button className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400" onClick={() => setSelectedClient(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
