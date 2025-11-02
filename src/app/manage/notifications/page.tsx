'use client';

import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface Notification {
  id: string;
  message: string;
  category: string;
}

export default function ManageNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [category, setCategory] = useState("System");
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user?.email === "humphreykiboi1@gmail.com") {
        setUserRole("admin");
      }
    });

    const unsub = onSnapshot(collection(db, "notifications"), (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    });

    return () => {
      unsub();
      unsubAuth();
    };
  }, []);

  const handleAdd = async () => {
    if (!newMessage) return;
    await addDoc(collection(db, "notifications"), { message: newMessage, category });
    setNewMessage("");
  };

  const handleDelete = async (id: string) => {
    if (userRole !== "admin") return;
    await deleteDoc(doc(db, "notifications", id));
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Manage Notifications</h1>
      {userRole === "admin" && (
        <div className="mb-4 flex gap-2">
          <input 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            placeholder="Enter notification" 
            className="border p-2 rounded w-1/2"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="border p-2 rounded">
            <option>System</option>
            <option>Patient</option>
            <option>Provider</option>
            <option>Admin</option>
          </select>
          <button onClick={handleAdd} className="bg-blue-500 text-white px-3 rounded">Add</button>
        </div>
      )}

      {notifications.map((n) => (
        <div key={n.id} className="p-3 border rounded mb-2 flex justify-between">
          <p><strong>{n.category}:</strong> {n.message}</p>
          {userRole === "admin" && (
            <button onClick={() => handleDelete(n.id)} className="text-red-600">Delete</button>
          )}
        </div>
      ))}
    </div>
  );
}
