'use client';

import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface Provider {
  id: string;
  name: string;
  specialty: string;
}

export default function ManageProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user?.email === "humphreykiboi1@gmail.com") {
        setUserRole("admin");
      }
    });

    const unsub = onSnapshot(collection(db, "providers"), (snapshot) => {
      setProviders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Provider)));
    });

    return () => {
      unsub();
      unsubAuth();
    };
  }, []);

  const handleAdd = async () => {
    if (!name || !specialty) return;
    await addDoc(collection(db, "providers"), { name, specialty });
    setName(""); setSpecialty("");
  };

  const handleDelete = async (id: string) => {
    if (userRole !== "admin") return;
    await deleteDoc(doc(db, "providers", id));
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Manage Providers</h1>
      {userRole === "admin" && (
        <div className="mb-4 flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="border p-2 rounded" />
          <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Specialty" className="border p-2 rounded" />
          <button onClick={handleAdd} className="bg-blue-500 text-white px-3 rounded">Add</button>
        </div>
      )}
      {providers.map((p) => (
        <div key={p.id} className="p-3 border rounded mb-2 flex justify-between">
          <p>{p.name} - {p.specialty}</p>
          {userRole === "admin" && (
            <button onClick={() => handleDelete(p.id)} className="text-red-600">Delete</button>
          )}
        </div>
      ))}
    </div>
  );
}
