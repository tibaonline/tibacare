'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  setDoc,
  getDoc,
} from 'firebase/firestore';

// Provider tools
import PrescriptionForm from '@/components/tools/prescription/page';
import LabRequestForm from '@/components/tools/lab-request/page';
import SickNoteForm from '@/components/tools/sick-note/page';
import ReferralForm from '@/components/tools/referral/page';
import MedicalReportForm from '@/components/tools/medical-report/page';

type ToolKey = 'prescription' | 'labRequest' | 'sickNote' | 'referral' | 'medicalReport';

const DOC_OPTIONS = [
  { key: 'prescription', label: 'Prescription' },
  { key: 'labRequest', label: 'Lab Request' },
  { key: 'sickNote', label: 'Sick Note' },
  { key: 'referral', label: 'Referral' },
  { key: 'medicalReport', label: 'Medical Report' },
];

export default function PreConsultationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const preId = params.id as string;

  const [preConsult, setPreConsult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [showTool, setShowTool] = useState<Record<ToolKey, boolean>>({
    prescription: false,
    labRequest: false,
    sickNote: false,
    referral: false,
    medicalReport: false,
  });
  const [sendDocsMode, setSendDocsMode] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [consultationId, setConsultationId] = useState<string | null>(null);

  const user = auth.currentUser;

  // Fetch providers
  useEffect(() => {
    const fetchProviders = async () => {
      const provSnap = await getDocs(collection(db, 'providers'));
      const provs = provSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProviders(provs);
    };
    fetchProviders();
  }, []);

  // Fetch pre-consultation
  useEffect(() => {
    const docRef = doc(db, 'preconsultations', preId);
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setPreConsult(data);
        setSelectedProvider(data.assignedTo ?? '');

        // Check if consultation already exists
        const consultRef = doc(db, 'consultations', preId);
        const consultSnap = await getDoc(consultRef);
        if (consultSnap.exists()) {
          setConsultationId(consultRef.id);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [preId]);

  // Fetch shared files (from consultation)
  useEffect(() => {
    if (!consultationId) return;
    const sharedFilesRef = collection(db, 'consultations', consultationId, 'sharedFiles');
    const q = query(sharedFilesRef, orderBy('sharedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSharedFiles(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [consultationId]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!preConsult) return;
    setStatusUpdating(true);

    const preRef = doc(db, 'preconsultations', preId);
    await updateDoc(preRef, { status: newStatus, assignedTo: selectedProvider });

    if (consultationId) {
      const consultRef = doc(db, 'consultations', consultationId);
      await updateDoc(consultRef, { status: newStatus, assignedTo: selectedProvider });
    }

    setStatusUpdating(false);
  };

  // Create consultation from preconsultation
  const handleStartConsultation = async () => {
    if (!preConsult) return;

    const consultRef = doc(db, 'consultations', preId);
    const consultSnap = await getDoc(consultRef);

    if (!consultSnap.exists()) {
      await setDoc(consultRef, {
        ...preConsult,
        status: 'In-Progress',
        createdAt: serverTimestamp(),
        assignedTo: selectedProvider || user?.email || '',
      });
    }

    setConsultationId(consultRef.id);
    router.push(`/provider/consultations/${consultRef.id}`);
  };

  const toggleDocSelection = (key: string) => {
    setSelectedDocs((prev) => (prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]));
  };

  // Send files via WhatsApp Business API + open chat
  const confirmSendDocs = async () => {
    if (!consultationId || !preConsult) return;

    const phoneRaw = preConsult?.phoneNumber ?? '';
    if (!phoneRaw.trim()) {
      alert('❌ Patient phone number not available.');
      return;
    }

    let phoneIntl = phoneRaw.trim();
    if (phoneIntl.startsWith('0')) phoneIntl = '254' + phoneIntl.slice(1);
    else if (!phoneIntl.startsWith('254') && !phoneIntl.startsWith('+')) phoneIntl = '254' + phoneIntl;

    const consultRef = doc(db, 'consultations', consultationId);

    // Update Firestore
    await updateDoc(consultRef, { sharedDocs: selectedDocs });

    // Log and send each document
    for (const docType of selectedDocs) {
      const fileUrl = preConsult?.[`${docType}Url`] ?? '';
      if (!fileUrl) continue;

      await addDoc(collection(db, 'consultations', consultationId, 'sharedFiles'), {
        fileType: docType,
        sharedAt: serverTimestamp(),
        sharedWith: phoneIntl,
        patientName: preConsult?.patientName ?? 'Unknown',
        provider: user?.email ?? 'Unknown',
        fileUrl,
      });

      try {
        await fetch('/api/sendWhatsappDocument', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneIntl, fileUrl, filename: `${docType}.pdf` }),
        });
      } catch (err) {
        console.error('❌ WhatsApp API error:', err);
      }
    }

    const message = `Hello ${preConsult?.patientName ?? 'Patient'}, your ${selectedDocs.join(
      ', '
    )} document(s) have been shared by your provider.`;
    window.open(`https://wa.me/${phoneIntl}?text=${encodeURIComponent(message)}`, '_blank');

    alert(`✅ Shared documents via WhatsApp and logged successfully.`);

    setSendDocsMode(false);
    setSelectedDocs([]);
  };

  if (loading) return <p className="p-8 text-center text-blue-600">Loading Consultation...</p>;
  if (!preConsult) return <p className="p-8 text-center text-red-600">Pre-consultation not found.</p>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Patient Info */}
      <div className="bg-white p-6 rounded shadow space-y-2">
        <h2 className="text-xl font-semibold">{preConsult?.patientName ?? 'Unknown'}</h2>
        <p>Age: {preConsult?.age ?? 'N/A'}</p>
        <p>Service: {preConsult?.service ?? 'N/A'}</p>
        <p>Status: {preConsult?.status ?? 'Pending'}</p>
        <p>Symptoms: {preConsult?.symptoms ?? 'N/A'}</p>
        <p>Allergies: {preConsult?.allergies ?? 'N/A'}</p>
        <p>Medical History: {preConsult?.medicalHistory ?? 'N/A'}</p>
        <p>Preferred Date: {preConsult?.preferredDate ?? 'Not set'}</p>
        <p>Preferred Time: {preConsult?.preferredTime ?? 'Not set'}</p>
        <p>Assigned To: {selectedProvider || 'Unassigned'}</p>
        <p>Phone: {preConsult?.phoneNumber ?? 'Not provided'}</p>
      </div>

      {/* Provider Tools */}
      {consultationId && (
        <div className="bg-white p-6 rounded shadow space-y-4">
          <h3 className="text-lg font-semibold">Provider Tools</h3>
          {DOC_OPTIONS.map((docOpt) => (
            <div key={docOpt.key}>
              <button
                className="w-full text-left bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
                onClick={() => setShowTool((prev) => ({ ...prev, [docOpt.key]: !prev[docOpt.key] }))}
              >
                {docOpt.label}
              </button>
              {showTool[docOpt.key] && (
                <>
                  {docOpt.key === 'prescription' && <PrescriptionForm consultationId={consultationId} />}
                  {docOpt.key === 'labRequest' && <LabRequestForm consultationId={consultationId} />}
                  {docOpt.key === 'sickNote' && <SickNoteForm consultationId={consultationId} />}
                  {docOpt.key === 'referral' && <ReferralForm consultationId={consultationId} />}
                  {docOpt.key === 'medicalReport' && <MedicalReportForm consultationId={consultationId} />}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assign Provider */}
      <div className="bg-white p-6 rounded shadow space-y-2">
        <h3 className="font-semibold">Assign to Provider</h3>
        <select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          className="w-full border rounded p-2"
        >
          <option value="">-- Select Provider --</option>
          {providers.map((prov) => (
            <option key={prov.id} value={prov.email}>
              {prov.name}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleUpdateStatus('In-Progress')}
          disabled={statusUpdating || preConsult?.status === 'In-Progress'}
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        >
          Mark In-Progress
        </button>

        <button
          onClick={() => handleUpdateStatus('Completed')}
          disabled={statusUpdating || preConsult?.status === 'Completed'}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Mark Completed
        </button>

        {!consultationId && (
          <button
            onClick={handleStartConsultation}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Start Consultation
          </button>
        )}

        <button
          onClick={() => router.back()}
          className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
        >
          Back
        </button>

        {consultationId && (
          <button
            onClick={() => setSendDocsMode(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Send Files
          </button>
        )}
      </div>

      {/* Pick documents */}
      {sendDocsMode && (
        <div className="bg-white p-4 rounded shadow space-y-3">
          <h3 className="font-semibold">Select Documents to Share</h3>
          {DOC_OPTIONS.map((docOpt) => (
            <label key={docOpt.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedDocs.includes(docOpt.key)}
                onChange={() => toggleDocSelection(docOpt.key)}
              />
              {docOpt.label}
            </label>
          ))}

          <div className="flex gap-3 mt-3">
            <button
              onClick={confirmSendDocs}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Confirm Send
            </button>
            <button
              onClick={() => setSendDocsMode(false)}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Shared Files History */}
      {consultationId && (
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-semibold">Shared Files History</h3>
          {sharedFiles.length === 0 ? (
            <p className="text-gray-500 mt-2">No files shared yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {sharedFiles.map((file) => (
                <li key={file.id} className="border p-2 rounded bg-gray-50">
                  <p><strong>Type:</strong> {file.fileType}</p>
                  <p><strong>Shared With:</strong> {file.sharedWith}</p>
                  <p><strong>Patient:</strong> {file.patientName}</p>
                  <p><strong>Provider:</strong> {file.provider}</p>
                  <p><strong>Date:</strong> {file.sharedAt?.toDate().toLocaleString() || 'Pending...'}</p>
                  {file.fileUrl && (
                    <p>
                      <a href={file.fileUrl} target="_blank" className="text-blue-600 underline">
                        Open PDF
                      </a>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
