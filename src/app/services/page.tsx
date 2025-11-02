'use client';

import React, { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast, { Toaster } from 'react-hot-toast';

interface Service {
  title: string;
  emoji: string;
  desc: string;
  price: number;
}

interface PreConsultation {
  id: string;
  patientName: string;
  age: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  service: string;
  symptoms: string;
  files?: string[];
  status: string;
  createdAt: any;
}

export default function ServicesPage() {
  const [showPreConsultForm, setShowPreConsultForm] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [preConsultations, setPreConsultations] = useState<PreConsultation[]>([]);

  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    phone: '',
    preferredDate: '',
    preferredTime: '',
    service: '',
    symptoms: '',
  });

  const services: Service[] = [
    { emoji: '👶', title: 'Pediatrics', desc: 'Care for children', price: 350 },
    { emoji: '❤️', title: 'Reproductive Health', desc: 'Confidential reproductive services', price: 500 },
    { emoji: '🧠', title: 'Mental Health', desc: 'Counseling & support', price: 500 },
    { emoji: '🩺', title: 'Physician', desc: 'Comprehensive checkups', price: 500 },
    { emoji: '🤒', title: 'Dermatology', desc: 'Skin diagnosis & treatment', price: 350 },
    { emoji: '📞', title: 'General Consultation', desc: 'Talk to a doctor', price: 350 },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setMediaFiles([...Array.from(e.target.files)]);
  };

  const validateForm = () => {
    if (!formData.patientName || !formData.phone || !formData.service) {
      toast.error('Please fill all required fields: Name, Phone, and Service.');
      return false;
    }
    return true;
  };

  const submitPreConsultation = async () => {
    if (!validateForm()) return;
    setUploading(true);

    try {
      const fileUrls: string[] = [];
      for (const file of mediaFiles) {
        const fileRef = ref(storage, `preconsultation/${Date.now()}-${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        fileUrls.push(url);
      }

      await addDoc(collection(db, 'preconsultations'), {
        ...formData,
        files: fileUrls,
        status: 'Pending',
        createdAt: serverTimestamp(),
      });

      toast.success('✅ Pre-Consultation submitted successfully!');
      setFormData({ patientName: '', age: '', phone: '', preferredDate: '', preferredTime: '', service: '', symptoms: '' });
      setMediaFiles([]);
      setShowPreConsultForm(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit form.');
    } finally {
      setUploading(false);
    }
  };

  const whatsappNumber = '+254705895872';
  const startWhatsAppCall = (isVideo: boolean) => {
    let message = `Hello, I would like to chat with a healthcare provider about ${formData.service || 'consultation'}`;
    if (isVideo) message += ' (Video Call)';
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  useEffect(() => {
    const q = query(collection(db, 'preconsultations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      setPreConsultations(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen p-6 bg-gray-50 flex flex-col items-center">
      <Toaster position="top-center" reverseOrder={false} />
      <h1 className="text-4xl font-bold mb-6">Our Services</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl mb-6">
        {services.map(s => (
          <div key={s.title} className="bg-white shadow-md rounded-xl p-4 flex flex-col items-center">
            <div className="text-4xl mb-2">{s.emoji}</div>
            <h2 className="text-xl font-semibold">{s.title}</h2>
            <p className="text-gray-600 mb-2">{s.desc}</p>
            <p className="font-medium mb-2">Price: KES {s.price}</p>
          </div>
        ))}
      </div>

      {/* Patient Pre-Consultation Form */}
      <button
        onClick={() => setShowPreConsultForm(prev => !prev)}
        className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 mb-4"
      >
        {showPreConsultForm ? 'Hide Pre-Consultation Form' : 'Fill Detailed Pre-Consultation Form'}
      </button>

      {showPreConsultForm && (
        <div className="w-full max-w-md bg-white p-6 rounded shadow-md space-y-3 mb-8">
          {/** Form fields same as earlier, fully functional */}
          <label>Patient Name*</label>
          <input name="patientName" value={formData.patientName} onChange={handleInputChange} className="w-full border p-2 rounded" />
          <label>Age</label>
          <input name="age" type="number" value={formData.age} onChange={handleInputChange} className="w-full border p-2 rounded" />
          <label>Phone / WhatsApp*</label>
          <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full border p-2 rounded" />
          <label>Preferred Date</label>
          <input name="preferredDate" type="date" value={formData.preferredDate} onChange={handleInputChange} className="w-full border p-2 rounded" />
          <label>Preferred Time</label>
          <input name="preferredTime" type="time" value={formData.preferredTime} onChange={handleInputChange} className="w-full border p-2 rounded" />
          <label>Select Service*</label>
          <select name="service" value={formData.service} onChange={handleInputChange} className="w-full border p-2 rounded">
            <option value="">-- Choose Service --</option>
            {services.map(s => <option key={s.title} value={s.title}>{s.title}</option>)}
          </select>
          <label>Symptoms / Reason</label>
          <textarea name="symptoms" value={formData.symptoms} onChange={handleInputChange} rows={3} className="w-full border p-2 rounded" />
          <label>Upload Files</label>
          <input type="file" multiple onChange={handleFileUpload} className="w-full mt-1" />
          {mediaFiles.length > 0 && <p className="text-sm text-gray-600">Files: {mediaFiles.map(f => f.name).join(', ')}</p>}

          <button onClick={submitPreConsultation} disabled={uploading} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mt-2">
            {uploading ? 'Submitting...' : 'Submit Pre-Consultation'}
          </button>

          <div className="flex gap-3 mt-3">
            <button onClick={() => startWhatsAppCall(false)} className="bg-green-500 text-white px-3 py-2 rounded flex-1">WhatsApp Chat</button>
            <button onClick={() => startWhatsAppCall(true)} className="bg-blue-500 text-white px-3 py-2 rounded flex-1">Video Call</button>
          </div>
        </div>
      )}

      {/* Submitted Pre-Consultations */}
      <div className="w-full max-w-3xl">
        <h2 className="text-2xl font-semibold mb-4">Submitted Pre-Consultations</h2>
        {preConsultations.length === 0 ? <p className="text-gray-500">No submissions yet.</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded shadow">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="px-4 py-2">Patient</th>
                  <th className="px-4 py-2">Age</th>
                  <th className="px-4 py-2">Phone</th>
                  <th className="px-4 py-2">Service</th>
                  <th className="px-4 py-2">Preferred</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Files</th>
                </tr>
              </thead>
              <tbody>
                {preConsultations.map(pc => (
                  <tr key={pc.id} className="border-b">
                    <td className="px-4 py-2">{pc.patientName}</td>
                    <td className="px-4 py-2">{pc.age || '-'}</td>
                    <td className="px-4 py-2">{pc.phone}</td>
                    <td className="px-4 py-2">{pc.service}</td>
                    <td className="px-4 py-2">{pc.preferredDate} {pc.preferredTime}</td>
                    <td className="px-4 py-2">{pc.status}</td>
                    <td className="px-4 py-2">
                      {pc.files?.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline mr-2">File {i+1}</a>
                      )) || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
