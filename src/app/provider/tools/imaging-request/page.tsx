'use client';

import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ImagingRequestPage() {
  const [form, setForm] = useState({
    name: '',
    age: '',
    sex: '',
    phone: '',
    date: '',
    history: '',
    imaging: '',
    doctor: ''
  });

  const [downloadLink, setDownloadLink] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setForm((prev) => ({ ...prev, date: today }));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const logo = new Image();
    logo.src = '/tibacare-logo.png';

    const stamp = new Image();
    stamp.src = '/tibacare_stamp_fullcircle.png';

    const issuedOn = new Date().toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });

    return new Promise<Blob>((resolve) => {
      logo.onload = () => {
        stamp.onload = () => {
          let y = 10;

          // Logo
          try {
            doc.addImage(logo, 'PNG', 75, y, 60, 25);
            y += 30;
          } catch {
            y += 10; // fallback spacing if logo fails
          }

          // Title & tagline
          doc.setFontSize(18);
          doc.setFont("helvetica", "bold");
          doc.text('TibaCare - Imaging Request', 105, y, { align: 'center' });
          y += 6;
          doc.setFontSize(11);
          doc.setFont("helvetica", "normal");
          doc.text('Your Trusted Telemedicine Partner', 105, y, { align: 'center' });
          y += 6;

          // Top separator
          doc.setLineWidth(0.5);
          doc.line(20, y, 190, y);
          y += 10;

          // Patient Info
          doc.setFontSize(12);
          doc.setLineHeightFactor(1.6);
          doc.text(`Patient Name: ${form.name}`, 20, y); y += 8;
          doc.text(`Age: ${form.age}     Sex: ${form.sex}`, 20, y); y += 8;
          doc.text(`Phone: ${form.phone}`, 20, y); y += 8;
          doc.text(`Date: ${form.date}`, 20, y); y += 12;

          // Brief History
          doc.setFont('helvetica', 'bold');
          doc.text('Brief History:', 20, y); y += 8;
          doc.setFont('helvetica', 'normal');
          const historyText = doc.splitTextToSize(form.history || '-', 170);
          doc.text(historyText, 30, y);
          y += historyText.length * 8 + 4;

          // Imaging Requested
          doc.setFont('helvetica', 'bold');
          doc.text('Imaging Requested:', 20, y); y += 8;
          doc.setFont('helvetica', 'normal');
          const imagingText = doc.splitTextToSize(form.imaging || '-', 170);
          doc.text(imagingText, 30, y);
          y += imagingText.length * 8 + 4;

          // Doctor
          doc.setFont('helvetica', 'normal');
          doc.text(`Requesting Doctor: ${form.doctor}`, 20, y);
          y += 12;

          // Bottom separator
          doc.setLineWidth(0.5);
          doc.line(20, y, 190, y);
          y += 15;

          // Footer (with phone & email included)
          const footerStartY = y;
          doc.setFontSize(10);
          doc.text('P.O. Box 20625 - 00200, Nairobi, Kenya', 20, y);
          y += 6;
          doc.text('Phone: +254 705 575 068 | Email: info@tibacare.com', 20, y);
          y += 6;
          doc.text(`Issued on: ${issuedOn}`, 20, y);
          y += 6;
          doc.text('© 2025 TibaCare. All rights reserved.', 20, y);

          // Add professional medical blue stamp on right
          const stampWidth = 50;
          const stampHeight = 50;
          const stampX = 120;
          const stampY = footerStartY + 5;

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imgW = stamp.width || 200;
            const imgH = stamp.height || 200;
            canvas.width = imgW;
            canvas.height = imgH;

            // Draw stamp
            ctx.drawImage(stamp, 0, 0, canvas.width, canvas.height);

            // Apply professional blue color
            ctx.globalCompositeOperation = 'source-in';
            ctx.fillStyle = '#1e40af';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Subtle texture
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 0.9;
            for (let i = 0; i < 20; i++) {
              const rx = Math.random() * canvas.width;
              const ry = Math.random() * canvas.height;
              const size = Math.random() * 1.2 + 0.3;
              ctx.fillStyle = Math.random() > 0.5 ? '#1e3a8a' : '#3730a3';
              ctx.fillRect(rx, ry, size, size);
            }

            const stampDataURL = canvas.toDataURL('image/png');
            doc.addImage(stampDataURL, 'PNG', stampX, stampY, stampWidth, stampHeight);

            // Stamp text (bold)
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(100);
            doc.text('Medical Certification', stampX + 5, stampY + stampHeight + 6);

            // Faint square border
            doc.setDrawColor(170);
            doc.setLineWidth(0.25);
            doc.rect(stampX - 2, stampY - 2, stampWidth + 4, stampHeight + 4);
          }

          resolve(doc.output('blob'));
        };
      };
    });
  };

  const handleDownload = async () => {
    const pdfBlob = await generatePDF();
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ImagingRequest-${form.name}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateLink = async () => {
    try {
      const pdfBlob = await generatePDF();
      const pdfFile = new File([pdfBlob], `ImagingRequest-${form.name}.pdf`, { type: 'application/pdf' });

      const storage = getStorage();
      const fileName = `imaging-requests/${form.name}-${Date.now()}.pdf`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, pdfFile);

      const fileURL = await getDownloadURL(storageRef);
      setDownloadLink(fileURL);
      alert('✅ Link generated! Share this with your patient.');
    } catch (err: any) {
      console.error(err);
      alert('❌ Error generating link: ' + err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 mt-10 bg-white shadow rounded">
      <div className="flex justify-center mb-4">
        <img src="/tibacare-logo.png" alt="TibaCare Logo" className="w-40"/>
      </div>

      <h1 className="text-2xl font-bold text-green-700 text-center mb-2">Imaging Request Form</h1>
      <p className="text-center text-sm mb-4">Fill in patient details to generate an official Imaging Request</p>
      <div className="border-t border-gray-400 mb-6"></div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input type="text" name="name" placeholder="Patient Name" value={form.name} onChange={handleChange} className="border p-2 rounded"/>
        <input type="text" name="age" placeholder="Age" value={form.age} onChange={handleChange} className="border p-2 rounded"/>
        <input type="text" name="sex" placeholder="Sex" value={form.sex} onChange={handleChange} className="border p-2 rounded"/>
        <input type="text" name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} className="border p-2 rounded"/>
        <input type="date" name="date" value={form.date} onChange={handleChange} className="border p-2 rounded"/>
        <textarea name="history" placeholder="Brief History" value={form.history} onChange={handleChange} className="border p-2 rounded md:col-span-2" rows={3}/>
        <textarea name="imaging" placeholder="Imaging Required" value={form.imaging} onChange={handleChange} className="border p-2 rounded md:col-span-2" rows={2}/>
        <input type="text" name="doctor" placeholder="Requesting Doctor" value={form.doctor} onChange={handleChange} className="border p-2 rounded md:col-span-2"/>
      </div>

      <div className="flex gap-4 justify-center mb-4">
        <button onClick={handleDownload} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">Download PDF</button>
        <button onClick={handleGenerateLink} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Generate Link</button>
      </div>

      {downloadLink && (
        <div className="text-center mt-2">
          <a href={downloadLink} target="_blank" rel="noreferrer" className="text-blue-600 underline">Click here for patient to download Imaging Request</a>
        </div>
      )}
    </div>
  );
}
