"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/firebase";

type Setting = {
  id: string;
  key: string;
  value: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editedValues, setEditedValues] = useState<{ [id: string]: string }>({});
  const [loadingIds, setLoadingIds] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "settings"), (snapshot) => {
      const data: Setting[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        key: doc.data().key,
        value: doc.data().value,
      }));
      setSettings(data);
    });
    return () => unsubscribe();
  }, []);

  // Update setting
  const handleUpdate = async (id: string) => {
    const newValue = editedValues[id];
    if (newValue === undefined) return;

    setLoadingIds((prev) => [...prev, id]);
    await updateDoc(doc(db, "settings", id), { value: newValue });
    setLoadingIds((prev) => prev.filter((x) => x !== id));
  };

  // Delete setting
  const handleDelete = async (id: string) => {
    setLoadingIds((prev) => [...prev, id]);
    await deleteDoc(doc(db, "settings", id));
    setLoadingIds((prev) => prev.filter((x) => x !== id));
  };

  // Add new setting
  const handleAdd = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    await addDoc(collection(db, "settings"), {
      key: newKey,
      value: newValue,
    });
    setNewKey("");
    setNewValue("");
  };

  // Helper: render proper input type
  const renderInput = (setting: Setting) => {
    const value = editedValues[setting.id] ?? setting.value;

    // Boolean toggle
    if (value === "true" || value === "false") {
      return (
        <input
          type="checkbox"
          checked={value === "true"}
          onChange={(e) =>
            setEditedValues({
              ...editedValues,
              [setting.id]: e.target.checked.toString(),
            })
          }
        />
      );
    }

    // Color picker
    if (setting.key.toLowerCase().includes("color")) {
      return (
        <input
          type="color"
          value={value}
          onChange={(e) =>
            setEditedValues({ ...editedValues, [setting.id]: e.target.value })
          }
          className="w-16 h-8 border rounded"
        />
      );
    }

    // Number input (for consultations)
    if (setting.key.toLowerCase().includes("consultation") || setting.key.toLowerCase().includes("price")) {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) =>
            setEditedValues({ ...editedValues, [setting.id]: e.target.value })
          }
          className="border p-1 rounded w-full"
        />
      );
    }

    // Default text/URL
    return (
      <input
        type="text"
        value={value}
        onChange={(e) =>
          setEditedValues({ ...editedValues, [setting.id]: e.target.value })
        }
        className="border p-1 rounded w-full"
      />
    );
  };

  // Categories
  const categories: Record<string, string[]> = {
    "Consultations & Billing": [
      "General consultation",
      "Physician consultation",
      "Pediatrics consultation",
      "Dermatology consultation",
      "Mental Health consultation",
      "Reproductive Health consultation",
      "Currency",
      "Enable Payments",
      "Payment Provider",
    ],
    Integrations: [
      "WhatsApp Integration",
      "SMS Notifications",
      "Email Notifications",
      "Video Provider",
    ],
    "System & UI": [
      "Logo URL",
      "Secondary Color",
      "Primary Color",
      "Default Language",
      "Supported Languages",
      "Timezone",
      "Site Name",
      "Theme",
    ],
    "Security & Compliance": [
      "MFA Required",
      "Free Trial Enabled",
      "Data Retention",
    ],
    Support: ["Office Address", "Support Email", "Support Phone"],
    "General Notifications": ["Notifications", "Max Consult Duration"],
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold text-blue-600">Settings</h1>

      {Object.entries(categories).map(([category, keys]) => {
        const filteredSettings = settings.filter((s) => keys.includes(s.key));
        if (filteredSettings.length === 0) return null;

        return (
          <div key={category} className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold text-gray-700 mb-3">
              {category}
            </h2>
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Key</th>
                  <th className="px-4 py-2 text-left">Value</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSettings.map((setting) => (
                  <tr key={setting.id} className="border-t">
                    <td className="px-4 py-2">{setting.key}</td>
                    <td className="px-4 py-2">{renderInput(setting)}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <button
                        onClick={() => handleUpdate(setting.id)}
                        disabled={loadingIds.includes(setting.id)}
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                      >
                        {loadingIds.includes(setting.id) ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => handleDelete(setting.id)}
                        disabled={loadingIds.includes(setting.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                      >
                        {loadingIds.includes(setting.id) ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Add new setting */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-3">
          Add New Setting
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="border p-2 rounded w-1/3"
          />
          <input
            type="text"
            placeholder="Value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="border p-2 rounded w-1/3"
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Setting
          </button>
        </div>
      </div>
    </div>
  );
}
