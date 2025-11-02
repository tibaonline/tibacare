'use client';

import React, { useEffect, useState } from "react";
import { db, auth } from "@/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import Link from "next/link";

interface Client {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  createdAt?: string;
}

export default function ManageClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const user = auth.currentUser;
  const isAdmin = user?.email === "humphreykiboi1@gmail.com";

  useEffect(() => {
    const q = query(collection(db, "clients"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Client),
      }));
      setClients(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filtered = clients.filter((c) => {
    const name = c.name ?? "";
    const email = c.email ?? "";
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase())
    );
  });

  if (loading) return <p>Loading clients...</p>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">Manage Clients</h1>

      <div className="mb-4 flex justify-between items-center">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded w-1/3"
        />
        {isAdmin && (
          <Link
            href="/manage/clients/new"
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            + New Client
          </Link>
        )}
      </div>

      {filtered.length === 0 ? (
        <p>No clients found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2 text-left">Name</th>
                <th className="border px-4 py-2 text-left">Email</th>
                <th className="border px-4 py-2 text-left">Phone</th>
                <th className="border px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="border px-4 py-2">{c.name ?? "-"}</td>
                  <td className="border px-4 py-2">{c.email ?? "-"}</td>
                  <td className="border px-4 py-2">{c.phone ?? "-"}</td>
                  <td className="border px-4 py-2 space-x-3">
                    <Link
                      href={`/manage/clients/${c.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                    {isAdmin && (
                      <>
                        <Link
                          href={`/manage/clients/${c.id}/edit`}
                          className="text-green-600 hover:underline"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/manage/clients/${c.id}/delete`}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </Link>
                      </>
                    )}
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
