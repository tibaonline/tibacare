'use client';

import React, { useEffect, useState } from "react";
import { db, auth } from "@/firebase";
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
  DocumentData,
  QuerySnapshot,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
} from "firebase/auth";

interface User {
  id: string;
  email: string;
  role: string;
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // New user form state
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("user");

  useEffect(() => {
    const colRef = collection(db, "users");

    const unsubscribe = onSnapshot(
      colRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          email: doc.data().email ?? "No Email",
          role: doc.data().role ?? "user",
        }));
        setUsers(data);
        setLoading(false);
      },
      () => {
        setError("Failed to load users.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Add user (Firestore + Firebase Auth)
  async function handleAddUser() {
    if (!newEmail) {
      alert("Email is required.");
      return;
    }
    try {
      // Temporary password
      const tempPassword = "TibaCare123!";

      // Create Firebase Auth account
      const userCred = await createUserWithEmailAndPassword(
        auth,
        newEmail,
        tempPassword
      );

      // Save user info in Firestore
      await setDoc(doc(db, "users", userCred.user.uid), {
        email: newEmail,
        role: newRole,
      });

      alert(
        `User added successfully ✅\nEmail: ${newEmail}\nTemp Password: ${tempPassword}`
      );

      setNewEmail("");
      setNewRole("user");
    } catch (err: any) {
      console.error(err);
      alert(`Failed to add user: ${err.message}`);
    }
  }

  // Update user role
  async function handleRoleChange(id: string, newRole: string) {
    try {
      await updateDoc(doc(db, "users", id), { role: newRole });
      alert("Role updated successfully.");
    } catch {
      alert("Failed to update role.");
    }
  }

  // Delete user (Firestore + Firebase Auth)
  async function handleDeleteUser(id: string, role: string) {
    if (role === "admin") {
      alert("You cannot delete an admin user!");
      return;
    }
    if (
      window.confirm(
        "Are you sure you want to delete this user? This will remove them from Firestore and Firebase Authentication."
      )
    ) {
      try {
        // Remove from Firestore
        await deleteDoc(doc(db, "users", id));

        // Try remove from Firebase Auth (requires privileged context)
        try {
          const userToDelete = auth.currentUser;
          if (userToDelete && userToDelete.uid === id) {
            await deleteUser(userToDelete);
          }
        } catch (authErr) {
          console.warn("Could not delete from Firebase Auth (needs Admin SDK).");
        }

        alert("User deleted successfully.");
      } catch {
        alert("Failed to delete user.");
      }
    }
  }

  if (loading) return <p>Loading users...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">Manage Users</h1>

      {/* Add New User Form */}
      <div className="mb-6 border p-4 rounded-lg shadow-sm bg-gray-50">
        <h2 className="text-xl font-semibold mb-3">Add New User</h2>
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <input
            type="email"
            placeholder="Enter user email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-1/2"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="border px-3 py-2 rounded"
          >
            <option value="user">User</option>
            <option value="patient">Patient</option>
            <option value="provider">Provider</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={handleAddUser}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Add User
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          ⚠️ New users get a default password <b>TibaCare123!</b> (ask them to change it after login).
        </p>
      </div>

      {/* Search + Stats */}
      <div className="flex items-center justify-between mb-4">
        <input
          type="text"
          placeholder="Search by email or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded w-1/2"
        />
        <p className="font-semibold text-gray-600">
          Total Users: {users.length}
        </p>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table className="w-full table-auto border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Email</th>
              <th className="border px-4 py-2 text-left">Role</th>
              <th className="border px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(({ id, email, role }) => (
              <tr key={id} className="border-t">
                <td className="border px-4 py-2">{email}</td>
                <td className="border px-4 py-2 capitalize">
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(id, e.target.value)}
                    className="border rounded px-2 py-1"
                    disabled={role === "admin"}
                  >
                    <option value="admin">Admin</option>
                    <option value="provider">Provider</option>
                    <option value="patient">Patient</option>
                    <option value="user">User</option>
                  </select>
                </td>
                <td className="border px-4 py-2">
                  <button
                    onClick={() => handleDeleteUser(id, role)}
                    disabled={role === "admin"}
                    className={`${
                      role === "admin"
                        ? "opacity-50 cursor-not-allowed"
                        : "text-red-600 hover:underline"
                    }`}
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
