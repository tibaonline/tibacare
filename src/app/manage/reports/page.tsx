'use client';

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import jsPDF from "jspdf";

interface Report {
  id: string;
  type: string;
  details: string;
  createdAt?: any;
}

export default function ManageReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user?.email === "humphreykiboi1@gmail.com") {
        setUserRole("admin");
      }
    });

    const unsub = onSnapshot(collection(db, "reports"), (snapshot) => {
      setReports(
        snapshot.docs.map(
          (doc) => ({ id: doc.id, ...(doc.data() as Report) })
        )
      );
    });

    return () => {
      unsub();
      unsubAuth();
    };
  }, []);

  if (userRole !== "admin") {
    return <div className="p-6 text-red-600">Access Denied. Admin only.</div>;
  }

  function exportCSV() {
    const headers = ["Type", "Details", "Date"];
    const rows = reports.map((r) =>
      [
        `"${r.type}"`,
        `"${r.details.replace(/"/g, '""')}"`,
        r.createdAt?.toDate
          ? r.createdAt.toDate().toLocaleString()
          : "Unknown",
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "reports.csv";
    link.click();
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("System Reports", 10, 10);

    let y = 20;
    reports.forEach((r, i) => {
      doc.text(
        `${i + 1}. [${r.type}] ${r.details} (${r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : "Unknown"})`,
        10,
        y
      );
      y += 8;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save("reports.pdf");
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">System Reports</h1>

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

      {reports.length === 0 ? (
        <p>No reports available.</p>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div
              key={r.id}
              className="border p-4 rounded bg-white shadow hover:shadow-md"
            >
              <p className="font-semibold text-gray-800">{r.type}</p>
              <p className="text-gray-700">{r.details}</p>
              <small className="block text-gray-500 mt-2">
                {r.createdAt?.toDate
                  ? r.createdAt.toDate().toLocaleString()
                  : "Unknown"}
              </small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
