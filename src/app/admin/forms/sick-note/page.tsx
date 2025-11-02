'use client';
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function SickNotePage() {
  const [form, setForm] = useState({
    name: '',
    age: '',
    sex: '',
    days: '3',
    doctor: '',
    date: ''
  });

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setForm((prev) => ({ ...prev, date: today }));
  }, []);

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
        doc.text('TibaCare - Sick Note', 20, 20);

        doc.setFontSize(12);
        doc.setLineHeightFactor(1.6);

        doc.text(`Patient Name: ${form.name}`, 20, 35);
        doc.text(`Age: ${form.age}     Sex: ${form.sex}`, 20, 43);
        doc.text(`Date: ${form.date}`, 20, 51);

        const message = `This is to certify that the named person was attended to and evaluated unfit to perform normal duties and has been recommended ${form.days} day(s) of convalescence at home.`;
        doc.text(message, 20, 70, { maxWidth: 170 });

        doc.text(`Attending Doctor: ${form.doctor}`, 20, 100);

        doc.setFontSize(10);
        doc.text(`Issued on: ${issuedOn}`, 20, 110);
        doc.text('© 2025 TibaCare. All rights reserved.', 20, 117);

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
    a.download = 'sick-note.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ✅ Send via WhatsApp
  const handleSendWhatsApp = async () => {
    try {
      const pdfBlob = await generatePDF();

      // Upload PDF to Firebase
      const storage = getStorage();
      const fileName = `sick-notes/${form.name}-${Date.now()}.pdf`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, pdfBlob);

      // Get download URL
      const fileURL = await getDownloadURL(storageRef);

      // Call API route to send WhatsApp
      const res = await fetch('/api/sendWhatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: '254705575068', // ⚡ Make dynamic
          pdfName: `SickNote-${form.name}.pdf`,
          fileURL,
          textMessage: `Hello ${form.name}, your sick note has been issued by your doctor.`
        })
      });

      const data = await res.json();
      if (data.success) alert('✅ Sick note sent via WhatsApp!');
      else alert('❌ Error: ' + data.message);

    } catch (err: any) {
      console.error(err);
      alert('❌ Error sending sick note: ' + err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 mt-20 bg-white shadow rounded">
      <h1 className="text-2xl font-bold text-green-700 mb-6">Sick Note Generator</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input type="text" name="name" placeholder="Patient Name" value={form.name} onChange={handleChange} className="border p-2 rounded" required />
        <input type="text" name="age" placeholder="Age" value={form.age} onChange={handleChange} className="border p-2 rounded" required />
        <input type="text" name="sex" placeholder="Sex" value={form.sex} onChange={handleChange} className="border p-2 rounded" />
        <input type="date" name="date" value={form.date} onChange={handleChange} className="border p-2 rounded" />
        <input type="number" name="days" placeholder="Recommended Sick-Off Days" value={form.days} onChange={handleChange} className="border p-2 rounded" min="1" />
        <input type="text" name="doctor" placeholder="Doctor Name" value={form.doctor} onChange={handleChange} className="border p-2 rounded" />
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
