'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/firebase";
import { addDoc, collection, Timestamp } from "firebase/firestore";

export default function NewClientPage() {
  const router = useRouter();

  const user = auth.currentUser;
  const isAdmin = user?.email === "humphreykiboi1@gmail.com";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      alert("❌ Only admin can add clients");
      return;
    }

    try {
      await addDoc(collection(db, "clients"), {
        name,
        email,
        phone,
        createdAt: Timestamp.now(),
      });
      alert("✅ Client added");
      router.push("/manage/clients");
    } catch {
      alert("❌ Failed to add client");
    }
  }

  if (!isAdmin) return <p>❌ Only admin can add clients</p>;

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold mb-4 text-blue-700">New Client</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border px-3 py-2 rounded"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-3 py-2 rounded"
          required
        />
        <input
          type="tel"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Save Client
        </button>
      </form>
    </div>
  );
}
