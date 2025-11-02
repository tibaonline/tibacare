'use client';
import { useState } from 'react';
import jsPDF from 'jspdf';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ImagingRequestPage() {
  const [form, setForm] = useState({
    name: '',
    age: '',
    sex: '',
    date: '',
    history: '',
    imaging: '',
    doctor: ''
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
        doc.text('TibaCare - Imaging Request Form', 20, 20);

        doc.setFontSize(12);
        doc.setLineHeightFactor(1.6);

        doc.text(`Patient Name: ${form.name}`, 20, 35);
        doc.text(`Age: ${form.age}   Sex: ${form.sex}`, 20, 43);
        doc.text(`Date: ${form.date}`, 20, 51);

        doc.text('Brief History:', 20, 65);
        doc.text(form.history || '-', 30, 73, { maxWidth: 160 });

        doc.text('Imaging Requested:', 20, 90);
        doc.text(form.imaging || '-', 30, 98, { maxWidth: 160 });

        doc.text(`Requesting Doctor: ${form.doctor}`, 20, 115);

        doc.setFontSize(10);
        doc.text(`Issued on: ${issuedOn}`, 20, 121);
        doc.text('© 2025 TibaCare. All rights reserved.', 20, 128);

        resolve(doc.output('blob'));
      };
    });
  };

  // ✅ Download PDF directly
  const handleDownload = async () => {
    const pdfBlob = await generatePDF();
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'imaging-request.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ✅ Send via WhatsApp
  const handleSendWhatsApp = async () => {
    try {
      const pdfBlob = await generatePDF();

      // Upload to Firebase
      const storage = getStorage();
      const fileName = `imaging-requests/${form.name}-${Date.now()}.pdf`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, pdfBlob);

      // Get public URL
      const fileURL = await getDownloadURL(storageRef);

      // Call API to send WhatsApp
      const res = await fetch('/api/sendWhatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: '254705575068', // ⚡ change dynamically per patient
          pdfName: `ImagingRequest-${form.name}.pdf`,
          fileURL,
          textMessage: `Hello ${form.name}, your imaging request has been issued.`
        })
      });

      const data = await res.json();
      if (data.success) alert('✅ Imaging request sent via WhatsApp!');
      else alert('❌ Error: ' + data.message);

    } catch (err: any) {
      console.error(err);
      alert('❌ Error sending imaging request: ' + err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 mt-20 bg-white shadow rounded">
      <h1 className="text-2xl font-bold text-green-700 mb-6">Imaging Request</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input type="text" name="name" placeholder="Patient Name" value={form.name} onChange={handleChange} className="border p-2 rounded"/>
        <input type="text" name="age" placeholder="Age" value={form.age} onChange={handleChange} className="border p-2 rounded"/>
        <input type="text" name="sex" placeholder="Sex" value={form.sex} onChange={handleChange} className="border p-2 rounded"/>
        <input type="date" name="date" value={form.date} onChange={handleChange} className="border p-2 rounded"/>
        <textarea name="history" placeholder="Brief History" value={form.history} onChange={handleChange} className="border p-2 rounded md:col-span-2" rows={3}/>
        <textarea name="imaging" placeholder="Imaging Required" value={form.imaging} onChange={handleChange} className="border p-2 rounded md:col-span-2" rows={2}/>
        <input type="text" name="doctor" placeholder="Requesting Doctor" value={form.doctor} onChange={handleChange} className="border p-2 rounded md:col-span-2"/>
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
