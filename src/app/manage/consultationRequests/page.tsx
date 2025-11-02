'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/firebase';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';

interface Request {
  id: string;
  patientName: string;
  contact: string;
  service: string;
  preferredDate: string;
  preferredTime: string;
  symptoms: string;
  status: 'Pending' | 'Assigned';
  assignedProvider?: string;
  createdAt?: { seconds: number; nanoseconds: number };
}

export default function ManageConsultationRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerName, setProviderName] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'consultationRequests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Request) }));
      setRequests(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const assignRequest = async (request: Request) => {
    if (!providerName) return alert('Enter provider name to assign!');
    // 1. Create in consultations
    await addDoc(collection(db, 'consultations'), {
      patientName: request.patientName,
      contact: request.contact,
      service: request.service,
      preferredDate: request.preferredDate,
      preferredTime: request.preferredTime,
      symptoms: request.symptoms,
      providerName: providerName,
      status: 'Pending',
      createdAt: request.createdAt || new Date(),
    });
    // 2. Update request status
    await updateDoc(doc(db, 'consultationRequests', request.id), {
      status: 'Assigned',
      assignedProvider: providerName,
    });
    alert('✅ Consultation assigned successfully!');
  };

  const deleteRequest = async (id: string) => {
    if (!confirm('Delete this request?')) return;
    await deleteDoc(doc(db, 'consultationRequests', id));
    alert('Deleted ✅');
  };

  if (loading) return <p>Loading requests...</p>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-3xl font-bold text-blue-700 mb-4">Manage Consultation Requests</h1>
      {requests.length === 0 ? (
        <p>No requests found.</p>
      ) : (
        <ul className="space-y-4">
          {requests.map(req => (
            <li key={req.id} className="p-4 border rounded shadow-sm bg-white hover:bg-gray-50">
              <h3 className="font-semibold text-lg">{req.patientName}</h3>
              <p className="text-sm text-gray-600">
                {req.service} | {req.preferredDate} at {req.preferredTime}
              </p>
              <p><strong>Symptoms:</strong> {req.symptoms}</p>
              <p><strong>Contact:</strong> {req.contact}</p>
              <p><strong>Status:</strong> {req.status}</p>
              {req.status === 'Pending' && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="Assign Provider Name"
                    value={providerName}
                    onChange={e => setProviderName(e.target.value)}
                    className="border px-2 py-1 rounded"
                  />
                  <button
                    onClick={() => assignRequest(req)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Assign
                  </button>
                </div>
              )}
              <button
                onClick={() => deleteRequest(req.id)}
                className="text-red-600 mt-2 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
