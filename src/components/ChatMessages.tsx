'use client';

import { useEffect, useState, useRef } from "react";
import { collection, orderBy, query, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import toast from "react-hot-toast";

type Message = {
  id: string;
  senderEmail: string;
  content: string;
  timestamp?: any;
};

interface ChatMessagesProps {
  userEmail: string; // logged-in user (provider or admin)
}

export default function ChatMessages({ userEmail }: ChatMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setSending(true);
    try {
      await addDoc(collection(db, "messages"), {
        senderEmail: userEmail || "Unknown",
        content: messageText,
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

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-blue-600 text-center">Messages</h1>

      {/* Chat messages */}
      <div className="border rounded p-4 bg-white shadow max-h-[500px] overflow-y-auto flex flex-col gap-2">
        {messages.map(({ id, senderEmail, content, timestamp }) => {
          const isMe = senderEmail === userEmail;
          return (
            <div
              key={id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div className={`rounded-lg p-3 max-w-xs ${isMe ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-900"}`}>
                <p className="text-sm font-semibold">{senderEmail || "Unknown"}</p>
                <p className="whitespace-pre-wrap">{content}</p>
                <small className="text-xs text-gray-700 mt-1 block">
                  {timestamp?.seconds
                    ? new Date(timestamp.seconds * 1000).toLocaleString()
                    : "No timestamp"}
                </small>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Send message form */}
      <form onSubmit={handleSend} className="flex gap-2 mt-4">
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          className="flex-1 border p-3 rounded h-24"
          placeholder="Type your message..."
        />
        <button
          type="submit"
          disabled={sending}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
