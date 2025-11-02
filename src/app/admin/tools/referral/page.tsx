'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ReferralPage() {
  const [form, setForm] = useState({
    name: '',
    age: '',
    sex: '',
    date: '',
    referralHospital: '',
    chiefComplaint: '',
    hpi: '',
    pastHistory: '',
    examination: '',
    investigations: '',
    treatment: '',
    diagnosis: '',
    doctor: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🔽 Generate PDF (used by both download & WhatsApp)
  const generatePDF = () => {
    const doc = new jsPDF();
    const logo = new Image();
    logo.src = '/tibacare-logo.png';

    return new Promise<Blob>((resolve) => {
      logo.onload = () => {
        doc.addImage(logo, 'PNG', 150, 10, 40, 20);

        doc.setFontSize(18);
        doc.text('TibaCare - Referral Letter', 20, 20);

        doc.setFontSize(12);
        doc.setLineHeightFactor(1.6);

        doc.text(`Name: ${form.name}`, 20, 35);
        doc.text(`Age: ${form.age}     Sex: ${form.sex}`, 20, 43);
        doc.text(`Date: ${form.date}`, 20, 51);
        doc.text(`Referral Hospital: ${form.referralHospital}`, 20, 59);

        doc.text('Chief Complaint:', 20, 70);
        doc.text(form.chiefComplaint, 30, 78);

        doc.text('History of Present Illness (HPI):', 20, 90);
        doc.text(form.hpi, 30, 98);

        doc.text('Past Medical/Surgical History:', 20, 110);
        doc.text(form.pastHistory, 30, 118);

        doc.text('Examination Findings:', 20, 130);
        doc.text(form.examination, 30, 138);

        doc.text('Investigations:', 20, 150);
        doc.text(form.investigations, 30, 158);

        doc.text('Treatment Provided:', 20, 170);
        doc.text(form.treatment, 30, 178);

        doc.text('Diagnosis:', 20, 190);
        doc.text(form.diagnosis, 30, 198);

        doc.text(`Referring Doctor: ${form.doctor}`, 20, 210);

        doc.setFontSize(10);
        const issuedOn = new Date().toLocaleString();
        doc.text(`Issued on: ${issuedOn}`, 20, 280);

        doc.text('© 2025 TibaCare. All rights reserved.', 20, 285);

        resolve(doc.output('blob')); // return Blob
      };
    });
  };

  // ✅ Download PDF directly
  const handleDownload = async () => {
    const pdfBlob = await generatePDF();
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'referral.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ✅ Upload & Send via WhatsApp
  const handleSendWhatsApp = async () => {
    try {
      const pdfBlob = await generatePDF();

      // Upload to Firebase Storage
      const storage = getStorage();
      const fileName = `referrals/${form.name}-${Date.now()}.pdf`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, pdfBlob);

      // Get file link
      const fileURL = await getDownloadURL(storageRef);

      // Send via WhatsApp API
      const res = await fetch('/api/sendWhatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: '254705575068', // ⚡ Replace dynamically
          pdfName: `Referral-${form.name}.pdf`,
          fileURL,
          textMessage: `Hello ${form.name}, your referral letter has been shared with ${form.referralHospital}.`
        })
      });

      const data = await res.json();
      if (data.success) alert('✅ Referral sent via WhatsApp!');
      else alert('❌ Error: ' + data.message);

    } catch (err: any) {
      console.error(err);
      alert('❌ Error sending referral: ' + err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 mt-20 bg-white shadow rounded">
      <h1 className="text-2xl font-bold text-green-700 mb-6">Referral Form</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input type="text" name="name" placeholder="Patient Name" value={form.name} onChange={handleChange} className="border p-2 rounded" />
        <input type="text" name="age" placeholder="Age" value={form.age} onChange={handleChange} className="border p-2 rounded" />
        <input type="text" name="sex" placeholder="Sex" value={form.sex} onChange={handleChange} className="border p-2 rounded" />
        <input type="date" name="date" placeholder="Date" value={form.date} onChange={handleChange} className="border p-2 rounded" />
        <input type="text" name="referralHospital" placeholder="Referral Hospital" value={form.referralHospital} onChange={handleChange} className="border p-2 rounded" />
        <input type="text" name="chiefComplaint" placeholder="Chief Complaint" value={form.chiefComplaint} onChange={handleChange} className="border p-2 rounded" />
      </div>

      <textarea name="hpi" rows={2} placeholder="History of Present Illness (HPI)" value={form.hpi} onChange={handleChange} className="border p-2 rounded w-full mb-4" />
      <textarea name="pastHistory" rows={2} placeholder="Past Medical/Surgical History" value={form.pastHistory} onChange={handleChange} className="border p-2 rounded w-full mb-4" />
      <textarea name="examination" rows={2} placeholder="Examination Findings" value={form.examination} onChange={handleChange} className="border p-2 rounded w-full mb-4" />
      <textarea name="investigations" rows={2} placeholder="Investigations" value={form.investigations} onChange={handleChange} className="border p-2 rounded w-full mb-4" />
      <textarea name="treatment" rows={2} placeholder="Treatment Provided" value={form.treatment} onChange={handleChange} className="border p-2 rounded w-full mb-4" />
      <textarea name="diagnosis" rows={2} placeholder="Diagnosis" value={form.diagnosis} onChange={handleChange} className="border p-2 rounded w-full mb-6" />

      <input type="text" name="doctor" placeholder="Referring Doctor" value={form.doctor} onChange={handleChange} className="border p-2 rounded w-full mb-6" />

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
