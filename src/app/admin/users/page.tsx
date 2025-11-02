'use client';

import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, addDoc } from "firebase/firestore";
import { db, auth } from "@/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import toast from "react-hot-toast";

type UserProfile = {
  id: string;
  email: string;
  role: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "provider">("provider");

  // Fetch users from Firestore
  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "users"));
        const userList: UserProfile[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          userList.push({
            id: doc.id,
            email: data.email || "N/A",
            role: data.role || "N/A",
          });
        });
        setUsers(userList);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users");
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  // Add new user
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return toast.error("Email is required");

    try {
      // Create user in Firebase Auth with default password
      const userCredential = await createUserWithEmailAndPassword(auth, newEmail, "DefaultPassword123!");
      const uid = userCredential.user.uid;

      // Save role in Firestore
      const docRef = await addDoc(collection(db, "users"), {
        uid,
        email: newEmail,
        role: newRole,
      });

      setUsers([...users, { id: docRef.id, email: newEmail, role: newRole }]);
      toast.success("User added successfully!");
      setShowForm(false);
      setNewEmail("");
      setNewRole("provider");
    } catch (error: any) {
      console.error(error);
      if (error.code === "auth/email-already-in-use") {
        toast.error("Email already exists in Firebase Auth");
      } else {
        toast.error("Failed to add user");
      }
    }
  };

  // Delete user (disabled for admins)
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      setUsers(users.filter(user => user.id !== id));
      toast.success("User deleted!");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  // Optional: handle edit
  const handleEdit = (user: UserProfile) => {
    alert(`Edit user: ${user.email} (Feature to implement)`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-blue-600">Users</h1>
        <button
          onClick={() => setShowForm(prev => !prev)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          {showForm ? "Cancel" : "Add User"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddUser} className="bg-white p-4 rounded shadow-md flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
              className="border p-2 rounded w-64"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value as "admin" | "provider")}
              className="border p-2 rounded"
            >
              <option value="provider">Provider</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            Add
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading users...</p>
      ) : users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table className="w-full table-auto border-collapse bg-white shadow rounded">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(({ id, email, role }) => (
              <tr key={id} className="border-t">
                <td className="px-4 py-2">{email}</td>
                <td className="px-4 py-2 capitalize">{role}</td>
                <td className="px-4 py-2 flex gap-2">
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => handleEdit({ id, email, role })}
                  >
                    Edit
                  </button>
                  <button
                    className={`text-red-600 hover:underline ${role === "admin" ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => role !== "admin" && handleDelete(id)}
                    disabled={role === "admin"}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
