'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function BookConsultation() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Query params (optional pre-fill)
  const serviceQuery = searchParams.get('service') || '';
  const priceQuery = searchParams.get('price') || '';

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredDateTime, setPreferredDateTime] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Optional: prefill form from query params
  useEffect(() => {
    setFullName(searchParams.get('patientName') || '');
    setAge(searchParams.get('age') || '');
    setPhone(searchParams.get('phoneNumber') || '');
    setSymptoms(searchParams.get('symptoms') || '');
    setAllergies(searchParams.get('allergies') || '');
    setMedicalHistory(searchParams.get('medicalHistory') || '');
    setPreferredDateTime(searchParams.get('preferredDateTime') || '');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !age || !phone || !preferredDateTime) {
      alert('Please fill all required fields!');
      return;
    }

    setSubmitting(true);

    try {
      const docRef = await addDoc(collection(db, 'consultations'), {
        patientName: fullName,
        age,
        phoneNumber: phone,
        service: serviceQuery,
        price: Number(priceQuery),
        preferredDateTime: new Date(preferredDateTime).toISOString(),
        symptoms,
        allergies,
        medicalHistory,
        status: 'Pending',
        clinicalNotes: '',
        prescription: '',
        labRequest: '',
        sickNote: '',
        referral: '',
        medicalReport: '',
        createdAt: serverTimestamp(),
      });

      alert('Consultation booked successfully ✅');
      router.push(`/consultations/${docRef.id}`);
    } catch (err) {
      console.error(err);
      alert('Error creating consultation: ' + err);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-50 min-h-screen flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-blue-800">Book {serviceQuery || 'General'} Consultation</h1>

      <form className="bg-white p-6 rounded shadow space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block font-medium">Full Name *</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border rounded p-2"
            required
          />
        </div>

        <div>
          <label className="block font-medium">Age *</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full border rounded p-2"
            required
          />
        </div>

        <div>
          <label className="block font-medium">Phone Number *</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border rounded p-2"
            required
          />
        </div>

        <div>
          <label className="block font-medium">Preferred Date & Time *</label>
          <input
            type="datetime-local"
            value={preferredDateTime}
            onChange={(e) => setPreferredDateTime(e.target.value)}
            className="w-full border rounded p-2"
            required
          />
        </div>

        <div>
          <label className="block font-medium">Symptoms</label>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            className="w-full border rounded p-2"
            rows={3}
          />
        </div>

        <div>
          <label className="block font-medium">Allergies</label>
          <input
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">Medical History</label>
          <textarea
            value={medicalHistory}
            onChange={(e) => setMedicalHistory(e.target.value)}
            className="w-full border rounded p-2"
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          {submitting ? 'Booking...' : 'Book Consultation'}
        </button>
      </form>
    </div>
  );
}
