'use client';

import React, { useEffect, useState } from 'react';
import { db, auth } from '@/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';

interface Patient {
  id: string;
  name: string;
  service?: string;
  phone?: string;
  status?: string;
  providerId?: string;
  createdAt?: any;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filterMyWaiting, setFilterMyWaiting] = useState(false);
  const [search, setSearch] = useState('');
  const providerId = auth.currentUser?.uid;

  useEffect(() => {
    const patientsRef = collection(db, 'patients');
    const q = query(patientsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.fullName || data.name || 'Unnamed',
          service: data.service || '-',
          phone: data.phone || '-',
          status: data.status || 'waiting',
          providerId: data.providerId || '',
          createdAt: data.createdAt,
        } as Patient;
      });
      setPatients(patientsData);
    });

    return () => unsubscribe();
  }, []);

  const filteredPatients = patients.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.service || '').toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filterMyWaiting
      ? p.status === 'waiting' && p.providerId === providerId
      : true;

    return matchesSearch && matchesFilter;
  });

  const getRowColor = (p: Patient) => {
    if (p.status === 'priority') return 'bg-red-100';
    if (p.status === 'waiting' && p.providerId === providerId) return 'bg-yellow-100';
    if (p.status === 'attending' && p.providerId !== providerId) return 'bg-blue-100';
    return '';
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">My Patients</h1>

      {/* Legend */}
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 border"></div>
          <span>Waiting for me</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border"></div>
          <span>Being attended by another provider</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border"></div>
          <span>Priority / Long wait</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-4 items-start">
        <input
          type="text"
          placeholder="Search by name or service..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border p-2 rounded w-full md:w-1/3"
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filterMyWaiting}
            onChange={e => setFilterMyWaiting(e.target.checked)}
          />
          Show only my waiting patients
        </label>
      </div>

      {filteredPatients.length === 0 ? (
        <p>No patients found.</p>
      ) : (
        <table className="w-full table-auto border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Name</th>
              <th className="border px-4 py-2 text-left">Service</th>
              <th className="border px-4 py-2 text-left">Phone</th>
              <th className="border px-4 py-2 text-left">Status</th>
              <th className="border px-4 py-2 text-left">Provider</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map(p => (
              <tr key={p.id} className={`${getRowColor(p)} border-t`}>
                <td className="border px-4 py-2">{p.name}</td>
                <td className="border px-4 py-2">{p.service}</td>
                <td className="border px-4 py-2">{p.phone}</td>
                <td className="border px-4 py-2 capitalize">{p.status}</td>
                <td className="border px-4 py-2">
                  {p.providerId === providerId ? 'Me' : p.providerId || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
