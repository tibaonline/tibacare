'use client';

import { useEffect, useState, useRef } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/AuthContext";

type Message = {
  id: string;
  senderEmail: string;
  content: string;
  timestamp?: any;
};

export default function Messages() {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Real-time messages
  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    if (!user?.email) {
      toast.error("You must be logged in to send messages!");
      return;
    }

    setSending(true);
    try {
      await addDoc(collection(db, "messages"), {
        senderEmail: user.email,
        content: messageText.trim(),
        timestamp: serverTimestamp(),
      });
      toast.success("Message sent!");
      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (authLoading) return <p>Loading user...</p>;

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-600">Messages</h1>

      <ul className="divide-y max-h-[400px] overflow-y-auto border rounded p-4 bg-white shadow">
        {messages.length === 0 ? (
          <li className="py-2 text-gray-500">No messages yet.</li>
        ) : (
          messages.map(({ id, senderEmail, content, timestamp }) => (
            <li key={id} className="py-2">
              <p><strong>From:</strong> {senderEmail || "Unknown"}</p>
              <p className="whitespace-pre-wrap">{content}</p>
              <small className="text-gray-500">
                {timestamp?.seconds
                  ? new Date(timestamp.seconds * 1000).toLocaleString()
                  : "No timestamp"}
              </small>
            </li>
          ))
        )}
        <div ref={messagesEndRef} />
      </ul>

      <form onSubmit={handleSend} className="flex flex-col gap-4 mt-4">
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          className="border p-3 rounded w-full h-24"
          placeholder="Type your message..."
        />
        <button
          type="submit"
          disabled={sending || !user?.email}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send Message"}
        </button>
      </form>
    </div>
  );
}
