'use client';

import React, { useEffect, useState } from "react";
import { db, auth } from "@/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import jsPDF from "jspdf";

interface Appointment {
  id: string;
  patientName: string;
  providerName: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  reason?: string;
}

export default function ManageAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setIsAdmin(u?.email === "humphreykiboi1@gmail.com");
    });

    const col = collection(db, "appointments");
    const unsub = onSnapshot(
      col,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Appointment[];

        data.sort(
          (a, b) =>
            new Date(`${b.date} ${b.time}`).getTime() -
            new Date(`${a.date} ${a.time}`).getTime()
        );

        setAppointments(data);
        setLoading(false);
      },
      () => {
        setError("Failed to load appointments");
        setLoading(false);
      }
    );

    return () => {
      unsub();
      unsubAuth();
    };
  }, []);

  async function updateStatus(id: string, status: Appointment["status"]) {
    try {
      await updateDoc(doc(db, "appointments", id), { status });
      alert(`Appointment ${status}`);
    } catch {
      alert("Failed to update appointment status");
    }
  }

  async function deleteAppointment(id: string) {
    if (!isAdmin) return;
    if (!confirm("Are you sure you want to delete this appointment?")) return;
    try {
      await deleteDoc(doc(db, "appointments", id));
      alert("Appointment deleted");
    } catch {
      alert("Failed to delete appointment");
    }
  }

  // Export CSV
  function exportCSV() {
    const headers = ["Patient", "Provider", "Date", "Time", "Status"];
    const rows = appointments.map((a) =>
      [a.patientName, a.providerName, a.date, a.time, a.status].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "appointments.csv";
    link.click();
  }

  // Export PDF
  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Appointments Report", 10, 10);

    let y = 20;
    appointments.forEach((a, i) => {
      doc.text(
        `${i + 1}. ${a.patientName} - ${a.providerName} - ${a.date} ${a.time} - ${a.status}`,
        10,
        y
      );
      y += 8;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save("appointments.pdf");
  }

  if (loading) return <p>Loading appointments...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  const filteredAppointments = appointments.filter(
    (a) =>
      a.patientName?.toLowerCase().includes(search.toLowerCase()) ||
      a.providerName?.toLowerCase().includes(search.toLowerCase()) ||
      a.status?.toLowerCase().includes(search.toLowerCase())
  );

  const total = appointments.length;
  const pending = appointments.filter((a) => a.status === "pending").length;
  const confirmed = appointments.filter((a) => a.status === "confirmed").length;
  const completed = appointments.filter((a) => a.status === "completed").length;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">Manage Appointments</h1>

      {/* Search + Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
        <input
          type="text"
          placeholder="Search by patient, provider, or status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded w-full md:w-1/2"
        />
        <div className="flex gap-4 text-gray-700 font-medium">
          <p>Total: {total}</p>
          <p>Pending: {pending}</p>
          <p>Confirmed: {confirmed}</p>
          <p>Completed: {completed}</p>
        </div>
      </div>

      {/* Export */}
      <div className="flex gap-3 mb-4">
        <button onClick={exportCSV} className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700">Export CSV</button>
        <button onClick={exportPDF} className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700">Export PDF</button>
        <button onClick={() => window.print()} className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700">Print</button>
      </div>

      {filteredAppointments.length === 0 ? (
        <p>No appointments found.</p>
      ) : (
        <table className="min-w-full bg-white border rounded shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border-b text-left">Patient</th>
              <th className="py-2 px-4 border-b text-left">Provider</th>
              <th className="py-2 px-4 border-b text-left">Date / Time</th>
              <th className="py-2 px-4 border-b text-left">Status</th>
              <th className="py-2 px-4 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAppointments.map(
              ({ id, patientName, providerName, date, time, status }) => {
                let rowClass = "";
                if (status === "pending") rowClass = "bg-yellow-50";
                if (status === "cancelled") rowClass = "bg-red-50";

                return (
                  <tr key={id} className={`border-b hover:bg-gray-50 ${rowClass}`}>
                    <td className="py-2 px-4">{patientName}</td>
                    <td className="py-2 px-4">{providerName}</td>
                    <td className="py-2 px-4">{date} {time}</td>
                    <td className="py-2 px-4 capitalize">{status}</td>
                    <td className="py-2 px-4 space-x-2">
                      {status !== "confirmed" && (
                        <button onClick={() => updateStatus(id, "confirmed")} className="text-green-600 hover:underline">Confirm</button>
                      )}
                      {status !== "completed" && (
                        <button onClick={() => updateStatus(id, "completed")} className="text-blue-600 hover:underline">Complete</button>
                      )}
                      {isAdmin && (
                        <button onClick={() => deleteAppointment(id)} className="text-red-600 hover:underline">Delete</button>
                      )}
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
