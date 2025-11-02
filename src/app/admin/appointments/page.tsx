'use client';

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import toast from "react-hot-toast";

type Appointment = {
  id: string;
  patientName: string;
  providerName: string;
  date: string;
  time: string;
  status: string;
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [newPatient, setNewPatient] = useState('');
  const [newProvider, setNewProvider] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    patientName: '',
    providerName: '',
    date: '',
    time: ''
  });

  // Real-time listener
  useEffect(() => {
    let q = collection(db, "appointments");

    if (statusFilter && dateFilter) {
      q = query(
        collection(db, "appointments"),
        where("status", "==", statusFilter),
        where("date", "==", dateFilter),
        orderBy("date", "asc")
      );
    } else if (statusFilter) {
      q = query(collection(db, "appointments"), where("status", "==", statusFilter), orderBy("date", "asc"));
    } else if (dateFilter) {
      q = query(collection(db, "appointments"), where("date", "==", dateFilter), orderBy("date", "asc"));
    } else {
      q = query(collection(db, "appointments"), orderBy("date", "asc"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Appointment[] = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Appointment) }));
      setAppointments(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [statusFilter, dateFilter]);

  // Confirm appointment
  async function confirmAppointment(id: string) {
    try {
      await updateDoc(doc(db, "appointments", id), { status: "confirmed" });
      toast.success("Appointment confirmed ✅");
    } catch (error) {
      console.error(error);
      toast.error("Error confirming appointment ❌");
    }
  }

  // Add new appointment
  async function addAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!newPatient || !newDate || !newTime) {
      toast.error("Please fill all required fields");
      return;
    }
    setAdding(true);
    try {
      await addDoc(collection(db, "appointments"), {
        patientName: newPatient,
        providerName: newProvider || "Unassigned",
        date: newDate,
        time: newTime,
        status: "pending",
        createdAt: serverTimestamp()
      });
      toast.success("Appointment added!");
      setNewPatient('');
      setNewProvider('');
      setNewDate('');
      setNewTime('');
      setShowModal(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to add appointment");
    } finally {
      setAdding(false);
    }
  }

  // Save edited appointment
  const handleSaveEdit = async (id: string) => {
    if (!editData.patientName || !editData.date || !editData.time) {
      toast.error("Patient, date, and time are required.");
      return;
    }
    try {
      await updateDoc(doc(db, "appointments", id), editData);
      toast.success("Appointment updated!");
      setEditingId(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update appointment");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-blue-600">Appointments</h1>

      {/* Filters & Schedule button */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
        <div className="flex gap-2">
          <input type="date" className="border rounded px-3 py-2" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
          <select className="border rounded px-3 py-2" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          onClick={() => setShowModal(true)}
        >
          Schedule New Appointment
        </button>
      </div>

      {/* Appointment table */}
      {loading ? <p>Loading appointments...</p> :
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left px-4 py-2">Patient</th>
                <th className="text-left px-4 py-2">Provider</th>
                <th className="text-left px-4 py-2">Date / Time</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-4">No appointments found.</td></tr>
              ) : appointments.map(appt => (
                <tr key={appt.id} className="border-t">
                  {editingId === appt.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input className="border p-1 rounded w-full" value={editData.patientName} onChange={e => setEditData({ ...editData, patientName: e.target.value })} />
                      </td>
                      <td className="px-4 py-2">
                        <input className="border p-1 rounded w-full" value={editData.providerName} onChange={e => setEditData({ ...editData, providerName: e.target.value })} />
                      </td>
                      <td className="px-4 py-2 flex gap-1">
                        <input type="date" className="border p-1 rounded" value={editData.date} onChange={e => setEditData({ ...editData, date: e.target.value })} />
                        <input type="time" className="border p-1 rounded" value={editData.time} onChange={e => setEditData({ ...editData, time: e.target.value })} />
                      </td>
                      <td className="px-4 py-2">{appt.status}</td>
                      <td className="px-4 py-2 flex gap-2">
                        <button className="text-green-600 hover:underline" onClick={() => handleSaveEdit(appt.id)}>Save</button>
                        <button className="text-gray-600 hover:underline" onClick={() => setEditingId(null)}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2">{appt.patientName}</td>
                      <td className="px-4 py-2">{appt.providerName}</td>
                      <td className="px-4 py-2">{appt.date} {appt.time}</td>
                      <td className="px-4 py-2 capitalize">{appt.status}</td>
                      <td className="px-4 py-2 flex gap-2">
                        <button className="text-blue-600 hover:underline" onClick={() => { setEditingId(appt.id); setEditData({ patientName: appt.patientName, providerName: appt.providerName, date: appt.date, time: appt.time }); }}>Edit</button>
                        <button className="text-green-600 hover:underline" onClick={() => confirmAppointment(appt.id)} disabled={appt.status === "confirmed"}>Confirm</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }

      {/* Schedule Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Schedule New Appointment</h2>
            <form className="flex flex-col gap-3" onSubmit={addAppointment}>
              <input type="text" placeholder="Patient Name" className="border p-2 rounded" value={newPatient} onChange={e => setNewPatient(e.target.value)} />
              <input type="text" placeholder="Provider Name (optional)" className="border p-2 rounded" value={newProvider} onChange={e => setNewProvider(e.target.value)} />
              <input type="date" className="border p-2 rounded" value={newDate} onChange={e => setNewDate(e.target.value)} />
              <input type="time" className="border p-2 rounded" value={newTime} onChange={e => setNewTime(e.target.value)} />
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" disabled={adding}>{adding ? "Adding..." : "Add Appointment"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
