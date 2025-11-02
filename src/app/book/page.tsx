'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';

export default function BookPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [service, setService] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const services = [
    'Pediatrics',
    'Reproductive Health',
    'Mental Health',
    'Physician',
    'Dermatology',
    'General Consultation',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !service) {
      toast.error('Full Name, Phone, and Service are required.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        patientName: fullName,   // 🟢 match provider dashboard fields
        age,
        phone,
        preferredDate,
        preferredTime,
        service,
        symptoms,
        allergies,
        medicalHistory,
        status: 'Pending',
        createdAt: serverTimestamp(),
      });
      toast.success('Consultation booked successfully!');
      router.push('/patient-dashboard');
    } catch (err) {
      console.error(err);
      toast.error('Failed to book consultation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow mt-10">
      <Toaster position="top-center" />
      <h1 className="text-2xl font-bold mb-4">Book a Consultation</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input type="text" placeholder="Full Name*" value={fullName} onChange={(e) => setFullName(e.target.value)} className="border p-2 rounded" required />
        <input type="number" placeholder="Age" value={age} onChange={(e) => setAge(e.target.value)} className="border p-2 rounded" />
        <input type="text" placeholder="Phone / WhatsApp*" value={phone} onChange={(e) => setPhone(e.target.value)} className="border p-2 rounded" required />
        <input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} className="border p-2 rounded" />
        <input type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} className="border p-2 rounded" />
        <select value={service} onChange={(e) => setService(e.target.value)} className="border p-2 rounded" required>
          <option value="">-- Select Service --</option>
          {services.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <textarea placeholder="Symptoms / Reason" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className="border p-2 rounded" rows={3} />
        <textarea placeholder="Allergies" value={allergies} onChange={(e) => setAllergies(e.target.value)} className="border p-2 rounded" rows={2} />
        <textarea placeholder="Medical History" value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} className="border p-2 rounded" rows={2} />

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="bg-green-600 text-white p-2 rounded hover:bg-green-700 flex-1">
            {submitting ? 'Submitting...' : 'Submit Consultation'}
          </button>
          <button type="button" onClick={() => router.push('/')} className="bg-gray-400 text-white p-2 rounded hover:bg-gray-500 flex-1">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
