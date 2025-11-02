'use client';
import { useState } from 'react';
import jsPDF from 'jspdf';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function PrescriptionPage() {
  const [form, setForm] = useState({
    name: '',
    age: '',
    weight: '',
    treatment: '',
    drug: '',
    dosage: '',
    frequency: '',
    prescriber: '',
    date: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ✅ Generate PDF as Blob
  const generatePDF = () => {
    const doc = new jsPDF();
    const logo = new Image();
    logo.src = '/tibacare-logo.png';
    const issuedOn = new Date().toLocaleString();

    return new Promise<Blob>((resolve) => {
      logo.onload = () => {
        doc.addImage(logo, 'PNG', 150, 10, 40, 20);

        doc.setFontSize(18);
        doc.text('TibaCare - Prescription', 20, 20);

        doc.setFontSize(12);
        doc.setLineHeightFactor(1.6);

        doc.text(`Patient Name: ${form.name}`, 20, 35);
        doc.text(`Age: ${form.age}     Weight: ${form.weight} kg`, 20, 43);
        doc.text(`Diagnosis: ${form.treatment}`, 20, 55);

        doc.text('Prescription:', 20, 70);
        doc.text(`- Drug: ${form.drug}`, 30, 78);
        doc.text(`- Dosage: ${form.dosage}`, 30, 86);
        doc.text(`- Frequency: ${form.frequency}`, 30, 94);

        doc.text(`Prescribed by: ${form.prescriber}`, 20, 110);
        doc.text(`Date: ${form.date}`, 20, 118);

        doc.setFontSize(10);
        doc.text(`Issued on: ${issuedOn}`, 20, 126);
        doc.text('© 2025 TibaCare. All rights reserved.', 20, 132);

        resolve(doc.output('blob'));
      };
    });
  };

  // ✅ Download PDF
  const handleDownload = async () => {
    const pdfBlob = await generatePDF();
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prescription.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ✅ Send via WhatsApp
  const handleSendWhatsApp = async () => {
    try {
      const pdfBlob = await generatePDF();

      // Upload PDF to Firebase
      const storage = getStorage();
      const fileName = `prescriptions/${form.name}-${Date.now()}.pdf`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, pdfBlob);

      // Get download URL
      const fileURL = await getDownloadURL(storageRef);

      // Call API route to send WhatsApp
      const res = await fetch('/api/sendWhatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: '254705575068', // ⚡ make dynamic if needed
          pdfName: `Prescription-${form.name}.pdf`,
          fileURL,
          textMessage: `Hello ${form.name}, here is your prescription issued by Dr. ${form.prescriber}.`
        })
      });

      const data = await res.json();
      if (data.success) alert('✅ Prescription sent via WhatsApp!');
      else alert('❌ Error: ' + data.message);

    } catch (err: any) {
      console.error(err);
      alert('❌ Error sending prescription: ' + err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 mt-20 bg-white shadow rounded">
      <h1 className="text-2xl font-bold text-green-700 mb-6">Prescription Form</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input type="text" name="name" placeholder="Patient Name" value={form.name} onChange={handleChange} className="border p-2 rounded" />
        <input type="text" name="age" placeholder="Age" value={form.age} onChange={handleChange} className="border p-2 rounded" />
        <input type="text" name="weight" placeholder="Weight (kg)" value={form.weight} onChange={handleChange} className="border p-2 rounded" />
        <input type="text" name="treatment" placeholder="Diagnosis / Treatment" value={form.treatment} onChange={handleChange} className="border p-2 rounded" />
        <input type="text" name="drug" placeholder="Drug Prescribed" value={form.drug} onChange={handleChange} className="border p-2 rounded" />
        <input type="text" name="dosage" placeholder="Dosage (e.g. 20mg)" value={form.dosage} onChange={handleChange} className="border p-2 rounded" />
        <input type="text" name="frequency" placeholder="Frequency (e.g. bd 5/7)" value={form.frequency} onChange={handleChange} className="border p-2 rounded" />
        <input type="text" name="prescriber" placeholder="Prescriber Name" value={form.prescriber} onChange={handleChange} className="border p-2 rounded" />
        <input type="date" name="date" value={form.date} onChange={handleChange} className="border p-2 rounded" />
      </div>

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
