'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db, storage } from '@/firebase';
import { doc, onSnapshot, updateDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import jsPDF from 'jspdf';

type ToolKey = 'prescription' | 'labRequest' | 'sickNote' | 'referral' | 'medicalReport';

const toolNames: Record<ToolKey, string> = {
  prescription: 'Prescription',
  labRequest: 'Lab Request',
  sickNote: 'Sick Note',
  referral: 'Referral',
  medicalReport: 'Medical Report'
};

export default function PostConsultationPage() {
  const router = useRouter();
  const params = useParams();
  const consultationId = params.id;

  const [consultation, setConsultation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [sendingDocs, setSendingDocs] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<ToolKey[]>([]);

  const [clinicalNotes, setClinicalNotes] = useState('');
  const [tools, setTools] = useState<Record<ToolKey, string>>({
    prescription: '',
    labRequest: '',
    sickNote: '',
    referral: '',
    medicalReport: ''
  });

  const [showTool, setShowTool] = useState<Record<ToolKey, boolean>>({
    prescription: false,
    labRequest: false,
    sickNote: false,
    referral: false,
    medicalReport: false
  });

  const [consultationStarted, setConsultationStarted] = useState(false);

  // Fetch providers
  useEffect(() => {
    const fetchProviders = async () => {
      const provSnap = await getDocs(collection(db, 'providers'));
      const provs = provSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProviders(provs);
    };
    fetchProviders();
  }, []);

  // Fetch consultation
  useEffect(() => {
    if (!consultationId) return;
    const docRef = doc(db, 'consultations', consultationId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setConsultation({ id: docSnap.id, ...data });
        setClinicalNotes(data.clinicalNotes || '');
        setTools({
          prescription: data.prescription || '',
          labRequest: data.labRequest || '',
          sickNote: data.sickNote || '',
          referral: data.referral || '',
          medicalReport: data.medicalReport || ''
        });
        setSelectedProvider(data.assignedTo || '');
        setConsultationStarted(data.status === 'In-Progress');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [consultationId]);

  const handleToolChange = (key: ToolKey, value: string) => {
    setTools((prev) => ({ ...prev, [key]: value }));
  };

  const handleBlurSave = async () => {
    if (!consultation) return;
    const docRef = doc(db, 'consultations', consultationId);
    await updateDoc(docRef, {
      clinicalNotes,
      ...tools,
      assignedTo: selectedProvider
    });
    checkAutoComplete();
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!consultation) return;
    setStatusUpdating(true);
    const docRef = doc(db, 'consultations', consultationId);
    await updateDoc(docRef, { status: newStatus, assignedTo: selectedProvider });
    setStatusUpdating(false);
  };

  // Start Consultation
  const handleStartConsultation = async () => {
    if (!consultation) return;
    if (consultation.status === 'Pending') {
      await handleUpdateStatus('In-Progress');
    }
    setConsultationStarted(true);
  };

  // Auto-complete when provider finishes
  const checkAutoComplete = async () => {
    if (!consultation) return;
    const mandatoryFilled = clinicalNotes.trim() !== '';
    if (mandatoryFilled) {
      const docRef = doc(db, 'consultations', consultationId);
      await updateDoc(docRef, { status: 'Completed' });
    }
  };

  const generatePDF = async (type: ToolKey, content: string) => {
    if (!consultation) return '';
    const docPDF = new jsPDF();
    docPDF.setFontSize(18);
    docPDF.text(`${toolNames[type]} - ${consultation.patientName}`, 20, 20);

    docPDF.setFontSize(12);
    let y = 35;
    const lineGap = 8;

    docPDF.text(`Patient Name: ${consultation.patientName}`, 20, y); y += lineGap;
    docPDF.text(`Age: ${consultation.age}`, 20, y); y += lineGap;
    docPDF.text(`Service: ${consultation.service}`, 20, y); y += lineGap;
    docPDF.text(`Date: ${new Date().toLocaleDateString()}`, 20, y); y += lineGap;
    docPDF.text(`Preferred: ${consultation.preferredDateTime ? new Date(consultation.preferredDateTime).toLocaleString() : 'N/A'}`, 20, y); y += lineGap * 2;

    docPDF.setFont(undefined, 'bold');
    docPDF.text('Content:', 20, y); y += lineGap;
    docPDF.setFont(undefined, 'normal');
    docPDF.text(content || 'N/A', 20, y); y += lineGap * 2;

    const pdfBlob = docPDF.output('blob');
    const storageRef = ref(storage, `consultations/${consultation.id}/${type}.pdf`);
    await uploadBytes(storageRef, pdfBlob);
    return await getDownloadURL(storageRef);
  };

  const handleSendDocuments = async () => {
    if (!consultation) return;
    if (!consultation.phoneNumber) {
      alert('Patient phone number not found!');
      return;
    }
    if (selectedDocs.length === 0) {
      alert('Select at least one document to send!');
      return;
    }

    setSendingDocs(true);
    try {
      const urls: string[] = [];
      for (const key of selectedDocs) {
        if (tools[key]) {
          const url = await generatePDF(key, tools[key]);
          urls.push(url);
        }
      }

      if (urls.length === 0) {
        alert('No documents content to send!');
        setSendingDocs(false);
        return;
      }

      const message = encodeURIComponent(
        `Hello ${consultation.patientName}, your medical documents are ready:\n${urls.join('\n')}`
      );
      window.open(`https://wa.me/${consultation.phoneNumber}?text=${message}`, '_blank');
      alert('Documents sent via WhatsApp ✅');
    } catch (err) {
      console.error(err);
      alert('Error sending documents: ' + err);
    }
    setSendingDocs(false);
  };

  if (loading) return <p className="p-8 text-center text-blue-600">Loading Consultation...</p>;
  if (!consultation) return <p className="p-8 text-center text-red-600">Consultation not found.</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Patient Info */}
      <div className="bg-white p-6 rounded shadow space-y-2">
        <h2 className="text-xl font-semibold">{consultation.patientName}</h2>
        <p>Age: {consultation.age}</p>
        <p>Service: {consultation.service}</p>
        <p>Status: {consultation.status}</p>
        <p>Symptoms: {consultation.symptoms || 'N/A'}</p>
        <p>Allergies: {consultation.allergies || 'N/A'}</p>
        <p>Medical History: {consultation.medicalHistory || 'N/A'}</p>
        <p>Assigned To: {selectedProvider || 'Unassigned'}</p>
        <p>Phone: {consultation.phoneNumber || 'Not provided'}</p>
        <p>Preferred: {consultation.preferredDateTime ? new Date(consultation.preferredDateTime).toLocaleString() : 'Not provided'}</p>
      </div>

      {/* Start Consultation */}
      {!consultationStarted && consultation.status !== 'Completed' && (
        <button
          onClick={handleStartConsultation}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Start Consultation
        </button>
      )}

      {/* Consultation Interface */}
      {consultationStarted && (
        <>
          {/* Clinical Notes */}
          <div className="bg-white p-6 rounded shadow space-y-2">
            <h3 className="font-semibold">Clinical Notes</h3>
            <textarea
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              onBlur={handleBlurSave}
              className="w-full border rounded p-2"
              rows={4}
            />
          </div>

          {/* Provider Tools */}
          <div className="bg-white p-6 rounded shadow space-y-3">
            <h3 className="font-semibold">Provider Tools</h3>
            {(['prescription','labRequest','sickNote','referral','medicalReport'] as ToolKey[]).map((key) => (
              <div key={key}>
                <button
                  className="w-full text-left bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
                  onClick={() => setShowTool(prev => ({ ...prev, [key]: !prev[key] }))}
                >
                  {toolNames[key]}
                </button>
                {showTool[key] && (
                  <textarea
                    value={tools[key]}
                    onChange={(e) => handleToolChange(key, e.target.value)}
                    onBlur={handleBlurSave}
                    className="w-full border rounded p-2 mt-2"
                    rows={3}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Assign Provider */}
          <div className="bg-white p-6 rounded shadow space-y-2">
            <h3 className="font-semibold">Assign to Provider</h3>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full border rounded p-2"
              onBlur={handleBlurSave}
            >
              <option value="">-- Select Provider --</option>
              {providers.map((prov) => (
                <option key={prov.id} value={prov.email}>
                  {prov.name}
                </option>
              ))}
            </select>
          </div>

          {/* Document Selection & Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSendDocuments}
              disabled={sendingDocs}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              {sendingDocs ? 'Sending...' : 'Send Selected Documents'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
