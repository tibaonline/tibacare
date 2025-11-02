// src/components/ChatContainer.tsx
'use client';

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import Messages from "@/components/ui/Messages";

type UserType = {
  uid: string;
  email: string;
  role: string;
};

interface ChatContainerProps {
  userEmail: string; // Logged-in user's email
}

export default function ChatContainer({ userEmail }: ChatContainerProps) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const q = query(collection(db, "users"), where("role", "in", ["admin", "provider"]));
        const snapshot = await getDocs(q);
        const fetchedUsers: UserType[] = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...(doc.data() as UserType)
        }));
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    }
    fetchUsers();
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">Chat</h1>

      {/* User Selector */}
      <div className="mb-4">
        <label className="block mb-2 font-semibold">Select Provider/Admin:</label>
        <select
          className="border p-2 rounded w-full"
          value={selectedUser?.email || ""}
          onChange={(e) => {
            const user = users.find(u => u.email === e.target.value);
            setSelectedUser(user || null);
          }}
        >
          <option value="">-- Select User --</option>
          {users.map(user => (
            <option key={user.uid} value={user.email}>{user.email}</option>
          ))}
        </select>
      </div>

      {/* Messages Component */}
      {selectedUser ? (
        <Messages userEmail={userEmail} chatWithEmail={selectedUser.email} />
      ) : (
        <p className="text-gray-500">Select a user to start chatting.</p>
      )}
    </div>
  );
}
