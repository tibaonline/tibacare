'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { db, auth } from '@/firebase';
import { doc, onSnapshot, updateDoc, deleteDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Provider tools imports
import PrescriptionForm from '@/app/provider/tools/prescription/page';
import LabRequestForm from '@/app/provider/tools/lab-request/page';
import SickNoteForm from '@/app/provider/tools/sick-note/page';
import ReferralForm from '@/app/provider/tools/referral/page';
import MedicalReportForm from '@/app/provider/tools/medical-report/page';
import ImagingRequestForm from '@/app/provider/tools/imaging-request/page';

type ToolKey =
  | 'prescription'
  | 'labRequest'
  | 'sickNote'
  | 'referral'
  | 'medicalReport'
  | 'imagingRequest';

const DOC_OPTIONS = [
  { key: 'prescription', label: 'Prescription' },
  { key: 'labRequest', label: 'Lab Request' },
  { key: 'sickNote', label: 'Sick Note' },
  { key: 'referral', label: 'Referral' },
  { key: 'medicalReport', label: 'Medical Report' },
  { key: 'imagingRequest', label: 'Imaging Request' },
];

interface ConsultationDetailProps {
  consultationId?: string;
  readOnly?: boolean;
}

// EXACT MATCH to Provider Dashboard structure
interface Vitals {
  bp?: string;
  hr?: string;
  rr?: string;
  temp?: string;
  spo2?: string;
  weight?: string;
  height?: string;
  bmi?: string;
  [key: string]: string | undefined;
}

interface ClerkingData {
  hpi?: string;
  generalExam?: string;
  systemExam?: string;
  investigations?: string;
  impression?: string;
  plan?: string;
  vitals?: Vitals;
  medications?: string;
  allergies?: string;
  pastMedicalHistory?: string;
}

export default function ConsultationDetail({ consultationId: propConsultationId, readOnly = false }: ConsultationDetailProps = {}) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const queryId = searchParams.get('id');
  const isViewOnly = searchParams.get('view') === 'true';
  
  const consultationId = queryId || propConsultationId || (params.id as string);
  
  const [consultation, setConsultation] = useState<any>(null);
  const [previousConsultations, setPreviousConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreviousConsultations, setShowPreviousConsultations] = useState(false);
  
  // EXACT MATCH to Provider Dashboard structure
  const [clerkingData, setClerkingData] = useState<ClerkingData>({});
  const [vitals, setVitals] = useState<Vitals>({});
  
  const [showClerking, setShowClerking] = useState(true);
  const [showTools, setShowTools] = useState(false);
  const [showTool, setShowTool] = useState<Record<ToolKey, boolean>>({
    prescription: false,
    labRequest: false,
    sickNote: false,
    referral: false,
    medicalReport: false,
    imagingRequest: false,
  });
  const [editMode, setEditMode] = useState(false);

  const user = auth.currentUser;
  const isAdmin = user?.email === 'humphreykiboi1@gmail.com';
  const isCompleted = consultation?.status === 'Completed';
  
  const finalReadOnly = readOnly || isViewOnly || (isCompleted && !isAdmin);

  // Field labels that EXACTLY match provider dashboard
  const clerkingFields = [
    { key: 'hpi', label: 'History of Presenting Illness (HPI)' },
    { key: 'generalExam', label: 'General Examination' },
    { key: 'systemExam', label: 'Systemic Examination' },
    { key: 'investigations', label: 'Investigations' },
    { key: 'impression', label: 'Impression / Diagnosis' },
    { key: 'plan', label: 'Plan / Treatment' },
    { key: 'medications', label: 'Medications' },
    { key: 'allergies', label: 'Allergies' }
  ];

  // Format date properly
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    
    try {
      if (date.toDate) {
        return date.toDate().toLocaleString();
      }
      if (date.seconds) {
        return new Date(date.seconds * 1000).toLocaleString();
      }
      if (typeof date === 'string') {
        return new Date(date).toLocaleString();
      }
      return String(date);
    } catch (error) {
      return String(date);
    }
  };

  // Format time properly
  const formatTime = (time: any) => {
    if (!time) return 'N/A';
    return String(time);
  };

  // Fetch previous consultations for the same patient
  const fetchPreviousConsultations = async (patientId: string, currentConsultationId: string) => {
    try {
      // Search in both collections
      const collections = ['preconsultations', 'consultations'];
      let allConsultations: any[] = [];

      for (const collectionName of collections) {
        let q;
        if (collectionName === 'consultations') {
          // For consultations collection, we need to handle the cons- prefix
          q = query(
            collection(db, collectionName),
            where('patientId', '==', patientId),
            orderBy('createdAt', 'desc')
          );
        } else {
          q = query(
            collection(db, collectionName),
            where('patientId', '==', patientId),
            orderBy('createdAt', 'desc')
          );
        }

        const querySnapshot = await getDocs(q);
        const consultations = querySnapshot.docs.map(doc => ({
          id: collectionName === 'consultations' ? `cons-${doc.id}` : doc.id,
          ...doc.data(),
          collection: collectionName
        }));

        allConsultations = [...allConsultations, ...consultations];
      }

      // Filter out current consultation and sort by date
      const previous = allConsultations
        .filter(consult => consult.id !== currentConsultationId)
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });

      setPreviousConsultations(previous);
    } catch (error) {
      console.error('Error fetching previous consultations:', error);
    }
  };

  // Fetch consultation - COMPLETELY FIXED DATA READING
  useEffect(() => {
    if (!consultationId) {
      setLoading(false);
      return;
    }

    const getCollectionAndDocId = (id: string): { collection: string; docId: string } => {
      if (id.startsWith('cons-')) {
        return { collection: 'consultations', docId: id.substring(5) };
      }
      return { collection: 'preconsultations', docId: id };
    };

    const { collection: collectionName, docId: documentId } = getCollectionAndDocId(consultationId);
    const docRef = doc(db, collectionName, documentId);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('🔥 RAW Consultation data:', data);
        
        // Set consultation data with proper field mapping
        const consultationData = { 
          id: docSnap.id, 
          ...data,
          // Map patient name correctly
          fullName: data.patientName || data.fullName || 'Unknown Patient',
          age: data.age || 'N/A',
          sex: data.sex || data.gender || '-',
          service: data.service || 'General Consultation',
          status: data.status || 'Unknown',
          symptoms: data.symptoms || '',
          allergies: data.allergies || '-',
          medicalHistory: data.medicalHistory || data.pastMedicalHistory || '-',
          phone: data.phone || 'Not provided',
          preferredDate: data.preferredDate,
          preferredTime: data.preferredTime,
          providerName: data.providerName || 'Unknown Provider',
          urgent: data.urgent || false,
          lastUpdated: data.lastUpdated,
          patientId: data.patientId || data.id // Use for fetching previous consultations
        };
        
        setConsultation(consultationData);
        
        // Fetch previous consultations if we have a patient ID
        if (consultationData.patientId) {
          fetchPreviousConsultations(consultationData.patientId, consultationId);
        }
        
        // EXACT MATCH: Read clerkingData exactly as saved by provider dashboard
        if (data.clerkingData && typeof data.clerkingData === 'object') {
          console.log('✅ Found clerkingData object:', data.clerkingData);
          const clerking = data.clerkingData;
          
          setClerkingData({
            hpi: clerking.hpi || '',
            generalExam: clerking.generalExam || '',
            systemExam: clerking.systemExam || '',
            investigations: clerking.investigations || '',
            impression: clerking.impression || '',
            plan: clerking.plan || '',
            medications: clerking.medications || 'none',
            allergies: clerking.allergies || 'none'
          });
          
          // Set vitals separately
          if (clerking.vitals && typeof clerking.vitals === 'object') {
            setVitals(clerking.vitals);
          }
        } else {
          console.log('❌ No clerkingData found, using empty structure');
          setClerkingData({
            hpi: '',
            generalExam: '',
            systemExam: '',
            investigations: '',
            impression: '',
            plan: '',
            medications: 'none',
            allergies: 'none'
          });
        }
        
        setLoading(false);
      } else {
        // Try the other collection if not found
        const otherCollection = collectionName === 'preconsultations' ? 'consultations' : 'preconsultations';
        const otherDocId = otherCollection === 'consultations' ? 'cons-' + consultationId : consultationId;
        const otherDocRef = doc(db, otherCollection, otherDocId);
        
        onSnapshot(otherDocRef, (otherDocSnap) => {
          if (otherDocSnap.exists()) {
            const data = otherDocSnap.data();
            console.log('🔄 Consultation data from alternate collection:', data);
            
            const consultationData = { 
              id: otherDocSnap.id, 
              ...data,
              fullName: data.patientName || data.fullName || 'Unknown Patient',
              age: data.age || 'N/A',
              sex: data.sex || data.gender || '-',
              service: data.service || 'General Consultation',
              status: data.status || 'Unknown',
              symptoms: data.symptoms || '',
              allergies: data.allergies || '-',
              medicalHistory: data.medicalHistory || data.pastMedicalHistory || '-',
              phone: data.phone || 'Not provided',
              preferredDate: data.preferredDate,
              preferredTime: data.preferredTime,
              providerName: data.providerName || 'Unknown Provider',
              urgent: data.urgent || false,
              lastUpdated: data.lastUpdated,
              patientId: data.patientId || data.id
            };
            
            setConsultation(consultationData);
            
            // Fetch previous consultations if we have a patient ID
            if (consultationData.patientId) {
              fetchPreviousConsultations(consultationData.patientId, consultationId);
            }
            
            if (data.clerkingData && typeof data.clerkingData === 'object') {
              const clerking = data.clerkingData;
              
              setClerkingData({
                hpi: clerking.hpi || '',
                generalExam: clerking.generalExam || '',
                systemExam: clerking.systemExam || '',
                investigations: clerking.investigations || '',
                impression: clerking.impression || '',
                plan: clerking.plan || '',
                medications: clerking.medications || 'none',
                allergies: clerking.allergies || 'none'
              });
              
              if (clerking.vitals && typeof clerking.vitals === 'object') {
                setVitals(clerking.vitals);
              }
            }
          } else {
            console.error('❌ Consultation not found in either collection');
          }
          setLoading(false);
        }, (error) => {
          console.error('❌ Error fetching from alternate collection:', error);
          setLoading(false);
        });
      }
    }, (error) => {
      console.error('❌ Error fetching consultation:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [consultationId]);

  // Format text with proper line breaks
  const formatTextWithLineBreaks = (text: string | undefined) => {
    if (!text) return "No data entered for this section";
    
    // Preserve the exact formatting with line breaks
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        <br />
      </React.Fragment>
    ));
  };

  // Auto-save clerking every 30s (only if not read-only)
  useEffect(() => {
    if (!consultationId || !consultation || finalReadOnly) return;
    const interval = setInterval(() => {
      saveClerking();
    }, 30000);
    return () => clearInterval(interval);
  }, [clerkingData, finalReadOnly]);

  const saveClerking = async () => {
    if (!consultationId || !consultation || finalReadOnly) return;
    
    const getCollectionAndDocId = (id: string): { collection: string; docId: string } => {
      if (id.startsWith('cons-')) {
        return { collection: 'consultations', docId: id.substring(5) };
      }
      return { collection: 'preconsultations', docId: id };
    };

    const { collection: collectionName, docId: documentId } = getCollectionAndDocId(consultationId);
    const docRef = doc(db, collectionName, documentId);
    
    try {
      console.log('💾 Saving clerking data to clerkingData field:', clerkingData);
      await updateDoc(docRef, { 
        clerkingData: {
          ...clerkingData,
          vitals: vitals
        },
        lastUpdated: new Date()
      });
      console.log('✅ Clerking data saved successfully to clerkingData field');
    } catch (error) {
      console.error('❌ Error saving clerking data:', error);
    }
  };

  // Manual save function
  const handleSaveClerking = async () => {
    await saveClerking();
    alert('Clerking notes saved successfully!');
  };

  // REAL-TIME ADMIN FUNCTIONS
  const handleMarkComplete = async () => {
    if (!isAdmin) {
      alert('Only administrators can complete consultations.');
      return;
    }
    
    try {
      const getCollectionAndDocId = (id: string): { collection: string; docId: string } => {
        if (id.startsWith('cons-')) {
          return { collection: 'consultations', docId: id.substring(5) };
        }
        return { collection: 'preconsultations', docId: id };
      };
      
      const { collection: collectionName, docId: documentId } = getCollectionAndDocId(consultationId);
      const docRef = doc(db, collectionName, documentId);
      
      await updateDoc(docRef, { 
        status: 'Completed',
        completedAt: new Date(),
        lastUpdated: new Date()
      });
      alert('Consultation marked as complete!');
    } catch (error) {
      console.error('Error marking consultation as complete:', error);
      alert('Failed to mark consultation as complete.');
    }
  };

  const handleReopenConsultation = async () => {
    if (!isAdmin) {
      alert('Only administrators can reopen consultations.');
      return;
    }
    
    try {
      const getCollectionAndDocId = (id: string): { collection: string; docId: string } => {
        if (id.startsWith('cons-')) {
          return { collection: 'consultations', docId: id.substring(5) };
        }
        return { collection: 'preconsultations', docId: id };
      };

      const { collection: collectionName, docId: documentId } = getCollectionAndDocId(consultationId);
      const docRef = doc(db, collectionName, documentId);
      
      await updateDoc(docRef, { 
        status: 'Pending',
        providerId: null,
        providerName: null,
        startedAt: null,
        completedAt: null,
        lastUpdated: new Date()
      });
      alert('Consultation reopened successfully!');
    } catch (error) {
      console.error('Error reopening consultation:', error);
      alert('Failed to reopen consultation.');
    }
  };

  const handleToggleUrgent = async () => {
    if (!isAdmin) {
      alert('Only administrators can change urgency status.');
      return;
    }
    
    try {
      const getCollectionAndDocId = (id: string): { collection: string; docId: string } => {
        if (id.startsWith('cons-')) {
          return { collection: 'consultations', docId: id.substring(5) };
        }
        return { collection: 'preconsultations', docId: id };
      };

      const { collection: collectionName, docId: documentId } = getCollectionAndDocId(consultationId);
      const docRef = doc(db, collectionName, documentId);
      
      await updateDoc(docRef, { 
        urgent: !consultation.urgent,
        lastUpdated: new Date()
      });
      alert(`Consultation marked as ${!consultation.urgent ? 'urgent' : 'not urgent'}!`);
    } catch (error) {
      console.error('Error toggling urgency:', error);
      alert('Failed to update urgency status.');
    }
  };

  const handleMarkNoShow = async () => {
    if (!isAdmin) {
      alert('Only administrators can mark as no-show.');
      return;
    }
    
    try {
      const getCollectionAndDocId = (id: string): { collection: string; docId: string } => {
        if (id.startsWith('cons-')) {
          return { collection: 'consultations', docId: id.substring(5) };
        }
        return { collection: 'preconsultations', docId: id };
      };

      const { collection: collectionName, docId: documentId } = getCollectionAndDocId(consultationId);
      const docRef = doc(db, collectionName, documentId);
      
      await updateDoc(docRef, { 
        status: 'No-Show',
        lastUpdated: new Date()
      });
      alert('Consultation marked as no-show!');
    } catch (error) {
      console.error('Error marking as no-show:', error);
      alert('Failed to mark as no-show.');
    }
  };

  const handleCancelConsultation = async () => {
    if (!isAdmin) {
      alert('Only administrators can cancel consultations.');
      return;
    }
    
    if (!confirm('Are you sure you want to cancel this consultation?')) {
      return;
    }
    
    try {
      const getCollectionAndDocId = (id: string): { collection: string; docId: string } => {
        if (id.startsWith('cons-')) {
          return { collection: 'consultations', docId: id.substring(5) };
        }
        return { collection: 'preconsultations', docId: id };
      };

      const { collection: collectionName, docId: documentId } = getCollectionAndDocId(consultationId);
      const docRef = doc(db, collectionName, documentId);
      
      await updateDoc(docRef, { 
        status: 'Cancelled',
        lastUpdated: new Date()
      });
      alert('Consultation cancelled!');
    } catch (error) {
      console.error('Error cancelling consultation:', error);
      alert('Failed to cancel consultation.');
    }
  };

  // Delete consultation (admin only)
  const handleDeleteConsultation = async () => {
    if (!isAdmin) {
      alert('Only administrators can delete consultations.');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this consultation? This action cannot be undone.')) {
      return;
    }
    
    try {
      const getCollectionAndDocId = (id: string): { collection: string; docId: string } => {
        if (id.startsWith('cons-')) {
          return { collection: 'consultations', docId: id.substring(5) };
        }
        return { collection: 'preconsultations', docId: id };
      };

      const { collection: collectionName, docId: documentId } = getCollectionAndDocId(consultationId);
      const docRef = doc(db, collectionName, documentId);
      
      await deleteDoc(docRef);
      alert('Consultation deleted successfully!');
      router.push('/provider/consultations');
    } catch (error) {
      console.error('Error deleting consultation:', error);
      alert('Failed to delete consultation.');
    }
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (!isAdmin && isCompleted) {
      alert('Only administrators can edit completed consultations.');
      return;
    }
    setEditMode(!editMode);
  };

  // Save edited clerking data
  const handleSaveEdit = async () => {
    try {
      await saveClerking();
      setEditMode(false);
      alert('Clerking data updated successfully!');
    } catch (error) {
      console.error('Error saving edited clerking data:', error);
      alert('Failed to save changes.');
    }
  };

  // Enhanced PDF Export with proper formatting
  const exportPDF = () => {
    if (!consultation) return;
    
    const docPdf = new jsPDF();
    const pageWidth = docPdf.internal.pageSize.getWidth();
    
    // Add logo centered at the top
    const logoImg = new Image();
    logoImg.src = "/tibacare-logo.png";
    
    logoImg.onload = () => {
      const logoWidth = 40;
      const logoHeight = 20;
      const logoX = (pageWidth - logoWidth) / 2;
      
      docPdf.addImage(logoImg, "PNG", logoX, 15, logoWidth, logoHeight);
      
      // Add contact info below logo
      docPdf.setFontSize(10);
      docPdf.setTextColor(100, 100, 100);
      const contactText = "Phone: +254 705 575 068 | Email: info@tibacare.com";
      const contactWidth = docPdf.getTextWidth(contactText);
      docPdf.text(contactText, (pageWidth - contactWidth) / 2, 40);
      
      // Add separator line
      docPdf.setDrawColor(200, 200, 200);
      docPdf.line(14, 45, pageWidth - 14, 45);
      
      // Add title
      docPdf.setFontSize(16);
      docPdf.setTextColor(0, 0, 0);
      docPdf.text("TibaCare - Consultation Report", pageWidth / 2, 55, { align: "center" });
      
      // Add patient information - FIXED FIELD MAPPING
      docPdf.setFontSize(12);
      docPdf.setTextColor(0, 0, 0);
      let yPosition = 65;
      
      docPdf.text(`Patient: ${consultation.fullName || 'Unknown Patient'}`, 20, yPosition);
      yPosition += 8;
      docPdf.text(`Status: ${consultation.status || 'N/A'}`, 20, yPosition);
      yPosition += 8;
      docPdf.text(`Service: ${consultation.service || 'N/A'}`, 20, yPosition);
      yPosition += 8;
      docPdf.text(`Age: ${consultation.age || 'N/A'}`, 20, yPosition);
      yPosition += 8;
      docPdf.text(`Preferred Date: ${formatDate(consultation.preferredDate)}`, 20, yPosition);
      yPosition += 8;
      docPdf.text(`Preferred Time: ${formatTime(consultation.preferredTime)}`, 20, yPosition);
      yPosition += 8;
      docPdf.text(`Urgent: ${consultation.urgent ? 'Yes' : 'No'}`, 20, yPosition);
      yPosition += 8;
      docPdf.text(`Provider: ${consultation.providerName || 'N/A'}`, 20, yPosition);
      yPosition += 12;
      
      // Add presenting symptoms
      docPdf.setFontSize(14);
      docPdf.text("Presenting Symptoms", 20, yPosition);
      yPosition += 10;
      
      docPdf.setFontSize(11);
      const symptomsText = consultation.symptoms || "No symptoms provided";
      const splitSymptoms = docPdf.splitTextToSize(symptomsText, pageWidth - 40);
      docPdf.text(splitSymptoms, 25, yPosition);
      yPosition += splitSymptoms.length * 6 + 12;
      
      // Add vitals if available
      if (vitals && Object.keys(vitals).length > 0) {
        docPdf.setFontSize(14);
        docPdf.text("Vital Signs", 20, yPosition);
        yPosition += 10;
        
        docPdf.setFontSize(11);
        const vitalEntries = Object.entries(vitals).filter(([_, value]) => value);
        if (vitalEntries.length > 0) {
          vitalEntries.forEach(([key, value]) => {
            if (yPosition > 250) {
              docPdf.addPage();
              yPosition = 20;
            }
            docPdf.text(`${key.toUpperCase()}: ${value}`, 25, yPosition);
            yPosition += 6;
          });
          yPosition += 8;
        } else {
          docPdf.text("No vitals recorded", 25, yPosition);
          yPosition += 12;
        }
      }
      
      // Add clerking history section with EXACT field names and formatting
      docPdf.setFontSize(14);
      docPdf.text("Clinical Documentation", 20, yPosition);
      yPosition += 10;
      
      docPdf.setFontSize(11);
      const clerkingSections = [
        ["History of Presenting Illness (HPI)", clerkingData.hpi || "No history recorded"],
        ["General Examination", clerkingData.generalExam || "No general exam recorded"],
        ["Systemic Examination", clerkingData.systemExam || "No systemic exam recorded"],
        ["Investigations", clerkingData.investigations || "No investigations recorded"],
        ["Impression / Diagnosis", clerkingData.impression || "No impression recorded"],
        ["Plan / Treatment", clerkingData.plan || "No plan recorded"],
        ["Medications", clerkingData.medications || "No medications recorded"],
        ["Allergies", clerkingData.allergies || "No allergies recorded"]
      ];
      
      clerkingSections.forEach(([title, content]) => {
        if (yPosition > 240) {
          docPdf.addPage();
          yPosition = 20;
        }
        
        docPdf.setFontSize(12);
        docPdf.setTextColor(66, 139, 202);
        docPdf.text(title + ":", 20, yPosition);
        yPosition += 6;
        
        docPdf.setFontSize(11);
        docPdf.setTextColor(0, 0, 0);
        
        // Split content into lines that fit the page width, preserving formatting
        const splitText = docPdf.splitTextToSize(content, pageWidth - 40);
        docPdf.text(splitText, 25, yPosition);
        yPosition += splitText.length * 6 + 8;
      });
      
      // Add footer
      const finalY = yPosition + 10;
      docPdf.setDrawColor(200, 200, 200);
      docPdf.line(14, finalY, pageWidth - 14, finalY);
      
      docPdf.setFontSize(9);
      docPdf.setTextColor(100, 100, 100);
      
      // Issued on date
      docPdf.text(`Issued on: ${new Date().toLocaleString()}`, pageWidth / 2, finalY + 8, { align: "center" });
      
      // Copyright and address info
      docPdf.text("© 2025 TibaCare. All rights reserved.", pageWidth / 2, finalY + 14, { align: "center" });
      docPdf.text("P.O. Box 20625 - 00200, Nairobi, Kenya", pageWidth / 2, finalY + 20, { align: "center" });
      docPdf.text("Phone: +254 705 575 068 | Email: info@tibacare.com", pageWidth / 2, finalY + 26, { align: "center" });
      docPdf.text("Your Trusted Telemedicine Partner", pageWidth / 2, finalY + 32, { align: "center" });
      
      docPdf.save(`consultation_${consultation.fullName || 'patient'}.pdf`);
    };
  };

  if (loading) {
    return <p className="p-8 text-center text-blue-600">Loading consultation...</p>;
  }

  if (!consultation) {
    return <p className="p-8 text-center text-red-600">Consultation not found.</p>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Completed Banner */}
      {isCompleted && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4">
          <p className="text-yellow-700">
            This consultation is completed and cannot be edited.
          </p>
        </div>
      )}

      {/* Read-only Banner if passed as prop */}
      {readOnly && (
        <div className="bg-blue-100 border-l-4 border-blue-500 p-4">
          <p className="text-blue-700">
            Viewing consultation in read-only mode.
          </p>
        </div>
      )}

      {/* View-only Banner if from query parameter */}
      {isViewOnly && (
        <div className="bg-blue-100 border-l-4 border-blue-500 p-4">
          <p className="text-blue-700">
            Viewing completed consultation in read-only mode.
          </p>
        </div>
      )}

      {/* Patient Info - COMPLETELY FIXED DISPLAY */}
      <div className="bg-white p-6 rounded shadow space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800">{consultation.fullName}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="space-y-1">
                <p><strong>Status:</strong> <span className={`px-2 py-1 rounded text-xs ${
                  consultation.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  consultation.status === 'In-Progress' ? 'bg-yellow-100 text-yellow-800' :
                  consultation.status === 'Paused' ? 'bg-orange-100 text-orange-800' :
                  consultation.status === 'No-Show' ? 'bg-red-100 text-red-800' :
                  consultation.status === 'Cancelled' ? 'bg-gray-100 text-gray-800' :
                  'bg-blue-100 text-blue-800'
                }`}>{consultation.status}</span></p>
                <p><strong>Service:</strong> {consultation.service}</p>
                <p><strong>Age:</strong> {consultation.age}</p>
                <p><strong>Preferred Date:</strong> {formatDate(consultation.preferredDate)}</p>
              </div>
              <div className="space-y-1">
                <p><strong>Preferred Time:</strong> {formatTime(consultation.preferredTime)}</p>
                <p><strong>Urgent:</strong> {consultation.urgent ? 'Yes' : 'No'}</p>
                <p><strong>Provider:</strong> {consultation.providerName}</p>
                <p><strong>Phone:</strong> {consultation.phone}</p>
              </div>
            </div>
          </div>
          
          {/* Admin actions - REAL-TIME FUNCTIONAL */}
          {isAdmin && (
            <div className="flex flex-col gap-2 ml-4">
              {isCompleted ? (
                <button
                  onClick={handleReopenConsultation}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Reopen Consultation
                </button>
              ) : (
                <button
                  onClick={handleMarkComplete}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Mark as Complete
                </button>
              )}
              
              <button
                onClick={handleToggleUrgent}
                className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
              >
                {consultation.urgent ? 'Remove Urgent' : 'Mark as Urgent'}
              </button>
              
              {!isCompleted && consultation.status !== 'No-Show' && (
                <button
                  onClick={handleMarkNoShow}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Mark as No-Show
                </button>
              )}
              
              {!isCompleted && consultation.status !== 'Cancelled' && (
                <button
                  onClick={handleCancelConsultation}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                >
                  Cancel Consultation
                </button>
              )}
              
              <button
                onClick={handleDeleteConsultation}
                className="px-3 py-1 bg-red-800 text-white rounded text-sm hover:bg-red-900"
              >
                Delete Consultation
              </button>

              {/* Edit Button */}
              <button
                onClick={toggleEditMode}
                className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
              >
                {editMode ? 'Cancel Edit' : 'Edit Clerking'}
              </button>
            </div>
          )}
        </div>
        
        {/* Presenting Symptoms */}
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold text-lg mb-2">Presenting Symptoms</h3>
          <p className="whitespace-pre-wrap">{consultation.symptoms || 'No symptoms provided'}</p>
        </div>

        {/* Vitals Display */}
        {vitals && Object.keys(vitals).filter(key => vitals[key]).length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded">
            <h3 className="font-semibold text-lg mb-2">Vital Signs</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(vitals).map(([key, value]) => 
                value ? (
                  <div key={key}>
                    <strong>{key.toUpperCase()}:</strong> {value}
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}

        {/* Previous Consultations */}
        {previousConsultations.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowPreviousConsultations(!showPreviousConsultations)}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              {showPreviousConsultations ? 'Hide' : 'Show'} Previous Consultations ({previousConsultations.length})
            </button>
            
            {showPreviousConsultations && (
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                <h3 className="font-semibold text-lg">Previous Consultations</h3>
                {previousConsultations.map((prevConsult) => (
                  <div key={prevConsult.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{formatDate(prevConsult.preferredDate)} at {formatTime(prevConsult.preferredTime)}</p>
                        <p className="text-sm text-gray-600">Service: {prevConsult.service}</p>
                        <p className="text-sm text-gray-600">Status: {prevConsult.status}</p>
                        {prevConsult.providerName && (
                          <p className="text-sm text-gray-600">Provider: {prevConsult.providerName}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        prevConsult.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        prevConsult.status === 'In-Progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {prevConsult.status}
                      </span>
                    </div>
                    {prevConsult.symptoms && (
                      <p className="text-sm mt-2 text-gray-700">{prevConsult.symptoms}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clerking Interface - EXACT MATCH TO PROVIDER DASHBOARD WITH PROPER FORMATTING */}
      <div className="bg-white p-6 rounded shadow">
        <button
          onClick={() => setShowClerking((p) => !p)}
          className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          {showClerking ? 'Hide Clerking Notes' : 'Show Clerking Notes'}
        </button>

        {showClerking && (
          <div className="mt-4 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Clinical Documentation</h3>
              <span className="text-sm text-gray-500">
                {consultation.lastUpdated ? `Last updated: ${formatDate(consultation.lastUpdated)}` : 'Not saved yet'}
              </span>
            </div>
            
            {/* EXACT MATCH: Use provider dashboard field names with proper formatting */}
            {clerkingFields.map(({ key, label }) => (
              <div key={key} className="border rounded-lg p-4 bg-gray-50">
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  {label}
                </label>
                {finalReadOnly && !editMode ? (
                  <div className={`w-full border rounded p-3 bg-white min-h-[6rem] whitespace-pre-wrap ${
                    clerkingData[key as keyof ClerkingData] ? 'text-gray-800' : 'text-gray-500 italic'
                  }`}>
                    {formatTextWithLineBreaks(clerkingData[key as keyof ClerkingData] as string)}
                  </div>
                ) : (
                  <textarea
                    value={clerkingData[key as keyof ClerkingData] || ''}
                    onChange={(e) =>
                      setClerkingData((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    className="w-full border rounded p-3 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent whitespace-pre-wrap"
                    rows={6}
                    placeholder={`Enter ${label.toLowerCase()} details...`}
                    disabled={finalReadOnly && !editMode}
                  />
                )}
                {/* REMOVED: Word count and character count display */}
              </div>
            ))}
            
            {/* Save Button (only show if not read-only or in edit mode) */}
            {(!finalReadOnly || editMode) && (
              <div className="flex gap-3">
                <button
                  onClick={editMode ? handleSaveEdit : handleSaveClerking}
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 flex items-center gap-2"
                >
                  <span>💾</span> {editMode ? 'Save Changes' : 'Save Changes Now'}
                </button>
                {!editMode && (
                  <button
                    onClick={saveClerking}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Auto-save (30s)
                  </button>
                )}
                {editMode && (
                  <button
                    onClick={() => setEditMode(false)}
                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Provider Tools - Only show if not read-only */}
      {!finalReadOnly && (
        <div className="bg-white p-6 rounded shadow">
          <button
            onClick={() => setShowTools((p) => !p)}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            {showTools ? 'Hide Provider Tools' : 'Open Provider Tools'}
          </button>

          {showTools && (
            <div className="mt-4 space-y-4">
              {DOC_OPTIONS.map((docOpt) => (
                <div key={docOpt.key}>
                  <button
                    className="w-full text-left bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
                    onClick={() =>
                      setShowTool((prev) => ({
                        ...prev,
                        [docOpt.key]: !prev[docOpt.key],
                      }))
                    }
                  >
                    {docOpt.label}
                  </button>
                  {showTool[docOpt.key] && (
                    <>
                      {docOpt.key === 'prescription' && (
                        <PrescriptionForm consultation={consultation} />
                      )}
                      {docOpt.key === 'labRequest' && (
                        <LabRequestForm consultation={consultation} />
                      )}
                      {docOpt.key === 'sickNote' && (
                        <SickNoteForm consultation={consultation} />
                      )}
                      {docOpt.key === 'referral' && (
                        <ReferralForm consultation={consultation} />
                      )}
                      {docOpt.key === 'medicalReport' && (
                        <MedicalReportForm consultation={consultation} />
                      )}
                      {docOpt.key === 'imagingRequest' && (
                        <ImagingRequestForm consultation={consultation} />
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={exportPDF}
          className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          Export PDF with Clerking
        </button>
        
        {/* Back button for view page */}
        {(readOnly || isViewOnly) && (
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => router.push('/provider/consultations')}
          >
            Back to List
          </button>
        )}
      </div>
    </div>
  );
}