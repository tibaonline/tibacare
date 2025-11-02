'use client';

import React, { useEffect, useState } from "react";
import { db } from "@/firebase";
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

interface MessageThread {
  id: string;
  participants: string[];
  lastMessage: string;
  lastTimestamp: any;
}

export default function ManageMessagesPage() {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "messages"),
      orderBy("lastTimestamp", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MessageThread[];
        setThreads(data);
        setLoading(false);
      },
      () => {
        setError("Failed to load messages ❌");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  async function deleteThread(id: string) {
    if (!confirm("Are you sure you want to delete this thread?")) return;
    try {
      await deleteDoc(doc(db, "messages", id));
      toast.success("Message thread deleted ✅");
    } catch {
      toast.error("Failed to delete message thread ❌");
    }
  }

  function viewThread(id: string) {
    // You can later build a /manage/messages/[id] page
    toast(`Open thread: ${id}`, { icon: "💬" });
  }

  if (loading) return <p>Loading messages...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">Manage Messages</h1>

      {threads.length === 0 ? (
        <div className="text-gray-600 bg-gray-50 p-6 rounded shadow text-center">
          📭 No message threads found
        </div>
      ) : (
        <table className="min-w-full bg-white border rounded shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border-b text-left">Participants</th>
              <th className="py-2 px-4 border-b text-left">Last Message</th>
              <th className="py-2 px-4 border-b text-left">Time</th>
              <th className="py-2 px-4 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {threads.map(({ id, participants, lastMessage, lastTimestamp }) => {
              const timestamp = lastTimestamp?.toDate?.() || null;
              const isRecent =
                timestamp && Date.now() - timestamp.getTime() < 24 * 60 * 60 * 1000;

              return (
                <tr
                  key={id}
                  className={`border-b hover:bg-gray-50 ${
                    isRecent ? "bg-yellow-50" : ""
                  }`}
                >
                  <td className="py-2 px-4">{participants.join(", ")}</td>
                  <td
                    className="py-2 px-4 max-w-xs truncate"
                    title={lastMessage}
                  >
                    {lastMessage || "—"}
                  </td>
                  <td className="py-2 px-4 text-sm text-gray-500">
                    {timestamp
                      ? formatDistanceToNow(timestamp, { addSuffix: true })
                      : "—"}
                  </td>
                  <td className="py-2 px-4 space-x-3">
                    <button
                      onClick={() => viewThread(id)}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </button>
                    <button
                      onClick={() => deleteThread(id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
