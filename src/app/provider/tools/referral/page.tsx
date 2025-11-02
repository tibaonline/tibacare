'use client';
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ReferralPage() {
  const [form, setForm] = useState({
    name: '', age: '', sex: '', phone: '', date: '',
    referralHospital: '', complaint: '', hpi: '', pastHistory: '',
    examination: '', investigations: '', treatment: '', diagnosis: '', doctor: ''
  });

  const [downloadLink, setDownloadLink] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setForm(prev => ({ ...prev, date: today }));
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

    const issuedOn = new Date().toLocaleDateString('en-KE', { year:'numeric', month:'numeric', day:'numeric' });

    return new Promise<Blob>((resolve) => {
      logo.onload = () => {
        stamp.onload = () => {
          let y = 10;

          // Logo
          try { doc.addImage(logo, 'PNG', 75, y, 60, 25); y += 30; } 
          catch { y += 10; }

          // Title
          doc.setFontSize(18); doc.setFont("helvetica","bold");
          doc.text('TibaCare - Referral Letter', 105, y, { align:'center' });
          y += 8;
          doc.setFontSize(11); doc.setFont("helvetica","normal");
          doc.text('Your Trusted Telemedicine Partner', 105, y, { align:'center' });
          y += 6;

          // Top line
          doc.setLineWidth(0.5); doc.line(20, y, 190, y);
          y += 10;

          // Patient Info
          doc.setFontSize(12); doc.setLineHeightFactor(1.6);
          doc.text(`Patient Name: ${form.name}`, 20, y); y += 8;
          doc.text(`Age: ${form.age}     Sex: ${form.sex}`, 20, y); y += 8;
          doc.text(`Phone: ${form.phone}`, 20, y); y += 8;
          doc.text(`Date: ${form.date}`, 20, y); y += 12;

          // Referral info
          doc.setFont("helvetica","bold");
          doc.text(`Referred to: ${form.referralHospital}`, 20, y); y += 8;
          doc.setFont("helvetica","normal");
          const fields = [
            { label:'Chief Complaint', value: form.complaint },
            { label:'History of Present Illness', value: form.hpi },
            { label:'Past Medical/Surgical History', value: form.pastHistory },
            { label:'Examination', value: form.examination },
            { label:'Investigations', value: form.investigations },
            { label:'Treatment Given', value: form.treatment },
            { label:'Diagnosis', value: form.diagnosis }
          ];
          fields.forEach(f => {
            const splitText = doc.splitTextToSize(`${f.label}: ${f.value}`, 170);
            doc.text(splitText, 20, y);
            y += splitText.length * 8 + 4;
          });

          // Referring doctor
          doc.text(`Referring Doctor: ${form.doctor}`, 20, y);
          y += 4; // reduced space before bottom separator

          // Bottom line
          doc.setLineWidth(0.5); doc.line(20, y, 190, y);
          y += 10;

          // Footer
          const footerStartY = y;
          doc.setFontSize(10);
          doc.text('P.O. Box 20625 - 00200, Nairobi, Kenya', 20, footerStartY);
          doc.text('Phone: +254 705 575 068 | Email: info@tibacare.com', 20, footerStartY + 6);
          doc.text(`Issued on: ${issuedOn}`, 20, footerStartY + 12);
          doc.text('© 2025 TibaCare. All rights reserved.', 20, footerStartY + 18);

          // Stamp on right
          const stampWidth = 50; const stampHeight = 50;
          const stampX = 140; const stampY = footerStartY + 8;

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = stamp.width || 200; canvas.height = stamp.height || 200;
            ctx.drawImage(stamp, 0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-in';
            ctx.fillStyle = '#1e40af'; ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.9;
            for (let i=0;i<20;i++){
              const rx=Math.random()*canvas.width, ry=Math.random()*canvas.height, size=Math.random()*1.2+0.3;
              ctx.fillStyle = Math.random()>0.5 ? '#1e3a8a':'#3730a3';
              ctx.fillRect(rx, ry, size, size);
            }
            const stampDataURL = canvas.toDataURL('image/png');
            doc.addImage(stampDataURL, 'PNG', stampX, stampY, stampWidth, stampHeight);
            doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(100);
            doc.text('Medical Certification', stampX + 5, stampY + stampHeight + 6);
            doc.setDrawColor(170); doc.setLineWidth(0.25);
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
    const a = document.createElement('a'); a.href = url;
    a.download = `Referral-${form.name}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateLink = async () => {
    try {
      const pdfBlob = await generatePDF();
      const pdfFile = new File([pdfBlob], `Referral-${form.name}.pdf`, { type: 'application/pdf' });
      const storage = getStorage();
      const fileName = `referrals/${form.name}-${Date.now()}.pdf`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, pdfFile);
      const fileURL = await getDownloadURL(storageRef);
      setDownloadLink(fileURL);
      alert('✅ Link generated! Share this with your patient.');
    } catch (err: any) {
      console.error(err); alert('❌ Error generating link: ' + err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 mt-10 bg-white shadow rounded">
      <div className="flex justify-center mb-4">
        <img src="/tibacare-logo.png" alt="TibaCare Logo" className="w-40"/>
      </div>
      <h1 className="text-2xl font-bold text-green-700 text-center mb-2">Referral Letter Generator</h1>
      <p className="text-center text-sm mb-4">Fill in patient details to generate an official Referral Letter</p>
      <div className="border-t border-gray-400 mb-6"></div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input type="text" name="name" placeholder="Patient Name" value={form.name} onChange={handleChange} className="border p-2 rounded" required />
        <input type="text" name="age" placeholder="Age" value={form.age} onChange={handleChange} className="border p-2 rounded" required />
        <input type="text" name="sex" placeholder="Sex" value={form.sex} onChange={handleChange} className="border p-2 rounded" />
        <input type="text" name="phone" placeholder="Patient Phone Number" value={form.phone} onChange={handleChange} className="border p-2 rounded" required />
        <input type="date" name="date" value={form.date} onChange={handleChange} className="border p-2 rounded" />
        <input type="text" name="referralHospital" placeholder="Referral Hospital" value={form.referralHospital} onChange={handleChange} className="border p-2 rounded" />
        <input type="text" name="doctor" placeholder="Referring Doctor Name" value={form.doctor} onChange={handleChange} className="border p-2 rounded" />
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6">
        <textarea name="complaint" placeholder="Chief Complaint" value={form.complaint} onChange={handleChange} className="border p-2 rounded" rows={2}/>
        <textarea name="hpi" placeholder="History of Present Illness" value={form.hpi} onChange={handleChange} className="border p-2 rounded" rows={3}/>
        <textarea name="pastHistory" placeholder="Past Medical/Surgical History" value={form.pastHistory} onChange={handleChange} className="border p-2 rounded" rows={3}/>
        <textarea name="examination" placeholder="Examination" value={form.examination} onChange={handleChange} className="border p-2 rounded" rows={3}/>
        <textarea name="investigations" placeholder="Investigations" value={form.investigations} onChange={handleChange} className="border p-2 rounded" rows={3}/>
        <textarea name="treatment" placeholder="Treatment Given" value={form.treatment} onChange={handleChange} className="border p-2 rounded" rows={3}/>
        <textarea name="diagnosis" placeholder="Diagnosis" value={form.diagnosis} onChange={handleChange} className="border p-2 rounded" rows={2}/>
      </div>

      <div className="flex gap-4 justify-center mb-4">
        <button onClick={handleDownload} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">Download PDF</button>
        <button onClick={handleGenerateLink} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Generate Link</button>
      </div>

      {downloadLink && (
        <div className="text-center mt-2">
          <a href={downloadLink} target="_blank" rel="noreferrer" className="text-blue-600 underline">Click here for patient to download Referral Letter</a>
        </div>
      )}
    </div>
  );
}
