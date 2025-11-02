'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function LabRequestPage() {
  const [form, setForm] = useState({
    name: '',
    age: '',
    sex: '',
    date: '',
    history: '',
    investigation: '',
    doctor: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const issuedOn = new Date().toLocaleString();

    // Branding
    const logo = new Image();
    logo.src = '/tibacare-logo.png';
    doc.addImage(logo, 'PNG', 150, 10, 40, 20);

    // Title
    doc.setFontSize(18);
    doc.text('TibaCare - Lab Request', 20, 20);

    // Patient details
    doc.setFontSize(12);
    doc.setLineHeightFactor(1.6);
    doc.text(`Name: ${form.name}`, 20, 40);
    doc.text(`Age: ${form.age}`, 20, 48);
    doc.text(`Sex: ${form.sex}`, 20, 56);
    doc.text(`Date: ${form.date}`, 20, 64);

    // History
    doc.text('History:', 20, 80);
    doc.text(form.history || '-', 30, 88, { maxWidth: 160 });

    // Investigations
    doc.text('Investigations Requested:', 20, 110);
    doc.text(form.investigation || '-', 30, 118, { maxWidth: 160 });

    // Doctor
    doc.text(`Requested by: ${form.doctor}`, 20, 140);

    // Footer
    doc.setFontSize(10);
    doc.text(`Issued on: ${issuedOn}`, 20, 155);
    doc.text('© 2025 TibaCare. All rights reserved.', 20, 162);

    return doc;
  };

  const handleDownload = () => {
    const doc = generatePDF();
    doc.save(`LabRequest-${form.name}.pdf`);
  };

  const handleSendWhatsApp = async () => {
    try {
      const doc = generatePDF();
      const pdfBlob = doc.output('blob');

      const storage = getStorage();
      const fileName = `lab-requests/${form.name}-${Date.now()}.pdf`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, pdfBlob);
      const fileURL = await getDownloadURL(storageRef);

      const res = await fetch('/api/sendWhatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: '254705575068', // update dynamically if needed
          pdfName: `LabRequest-${form.name}.pdf`,
          fileURL,
          textMessage: `Hello ${form.name}, your lab request has been issued by your provider.`
        })
      });

      const data = await res.json();
      if (data.success) alert('✅ Lab Request sent via WhatsApp!');
      else alert('❌ Error: ' + data.message);

    } catch (err: any) {
      console.error(err);
      alert('❌ Error sending lab request: ' + err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 mt-20 bg-white shadow rounded">
      <h1 className="text-2xl font-bold text-green-700 mb-6">Laboratory Request Form</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input type="text" name="name" placeholder="Patient Name" value={form.name} onChange={handleChange} className="border p-2 rounded"/>
        <input type="text" name="age" placeholder="Age" value={form.age} onChange={handleChange} className="border p-2 rounded"/>
        <input type="text" name="sex" placeholder="Sex" value={form.sex} onChange={handleChange} className="border p-2 rounded"/>
        <input type="date" name="date" value={form.date} onChange={handleChange} className="border p-2 rounded"/>
      </div>

      <textarea name="history" placeholder="History" value={form.history} onChange={handleChange} className="border p-2 rounded w-full mb-4"/>
      <textarea name="investigation" placeholder="Investigations Requested" value={form.investigation} onChange={handleChange} className="border p-2 rounded w-full mb-4"/>
      <input type="text" name="doctor" placeholder="Requesting Doctor" value={form.doctor} onChange={handleChange} className="border p-2 rounded w-full mb-4"/>

      <div className="flex gap-4">
        <button onClick={handleDownload} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
          Download PDF
        </button>
        <button onClick={handleSendWhatsApp} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
          Send via WhatsApp
        </button>
      </div>
    </div>
  );
}
