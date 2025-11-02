'use client';

import { useEffect, useState } from "react";
import { db, auth } from "@/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  deleteDoc,
  doc,
} from "firebase/firestore";
import jsPDF from "jspdf";

interface Feedback {
  id: string;
  message: string;
  createdAt?: any;
  userEmail?: string;
}

export default function ManageFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  const user = auth.currentUser;
  const isAdmin = user?.email === "humphreykiboi1@gmail.com";

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as Feedback) })
      );
      setFeedbacks(data);
      setLoading(false);
    });
    return () => unsub();
  }, [isAdmin]);

  async function handleDelete(id: string) {
    if (!isAdmin) return;
    if (!confirm("Delete this feedback?")) return;
    await deleteDoc(doc(db, "feedback", id));
    alert("Feedback deleted.");
  }

  function exportCSV() {
    const headers = ["Message", "Date", "User Email"];
    const rows = feedbacks.map((f) =>
      [
        `"${f.message.replace(/"/g, '""')}"`, // escape quotes
        f.createdAt?.toDate
          ? f.createdAt.toDate().toLocaleString()
          : "Unknown",
        f.userEmail || "Anonymous",
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "feedback.csv";
    link.click();
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("User Feedback Report", 10, 10);

    let y = 20;
    feedbacks.forEach((f, i) => {
      doc.text(
        `${i + 1}. ${f.message} (${f.userEmail || "Anonymous"})`,
        10,
        y
      );
      y += 8;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save("feedback.pdf");
  }

  if (!isAdmin) {
    return <p className="p-6 text-red-600">Access denied. Admin only.</p>;
  }

  if (loading) return <p className="p-6">Loading feedback...</p>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">User Feedback</h1>

      {/* Export buttons */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={exportCSV}
          className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
        >
          Export CSV
        </button>
        <button
          onClick={exportPDF}
          className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
        >
          Export PDF
        </button>
      </div>

      {feedbacks.length === 0 ? (
        <p>No feedback submitted yet.</p>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((f) => (
            <div
              key={f.id}
              className="border p-4 rounded bg-white shadow hover:shadow-md"
            >
              <p className="text-gray-800">{f.message}</p>
              <small className="block text-gray-500 mt-2">
                {f.createdAt?.toDate
                  ? f.createdAt.toDate().toLocaleString()
                  : "Just now"}
              </small>
              {isAdmin && f.userEmail && (
                <small className="block text-gray-400">
                  Sent by: {f.userEmail}
                </small>
              )}
              <button
                onClick={() => handleDelete(f.id)}
                className="mt-2 text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
