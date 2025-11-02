'use client';

import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/firebase";
import toast from "react-hot-toast";

type Notification = {
  id: string;
  title: string;
  message: string;
  enabled: boolean;
  category: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [editCache, setEditCache] = useState<{ [key: string]: Partial<Notification> }>({});
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newCategory, setNewCategory] = useState("System");

  // 🔹 Realtime Firestore fetch
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "notifications"), (snapshot) => {
      const data: Notification[] = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        message: doc.data().message,
        enabled: Boolean(doc.data().enabled),
        category: doc.data().category || "System",
      }));
      setNotifications(data);
    });
    return () => unsubscribe();
  }, []);

  // 🔹 Save updated notification
  const handleSave = async (id: string) => {
    const updates = editCache[id];
    if (updates) {
      await updateDoc(doc(db, "notifications", id), updates);
      setEditCache((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      toast.success("✅ Notification saved!");
    }
  };

  // 🔹 Delete notification
  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "notifications", id));
    toast.error("❌ Notification deleted");
  };

  // 🔹 Add new notification
  const handleAdd = async () => {
    if (!newTitle.trim() || !newMessage.trim()) {
      toast.error("⚠️ Title and Message are required");
      return;
    }
    await addDoc(collection(db, "notifications"), {
      title: newTitle,
      message: newMessage,
      enabled: true,
      category: newCategory,
    });
    setNewTitle("");
    setNewMessage("");
    setNewCategory("System");
    toast.success("✅ New notification added!");
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold text-blue-600">Notifications</h1>

      {/* Notifications Table */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Notifications Management</h2>
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">Title</th>
              <th className="px-4 py-2 text-left">Message</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Enabled</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((n) => (
              <tr key={n.id} className="border-t">
                <td className="px-4 py-2">
                  <input
                    type="text"
                    defaultValue={n.title}
                    onChange={(e) =>
                      setEditCache((prev) => ({
                        ...prev,
                        [n.id]: { ...prev[n.id], title: e.target.value },
                      }))
                    }
                    className="border p-1 rounded w-full"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    defaultValue={n.message}
                    onChange={(e) =>
                      setEditCache((prev) => ({
                        ...prev,
                        [n.id]: { ...prev[n.id], message: e.target.value },
                      }))
                    }
                    className="border p-1 rounded w-full"
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    defaultValue={n.category}
                    onChange={(e) =>
                      setEditCache((prev) => ({
                        ...prev,
                        [n.id]: { ...prev[n.id], category: e.target.value },
                      }))
                    }
                    className="border p-1 rounded w-full"
                  >
                    <option value="System">System</option>
                    <option value="Patient">Patient</option>
                    <option value="Provider">Provider</option>
                    <option value="Admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-2 text-center">
                  <input
                    type="checkbox"
                    defaultChecked={n.enabled}
                    onChange={(e) =>
                      setEditCache((prev) => ({
                        ...prev,
                        [n.id]: { ...prev[n.id], enabled: e.target.checked },
                      }))
                    }
                  />
                </td>
                <td className="px-4 py-2 flex gap-2">
                  <button
                    onClick={() => handleSave(n.id)}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add new notification */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Add New Notification</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="border p-2 rounded w-1/4"
          />
          <input
            type="text"
            placeholder="Message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="border p-2 rounded w-1/2"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="border p-2 rounded w-1/4"
          >
            <option value="System">System</option>
            <option value="Patient">Patient</option>
            <option value="Provider">Provider</option>
            <option value="Admin">Admin</option>
          </select>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Notification
          </button>
        </div>
      </div>
    </div>
  );
}
