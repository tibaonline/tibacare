'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';

// Wrap the main logic in a separate component that uses useSearchParams
function ConsultationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const serviceQuery = searchParams.get('service') || '';
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [service, setService] = useState(serviceQuery);
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
      toast.error('Patient Name, Phone, and Service are required.');
      return;
    }

    setSubmitting(true);
    try {
      // Create consultation in Firestore with proper data structure
      const docRef = await addDoc(collection(db, 'preconsultations'), {
        fullName,
        age,
        sex,
        phone,
        preferredDate,
        preferredTime,
        service,
        symptoms,
        allergies,
        medicalHistory,
        status: 'Pending',
        createdAt: serverTimestamp(),
        // Initialize clerking with empty fields
        clerking: {
          history: '',
          generalExam: '',
          ros: '',
          impression: '',
          plan: '',
        },
      });

      toast.success('Consultation created successfully!');

      // Navigate to the consultation detail page
      // Use the correct ID format that your ConsultationDetail component expects
      router.push(`/provider/consultations/post?id=${docRef.id}`);
      
    } catch (err) {
      console.error(err);
      toast.error('Failed to create consultation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow mt-10">
      <Toaster position="top-center" />
      <h1 className="text-2xl font-bold mb-4">New Consultation</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Patient Full Name*"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            placeholder="Age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="border p-2 rounded"
          />
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <input
          type="text"
          placeholder="Phone / WhatsApp*"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="time"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            className="border p-2 rounded"
          />
        </div>
        <select
          value={service}
          onChange={(e) => setService(e.target.value)}
          className="border p-2 rounded"
          required
        >
          <option value="">-- Select Service --</option>
          {services.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <textarea
          placeholder="Symptoms / Reason for visit"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          className="border p-2 rounded"
          rows={3}
        />
        <textarea
          placeholder="Known Allergies"
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          className="border p-2 rounded"
          rows={2}
        />
        <textarea
          placeholder="Medical History"
          value={medicalHistory}
          onChange={(e) => setMedicalHistory(e.target.value)}
          className="border p-2 rounded"
          rows={3}
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          {submitting ? 'Submitting...' : 'Create Consultation'}
        </button>
      </form>
    </div>
  );
}

// Main component with Suspense boundary
export default function NewConsultationPage() {
  return (
    <Suspense fallback={
      <div className="max-w-md mx-auto p-6 bg-white rounded shadow mt-10">
        <div className="text-center">Loading consultation form...</div>
      </div>
    }>
      <ConsultationForm />
    </Suspense>
  );
}