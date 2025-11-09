'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  addDoc,
  getDocs,
  where
} from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Clock,
  FileText,
  PauseCircle,
  CheckCircle2,
  Eye,
  User,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Phone,
  Video,
  Beaker,
  Trash2,
  DownloadCloud,
  BarChart3,
  MessageCircle,
  Search,
  Filter,
  X,
  Settings,
  Bell,
  BookOpen,
  Pill,
  ClipboardList,
  Lock,
  UserCheck,
  Users,
  Brain,
  Heart,
  Activity,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { debounce } from 'lodash';

// Lazy load provider tools
const PrescriptionForm = dynamic(() => import('@/app/provider/tools/prescription/page'), { ssr: false });
const LabRequestForm = dynamic(() => import('@/app/provider/tools/lab-request/page'), { ssr: false });
const SickNoteForm = dynamic(() => import('@/app/provider/tools/sick-note/page'), { ssr: false });
const ReferralForm = dynamic(() => import('@/app/provider/tools/referral/page'), { ssr: false });

// Add auto-resize textarea hook
const useAutoResizeTextarea = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    window.addEventListener('resize', resizeTextarea);
    return () => window.removeEventListener('resize', resizeTextarea);
  }, []);

  return { textareaRef, resizeTextarea };
};

// Add debounce hook
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/* ------------- Types ------------- */
type Vitals = {
  bp?: string;
  hr?: string;
  rr?: string;
  temp?: string;
  spo2?: string;
  weight?: string;
  height?: string;
  bmi?: string;
  [key: string]: string | undefined;
};

// Mental Health Specific Types
type MentalHealthAssessment = {
  mood?: string;
  affect?: string;
  thoughtProcess?: string;
  thoughtContent?: string;
  perception?: string;
  cognition?: string;
  insight?: string;
  judgment?: string;
  riskAssessment?: string;
  suicideRisk?: string;
  selfHarmRisk?: string;
  violenceRisk?: string;
  adls?: string;
  socialSupport?: string;
  stressors?: string;
  copingMechanisms?: string;
};

type ClerkingData = {
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
  // Mental Health Specific Fields
  presentingComplaint?: string;
  historyPresentingComplaint?: string;
  psychiatricHistory?: string;
  familyPsychiatricHistory?: string;
  personalHistory?: string;
  premorbidPersonality?: string;
  mentalStateExam?: MentalHealthAssessment;
  riskAssessment?: string;
  managementPlan?: string;
  safetyPlan?: string;
};

type PreConsult = {
  id: string;
  patientName: string;
  patientId?: string;
  age?: number | string;
  phone?: string;
  service?: string;
  symptoms?: string;
  status?: 'Waiting' | 'In-Progress' | 'Paused' | 'Completed' | 'No-Show' | 'Cancelled';
  urgent?: boolean;
  providerId?: string | null;
  providerName?: string;
  clerkingData?: ClerkingData;
  preferredDate?: any;
  preferredTime?: string;
  createdAt?: any;
  startedAt?: any;
  completedAt?: any;
  lastUpdated?: any;
  assignedProviderId?: string;
  assignedProviderName?: string;
};

type Provider = {
  uid: string;
  name: string;
  email?: string;
  status?: 'available' | 'busy' | 'offline';
  currentPatient?: string | null;
};

type SystemTemplate = {
  id: string;
  name: string;
  content: string;
  category: string;
};

type ProviderTool = {
  id: string;
  name: string;
  icon: React.ReactNode;
  component: React.ComponentType<any>;
};

/* ------------- Helpers ------------- */
const fmtTime = (t: any) => {
  if (!t) return '-';
  if (t?.toDate) return t.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (t?.seconds) return new Date(t.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  try {
    return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(t);
  }
};

const fmtDate = (t: any) => {
  if (!t) return '-';
  if (t?.toDate) return t.toDate().toLocaleDateString();
  if (t?.seconds) return new Date(t.seconds * 1000).toLocaleDateString();
  try {
    return new Date(t).toLocaleDateString();
  } catch {
    return String(t);
  }
};

const fmtTs = (t: any) => {
  if (!t) return '-';
  if (t?.toDate) return t.toDate().toLocaleString();
  if (t?.seconds) return new Date(t.seconds * 1000).toLocaleString();
  try {
    return new Date(t).toLocaleString();
  } catch {
    return String(t);
  }
};

const isoDate = (t: any) => {
  if (!t) return null;
  if (t?.toDate) return t.toDate().toISOString();
  try {
    return new Date(t).toISOString();
  } catch {
    return null;
  }
};

const sameSlot = (aDate: any, aTime: string, bDate: any, bTime: string) => {
  try {
    const a = aDate?.toDate ? aDate.toDate() : new Date(aDate);
    const b = bDate?.toDate ? bDate.toDate() : new Date(bDate);
    const aDay = a.toISOString().slice(0, 10);
    const bDay = b.toISOString().slice(0, 10);
    return aDay === bDay && (aTime || '') === (bTime || '');
  } catch {
    return false;
  }
};

const calculateBMI = (weight: string, height: string): string => {
  if (!weight || !height) return '';
  
  const weightNum = parseFloat(weight);
  const heightNum = parseFloat(height) / 100; // convert cm to meters
  
  if (isNaN(weightNum) || isNaN(heightNum) || heightNum === 0) return '';
  
  const bmi = weightNum / (heightNum * heightNum);
  return bmi.toFixed(1);
};

/* ------------- Check if service is mental health related ------------- */
const isMentalHealthService = (service?: string): boolean => {
  if (!service) return false;
  const mentalHealthKeywords = [
    'mental', 'psych', 'counsel', 'therapy', 'psychiatry', 'psychology',
    'depression', 'anxiety', 'bipolar', 'schizophrenia', 'ocd', 'ptsd',
    'addiction', 'substance', 'behavioral', 'emotional', 'trauma'
  ];
  return mentalHealthKeywords.some(keyword => 
    service.toLowerCase().includes(keyword.toLowerCase())
  );
};

/* ------------- REAL WhatsApp helper - FIXED to open WhatsApp directly ------------- */
const openWhatsApp = (phone: string | undefined, message: string = '') => {
  if (!phone) {
    toast.error('Phone number not available');
    return;
  }
  
  // Clean and format phone number with country code
  let cleanPhone = phone.replace(/\D/g, '');
  
  // Add country code if missing (assuming Kenya +254)
  if (!cleanPhone.startsWith('254') && cleanPhone.length === 9) {
    cleanPhone = '254' + cleanPhone;
  } else if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    cleanPhone = '254' + cleanPhone.substring(1);
  }
  
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
};

/* ------------- Small WhatsApp helpers ------------- */
const initiateWhatsAppCall = (phone: string | undefined, isVideo: boolean = false) => {
  if (!phone) {
    toast.error('Phone number not available');
    return;
  }
  
  // Clean and format phone number with country code
  let cleanPhone = phone.replace(/\D/g, '');
  
  // Add country code if missing (assuming Kenya +254)
  if (!cleanPhone.startsWith('254') && cleanPhone.length === 9) {
    cleanPhone = '254' + cleanPhone;
  } else if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    cleanPhone = '254' + cleanPhone.substring(1);
  }
  
  const whatsappUrl = isVideo
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent("Hi — I'd like to start a video call for your consultation.")}`
    : `https://wa.me/${cleanPhone}?text=${encodeURIComponent("Hi — I'd like to discuss your consultation.")}`;
  window.open(whatsappUrl, '_blank');
};

/* ------------- Component ------------- */
function ProviderDashboard() {
  // Queue & UI state
  const [preConsultations, setPreConsultations] = useState<PreConsult[]>([]);
  const [tab, setTab] = useState<'Waiting' | 'In-Progress' | 'Paused' | 'Completed' | 'All' | 'MyPatients' | 'No-Show' | 'Cancelled'>('Waiting');
  const [activePatient, setActivePatient] = useState<PreConsult | null>(null);
  const [clerkingData, setClerkingData] = useState<ClerkingData>({});
  const [providers, setProviders] = useState<Provider[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<PreConsult | null>(null);
  const [assignProvider, setAssignProvider] = useState<string | null>(null);
  const [viewHistoryOpen, setViewHistoryOpen] = useState(false);
  const [historyPatient, setHistoryPatient] = useState<PreConsult | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reschedulePatient, setReschedulePatient] = useState<PreConsult | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [patientSummary, setPatientSummary] = useState<string>('');
  const [showVitalsPanel, setShowVitalsPanel] = useState(true);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [selectedWhatsappPatient, setSelectedWhatsappPatient] = useState<PreConsult | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [urgentFilter, setUrgentFilter] = useState<boolean | null>(null);
  const [templates, setTemplates] = useState<SystemTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTemplateCategory, setActiveTemplateCategory] = useState<string>('all');
  const [providerStatus, setProviderStatus] = useState<'available' | 'busy' | 'offline'>('available');
  const [realTimeUpdates, setRealTimeUpdates] = useState<{type: string, message: string, timestamp: Date}[]>([]);
  const [showRealTimeUpdates, setShowRealTimeUpdates] = useState(false);
  const [unreadUpdates, setUnreadUpdates] = useState(0);
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [providerAssignModalOpen, setProviderAssignModalOpen] = useState(false);
  const [providerAssignTarget, setProviderAssignTarget] = useState<PreConsult | null>(null);

  const { textareaRef: hpiRef, resizeTextarea: resizeHpi } = useAutoResizeTextarea();
  const { textareaRef: planRef, resizeTextarea: resizePlan } = useAutoResizeTextarea();
  const investigationsRef = useRef<HTMLTextAreaElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Check if active patient is mental health
  const isMentalHealthPatient = useMemo(() => {
    return activePatient ? isMentalHealthService(activePatient.service) : false;
  }, [activePatient]);

  // Provider tools configuration
  const PROVIDER_TOOLS: ProviderTool[] = [
    {
      id: 'prescription',
      name: 'Prescription',
      icon: <Pill className="w-4 h-4" />,
      component: PrescriptionForm
    },
    {
      id: 'lab-request',
      name: 'Lab Request',
      icon: <Beaker className="w-4 h-4" />,
      component: LabRequestForm
    },
    {
      id: 'sick-note',
      name: 'Sick Note',
      icon: <ClipboardList className="w-4 h-4" />,
      component: SickNoteForm
    },
    {
      id: 'referral',
      name: 'Referral',
      icon: <User className="w-4 h-4" />,
      component: ReferralForm
    }
  ];

  // Determine admin
  useEffect(() => {
    const u = auth.currentUser;
    if (u?.email === 'humphreykiboi1@gmail.com') setIsAdmin(true);
  }, []);

  /* Load providers */
  useEffect(() => {
    (async () => {
      try {
        const pSnap = await getDocs(collection(db, 'providers'));
        if (!pSnap.empty) {
          setProviders(pSnap.docs.map((d) => ({ 
            uid: d.id, 
            name: (d.data() as any).displayName || (d.data() as any).name || d.id,
            email: (d.data() as any).email,
            status: (d.data() as any).status || 'offline',
            currentPatient: (d.data() as any).currentPatient || null
          })));
          return;
        }
      } catch (err) {
        console.log('Could not load providers from providers collection');
      }
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'provider'));
        const snap = await getDocs(q);
        setProviders(snap.docs.map((d) => ({ 
          uid: d.id, 
          name: (d.data() as any).displayName || (d.data() as any).name || d.id,
            email: (d.data() as any).email,
            status: (d.data() as any).status || 'offline',
            currentPatient: (d.data() as any).currentPatient || null
          })));
      } catch (err) {
        console.log('Could not load providers from users collection');
        const u = auth.currentUser;
        if (u) setProviders([{ 
          uid: u.uid, 
          name: u.displayName || u.email || 'Provider',
          email: u.email || '',
          status: 'available',
          currentPatient: null
        }]);
      }
    })();
  }, []);

  /* Load templates - Including Mental Health Templates */
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const defaultTemplates: SystemTemplate[] = [
          {
            id: '1',
            name: 'Common Cold',
            content: 'Patient presents with runny nose, sneezing, sore throat, and mild cough. No fever. Symptoms started 2 days ago.',
            category: 'hpi'
          },
          {
            id: '2',
            name: 'Hypertension Follow-up',
            content: 'Patient here for routine hypertension follow-up. Currently taking prescribed medication with good compliance.',
            category: 'hpi'
          },
          {
            id: '3',
            name: 'Standard Physical Exam',
            content: 'General: Well-appearing, in no acute distress.\nHEENT: Normocephalic, atraumatic.\nLungs: Clear to auscultation bilaterally.\nHeart: Regular rate and rhythm, no murmurs.\nAbdomen: Soft, non-tender, non-distended.',
            category: 'exam'
          },
          {
            id: '4',
            name: 'Diabetes Management Plan',
            content: '1. Continue current medication regimen\n2. Monitor blood glucose daily\n3. Follow up in 3 months\n4. Refer to diabetes education program',
            category: 'plan'
          },
          // Mental Health Templates
          {
            id: 'mh1',
            name: 'Depression Assessment',
            content: 'Patient presents with persistent low mood, anhedonia, sleep disturbance, and decreased energy. Reports difficulty with concentration and motivation.',
            category: 'mental_health'
          },
          {
            id: 'mh2',
            name: 'Anxiety Presentation',
            content: 'Patient describes excessive worry, restlessness, muscle tension, and sleep difficulties. Reports panic symptoms including palpitations and shortness of breath.',
            category: 'mental_health'
          },
          {
            id: 'mh3',
            name: 'Mental Status Exam - Normal',
            content: 'Appearance: Well-groomed, appropriate attire.\nBehavior: Cooperative, good eye contact.\nSpeech: Normal rate, rhythm, and volume.\nMood: "Okay" - Affect congruent and full range.\nThought: Logical, goal-directed. No SI/HI.\nPerception: No hallucinations reported.\nCognition: Alert and oriented x4.\nInsight: Good. Judgment: Intact.',
            category: 'mental_status'
          },
          {
            id: 'mh4',
            name: 'Safety Plan Template',
            content: '1. Recognize warning signs\n2. Use internal coping strategies\n3. Social contacts for distraction\n4. Family members to contact\n5. Professional contacts\n6. Emergency services\n7. Make environment safe',
            category: 'safety_plan'
          }
        ];
        setTemplates(defaultTemplates);
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    };

    loadTemplates();
  }, []);

  /* Real-time queue listener with filters */
  useEffect(() => {
    const q = query(collection(db, 'preconsultations'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: PreConsult[] = snap.docs.map((d) => { 
          const data = d.data() as any;
          // Convert any "Pending" status to "Waiting"
          const status = data.status === 'Pending' ? 'Waiting' : data.status;
          
          return { 
            id: d.id, 
            ...data,
            status, // Override status
            // Ensure providerName is properly set and handle Waiting status
            providerName: data.providerName || 'Unknown Provider',
            // Handle assigned provider for Waiting status
            assignedProviderName: data.assignedProviderName || data.providerName || null,
          };
        });
        
        // Sort with urgent first, then by creation time
        items.sort((a, b) => {
          if (a.urgent && !b.urgent) return -1;
          if (!a.urgent && b.urgent) return 1;
          const aT = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
          const bT = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
          return bT - aT;
        });
        setPreConsultations(items);
        
        // Check for real-time updates
        snap.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const patient = { id: change.doc.id, ...change.doc.data() } as PreConsult;
            // Convert Pending to Waiting for new patients
            const patientStatus = patient.status === 'Pending' ? 'Waiting' : patient.status;
            
            if (change.type === 'added' && patientStatus === 'Waiting') {
              addRealTimeUpdate('new_patient', `New patient ${patient.patientName} added to waiting queue`);
            } else if (change.type === 'modified' && 
                       change.doc.data().status !== change.doc.previous.data().status) {
              addRealTimeUpdate('status_change', `Patient ${patient.patientName} status changed to ${patientStatus}`);
            }
          }
        });
      },
      (err) => {
        console.error('preconsultations listener failed', err);
        toast.error('Failed to load queue');
      }
    );
    return () => unsub();
  }, []);

  /* Add real-time update notification */
  const addRealTimeUpdate = (type: string, message: string) => {
    const update = { type, message, timestamp: new Date() };
    setRealTimeUpdates(prev => [update, ...prev.slice(0, 19)]); // Keep last 20 updates
    setUnreadUpdates(prev => prev + 1);
  };

  /* Mark updates as read */
  const markUpdatesAsRead = () => {
    setUnreadUpdates(0);
  };

  /* SILENT Auto-save clerking data - NO POPUPS */
  useEffect(() => {
    if (!activePatient || !autoSaveEnabled) return;

    const saveClerkingData = debounce(async () => {
      try {
        await updateDoc(doc(db, 'preconsultations', activePatient.id), { 
          clerkingData, 
          lastUpdated: serverTimestamp() 
        });
        setLastSaved(new Date());
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, 2000);

    saveClerkingData();

    return () => {
      saveClerkingData.cancel();
    };
  }, [clerkingData, activePatient, autoSaveEnabled]);

  /* When active patient changes, determine form type */
  useEffect(() => {
    if (activePatient) {
      // Initialize mental health data if needed
      if (isMentalHealthPatient && !clerkingData.mentalStateExam) {
        setClerkingData(prev => ({
          ...prev,
          mentalStateExam: {
            mood: '',
            affect: '',
            thoughtProcess: '',
            thoughtContent: '',
            perception: '',
            cognition: '',
            insight: '',
            judgment: '',
            riskAssessment: '',
            suicideRisk: '',
            selfHarmRisk: '',
            violenceRisk: '',
            adls: '',
            socialSupport: '',
            stressors: '',
            copingMechanisms: ''
          }
        }));
      }
    }
  }, [activePatient, isMentalHealthPatient]);

  /* Click outside detection for auto-save */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autoSaveEnabled && activePatient) {
        saveClerkingDataSilently();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [autoSaveEnabled, activePatient]);

  /* Slot calculator for reschedule */
  useEffect(() => {
    if (!reschedulePatient) return;
    const slots = calculateAvailableSlots(reschedulePatient);
    setAvailableSlots(slots);
    setSelectedSlot(slots[0] || '');
  }, [reschedulePatient, preConsultations]);

  function calculateAvailableSlots(patient: PreConsult) {
    if (!patient?.preferredDate) return [];
    const day = new Date(isoDate(patient.preferredDate) || new Date()).toISOString().slice(0, 10);
    const occupied = preConsultations
      .filter((p) => {
        const pDay = p.preferredDate ? isoDate(p.preferredDate)?.slice(0, 10) : null;
        return pDay === day && p.status !== 'Completed' && p.id !== patient.id;
      })
      .map((p) => p.preferredTime)
      .filter(Boolean) as string[];

    const available: string[] = [];
    for (let h = 8; h < 18; h++) {
      for (let m = 0; m < 60; m += 15) {
        const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        if (!occupied.includes(t)) available.push(t);
      }
    }
    return available;
  }

  /* Timer for active patient */
  useEffect(() => {
    if (!activePatient) {
      setElapsed(0);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    const startedIso = isoDate(activePatient.startedAt) || isoDate(activePatient.preferredDate) || new Date().toISOString();
    const started = new Date(startedIso);
    const update = () => {
      const diff = Math.max(0, Date.now() - started.getTime());
      setElapsed(diff);
    };
    update();
    timerRef.current = window.setInterval(update, 1000);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activePatient]);

  /* Auto-resize textareas when clerking data changes */
  useEffect(() => {
    resizeHpi();
    resizePlan();
  }, [clerkingData?.hpi, clerkingData?.plan, resizeHpi, resizePlan]);

  /* Auto-calculate BMI when weight or height changes */
  useEffect(() => {
    if (clerkingData?.vitals?.weight || clerkingData?.vitals?.height) {
      const weight = clerkingData.vitals.weight || '';
      const height = clerkingData.vitals.height || '';
      const bmi = calculateBMI(weight, height);
      
      if (bmi && (!clerkingData.vitals.bmi || clerkingData.vitals.bmi !== bmi)) {
        setClerkingData(prev => ({
          ...prev,
          vitals: {
            ...prev.vitals,
            bmi
          }
        }));
      }
    }
  }, [clerkingData?.vitals?.weight, clerkingData?.vitals?.height]);

  /* Audit logger */
  const logAudit = async (type: string, details: object) => {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        type,
        details,
        user: auth.currentUser?.uid || null,
        userEmail: auth.currentUser?.email || null,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
        console.warn('audit log error', err);
    }
  };

  /* Update provider status */
  const updateProviderStatus = async (providerId: string, status: 'available' | 'busy' | 'offline', currentPatientId?: string | null) => {
    try {
      try {
        await updateDoc(doc(db, 'providers', providerId), {
          status,
          currentPatient: currentPatientId || null,
          lastUpdated: serverTimestamp()
        });
      } catch (err) {
        await updateDoc(doc(db, 'users', providerId), {
          status,
          currentPatient: currentPatientId || null,
          lastUpdated: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Failed to update provider status:', err);
    }
  };

  /* Apply template to clerking field */
  const applyTemplate = (template: SystemTemplate, field: keyof ClerkingData) => {
    setClerkingData(prev => ({
      ...prev,
      [field]: prev[field] ? `${prev[field]}\n${template.content}` : template.content
    }));
    setShowTemplates(false);
    toast.success(`Template applied to ${field}`);
  };

  /* SILENT Save clerking data function - NO POPUP */
  const saveClerkingDataSilently = async () => {
    if (!activePatient) return;
    
    try {
      await updateDoc(doc(db, 'preconsultations', activePatient.id), { 
        clerkingData, 
        lastUpdated: serverTimestamp() 
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  /* ENHANCED: Function to mark visit as waiting for provider */
  const markAsWaitingForProvider = async (p: PreConsult, providerId: string, providerName: string) => {
    try {
      await updateDoc(doc(db, 'preconsultations', p.id), {
        status: 'Waiting',
        assignedProviderId: providerId,
        assignedProviderName: providerName,
        providerId: null,
        providerName: null,
        lastUpdated: serverTimestamp(),
      });
      
      await logAudit('mark_waiting', { 
        patientId: p.id, 
        assignedProviderId: providerId, 
        assignedProviderName: providerName 
      });
      toast.success(`Patient assigned to ${providerName}`);
    } catch (err) {
      console.error('Failed to assign patient:', err);
      toast.error('Failed to assign patient');
    }
  };

  /* FIXED: Check if buttons should be locked for assigned patients - Admin has all access */
  const areButtonsLocked = (patient: PreConsult) => {
    const currentUserId = auth.currentUser?.uid;
    
    if (isAdmin) return false;
    
    if (patient.assignedProviderId && patient.assignedProviderId !== currentUserId) {
      return true;
    }
    
    if (patient.status === 'Paused' && patient.providerId !== currentUserId) {
      return true;
    }
    
    if (patient.status === 'In-Progress' && patient.providerId && patient.providerId !== currentUserId) {
      return true;
    }
    
    return false;
  };

  /* ENHANCED: Check if patient is assigned to another provider */
  const isAssignedToOther = (patient: PreConsult) => {
    const currentUserId = auth.currentUser?.uid;
    return (patient.assignedProviderId && patient.assignedProviderId !== currentUserId);
  };

  /* ENHANCED: Start clerking with proper assignment checks - FIXED for admin access */
  const startClerking = async (p: PreConsult) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return toast.error('Please login as provider');

    if (!isAdmin) {
      if (p.assignedProviderId && p.assignedProviderId !== uid) {
        const assignedProvider = providers.find(provider => provider.uid === p.assignedProviderId);
        toast.error(`Patient is assigned to ${assignedProvider?.name || 'another provider'}`);
        return;
      }

      if (p.status === 'In-Progress' && p.providerId && p.providerId !== uid) {
        const attendingProvider = providers.find(provider => provider.uid === p.providerId);
        toast.error(`Already being attended by ${attendingProvider?.name || 'another provider'}`);
        return;
      }

      if (p.status === 'Paused' && p.providerId !== uid) {
        toast.error('This patient is paused and can only be resumed by the attending provider or administrator');
        return;
      }
    }

    const alreadyAttending = preConsultations.find((x) => 
      x.status === 'In-Progress' && x.providerId === uid && x.id !== p.id
    );
    if (alreadyAttending && !isAdmin) {
      toast.error(`Finish or pause ${alreadyAttending.patientName} first.`);
      return;
    }

    const conflict = preConsultations.find(
      (x) => x.status === 'In-Progress' && 
      sameSlot(x.preferredDate, x.preferredTime || '', p.preferredDate, p.preferredTime || '')
    );
    if (conflict && conflict.id !== p.id && !isAdmin) {
      toast.error(`Time slot conflict with ${conflict.patientName}`);
      return;
    }

    try {
      await updateDoc(doc(db, 'preconsultations', p.id), {
        status: 'In-Progress',
        providerId: uid,
        providerName: auth.currentUser?.displayName || auth.currentUser?.email || 'Provider',
        assignedProviderId: null,
        assignedProviderName: null,
        startedAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });
      
      await updateProviderStatus(uid, 'busy', p.id);
      
      await logAudit('start', { patientId: p.id, providerId: uid });
      setActivePatient({ ...p, status: 'In-Progress', providerId: uid, startedAt: new Date().toISOString() });
      setClerkingData({
        ...(p.clerkingData || {}),
        hpi: p.symptoms || p.clerkingData?.hpi || '',
        vitals: p.clerkingData?.vitals || {},
      });
      toast.success(`Started clerking ${p.patientName}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to start clerking');
    }
  };

  const pauseVisit = async () => {
    if (!activePatient) return;
    try {
      await updateDoc(doc(db, 'preconsultations', activePatient.id), {
        status: 'Paused',
        clerkingData,
        providerId: auth.currentUser?.uid || null,
        lastUpdated: serverTimestamp(),
      });
      
      await updateProviderStatus(auth.currentUser?.uid || '', 'available', null);
      
      await logAudit('pause', { patientId: activePatient.id, providerId: auth.currentUser?.uid });
      setActivePatient(null);
      setClerkingData({});
      toast.success('Visit paused');
    } catch (err) {
      console.error(err);
      toast.error('Failed to pause');
    }
  };

  const completeVisit = async () => {
    if (!activePatient) return;
    try {
      await updateDoc(doc(db, 'preconsultations', activePatient.id), {
        status: 'Completed',
        providerId: auth.currentUser?.uid || null,
        clerkingData,
        completedAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });

      await updateProviderStatus(auth.currentUser?.uid || '', 'available', null);
      
      await logAudit('complete', { patientId: activePatient.id, providerId: auth.currentUser?.uid });
      setActivePatient(null);
      setClerkingData({});
      toast.success('Visit completed');
      
      if (activePatient.phone) {
        try {
          const message = `Hello ${activePatient.patientName}, your consultation has been completed. Your provider will send any necessary prescriptions or follow-up instructions shortly. Thank you for choosing our service.`;
          openWhatsApp(activePatient.phone, message);
          toast.success('Opening WhatsApp with completion message');
        } catch (error) {
          console.error('Failed to open WhatsApp:', error);
          toast.error('Failed to open WhatsApp');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to complete');
    }
  };

  const markAsNoShow = async (p: PreConsult) => {
    try {
      await updateDoc(doc(db, 'preconsultations', p.id), {
        status: 'No-Show',
        lastUpdated: serverTimestamp(),
      });
      await logAudit('no_show', { patientId: p.id });
      toast.success('Marked as no-show');
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark as no-show');
    }
  };

  const cancelAppointment = async (p: PreConsult) => {
    try {
      await updateDoc(doc(db, 'preconsultations', p.id), {
        status: 'Cancelled',
        lastUpdated: serverTimestamp(),
      });
      await logAudit('cancel', { patientId: p.id });
      toast.success('Appointment cancelled');
    } catch (err) {
      console.error(err);
      toast.error('Failed to cancel appointment');
    }
  };

  const reopenVisit = async (p: PreConsult) => {
    if (!isAdmin) return toast.error('Admin only');
    try {
      await updateDoc(doc(db, 'preconsultations', p.id), {
        status: 'Waiting',
        providerId: null,
        providerName: null,
        assignedProviderId: null,
        assignedProviderName: null,
        startedAt: null,
        completedAt: null,
        lastUpdated: serverTimestamp(),
      });
      await logAudit('reopen', { patientId: p.id, admin: auth.currentUser?.uid });
      toast.success('Visit reopened to waiting queue');
    } catch (err) {
      console.error(err);
      toast.error('Failed to reopen');
    }
  };

  const undoNoShowOrCancelled = async (p: PreConsult) => {
    if (!isAdmin) return toast.error('Admin only');
    try {
      await updateDoc(doc(db, 'preconsultations', p.id), {
        status: 'Waiting',
        lastUpdated: serverTimestamp(),
      });
      await logAudit('undo_status', { patientId: p.id, previousStatus: p.status, admin: auth.currentUser?.uid });
      toast.success('Status reset to Waiting');
    } catch (err) {
      console.error(err);
      toast.error('Failed to reset status');
    }
  };

  const toggleUrgent = async (p: PreConsult) => {
    try {
      await updateDoc(doc(db, 'preconsultations', p.id), { urgent: !p.urgent, lastUpdated: serverTimestamp() });
      await logAudit('toggle_urgent', { patientId: p.id, urgent: !p.urgent });
      toast.success(p.urgent ? 'Removed priority' : 'Marked priority');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update priority');
    }
  };

  const deleteSubmission = async (id: string) => {
    if (!confirm('Delete submission?')) return;
    try {
      await deleteDoc(doc(db, 'preconsultations', id));
      await logAudit('delete', { patientId: id });
      toast.success('Deleted');
    } catch (err) {
      console.error(err);
      toast.error('Delete failed');
    }
  };

  /* FIXED: Admin assign function */
  const openAdminAssignModal = (p: PreConsult) => {
    setAssignTarget(p);
    setAssignProvider(p.assignedProviderId || null);
    setAssignModalOpen(true);
  };

  const confirmAdminAssign = async () => {
    if (!assignTarget || !assignProvider) {
      toast.error('Select provider');
      return;
    }
    
    const provider = providers.find(p => p.uid === assignProvider);
    const providerName = provider?.name || 'Unknown Provider';
    
    try {
      await markAsWaitingForProvider(assignTarget, assignProvider, providerName);
      
      await logAudit('admin_assign', { patientId: assignTarget.id, providerId: assignProvider, providerName });
      setAssignModalOpen(false);
      setAssignTarget(null);
      setAssignProvider(null);
      toast.success(`Assigned to ${providerName}`);
    } catch (err) {
      console.error(err);
      toast.error('Assign failed');
    }
  };

  /* FIXED: Provider assign function - same pattern as admin */
  const openProviderAssignModal = (p: PreConsult) => {
    setProviderAssignTarget(p);
    setAssignProvider(p.assignedProviderId || null);
    setProviderAssignModalOpen(true);
  };

  const confirmProviderAssign = async () => {
    if (!providerAssignTarget || !assignProvider) {
      toast.error('Select provider');
      return;
    }
    
    const provider = providers.find(p => p.uid === assignProvider);
    const providerName = provider?.name || 'Unknown Provider';
    
    try {
      await markAsWaitingForProvider(providerAssignTarget, assignProvider, providerName);
      
      await logAudit('provider_assign', { 
        patientId: providerAssignTarget.id, 
        fromProviderId: auth.currentUser?.uid,
        toProviderId: assignProvider, 
        providerName 
      });
      
      setProviderAssignModalOpen(false);
      setProviderAssignTarget(null);
      setAssignProvider(null);
      toast.success(`Assigned to ${providerName}`);
    } catch (err) {
      console.error(err);
      toast.error('Assign failed');
    }
  };

  const reschedulePatientToSlot = async () => {
    if (!reschedulePatient || !selectedSlot) return;
    try {
      await updateDoc(doc(db, 'preconsultations', reschedulePatient.id), { 
        preferredTime: selectedSlot,
        lastUpdated: serverTimestamp()
      });
      await logAudit('reschedule', { patientId: reschedulePatient.id, newTime: selectedSlot });
      setRescheduleOpen(false);
      setReschedulePatient(null);
      toast.success(`Rescheduled to ${selectedSlot}`);
    } catch (err) {
      console.error(err);
      toast.error('Reschedule failed');
    }
  };

  const openViewHistory = (p: PreConsult) => {
    setHistoryPatient(p);
    setViewHistoryOpen(true);
  };

  /* FIXED: WhatsApp button now opens WhatsApp directly like video/call buttons */
  const openWhatsAppDirect = (p: PreConsult) => {
    if (!p.phone) {
      toast.error('Patient phone number not available');
      return;
    }
    
    const message = `Hello ${p.patientName}, this is regarding your ${p.service || 'consultation'} at TibaCare. How can I assist you today?`;
    openWhatsApp(p.phone, message);
  };

  const openWhatsappModal = (p: PreConsult) => {
    setSelectedWhatsappPatient(p);
    setWhatsappMessage(`Hello ${p.patientName}, this is regarding your ${p.service || 'consultation'} at TibaCare. How can I assist you today?`);
    setWhatsappModalOpen(true);
  };

  /* FIXED: WhatsApp message sending now opens WhatsApp directly */
  const sendCustomWhatsAppMessage = async () => {
    if (!selectedWhatsappPatient) return;
    
    if (!selectedWhatsappPatient.phone) {
      toast.error('Patient phone number not available');
      return;
    }
    
    try {
      openWhatsApp(selectedWhatsappPatient.phone, whatsappMessage);
      toast.success('Opening WhatsApp with your message');
      setWhatsappModalOpen(false);
      setWhatsappMessage('');
      setSelectedWhatsappPatient(null);
    } catch (error) {
      console.error('Failed to open WhatsApp:', error);
      toast.error('Failed to open WhatsApp');
    }
  };

  /* ------------- MENTAL HEALTH SPECIFIC COMPONENTS ------------- */

  /* Mental Health Assessment Form */
  const MentalHealthAssessmentForm = () => {
    const mentalState = clerkingData?.mentalStateExam || {};

    const updateMentalState = (field: keyof MentalHealthAssessment, value: string) => {
      setClerkingData(prev => ({
        ...prev,
        mentalStateExam: {
          ...(prev.mentalStateExam || {}),
          [field]: value
        }
      }));
    };

    return (
      <div className="space-y-6">
        {/* Presenting Complaint */}
        <div>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Presenting Complaint & History
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <label>
              <div className="font-semibold text-sm mb-1">Presenting Complaint</div>
              <textarea 
                rows={2}
                value={clerkingData?.presentingComplaint || ''} 
                onChange={(e) => setClerkingData(prev => ({ ...prev, presentingComplaint: e.target.value }))} 
                className="w-full p-3 border rounded" 
                placeholder="Main reason for consultation..." 
              />
            </label>
            
            <label>
              <div className="font-semibold text-sm mb-1">History of Presenting Complaint</div>
              <textarea 
                rows={3}
                value={clerkingData?.historyPresentingComplaint || ''} 
                onChange={(e) => setClerkingData(prev => ({ ...prev, historyPresentingComplaint: e.target.value }))} 
                className="w-full p-3 border rounded" 
                placeholder="Onset, duration, progression, triggers..." 
              />
            </label>
          </div>
        </div>

        {/* Psychiatric History */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Psychiatric History</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label>
              <div className="font-semibold text-sm mb-1">Past Psychiatric History</div>
              <textarea 
                rows={3}
                value={clerkingData?.psychiatricHistory || ''} 
                onChange={(e) => setClerkingData(prev => ({ ...prev, psychiatricHistory: e.target.value }))} 
                className="w-full p-3 border rounded" 
                placeholder="Previous diagnoses, treatments, hospitalizations..." 
              />
            </label>
            
            <label>
              <div className="font-semibold text-sm mb-1">Family Psychiatric History</div>
              <textarea 
                rows={3}
                value={clerkingData?.familyPsychiatricHistory || ''} 
                onChange={(e) => setClerkingData(prev => ({ ...prev, familyPsychiatricHistory: e.target.value }))} 
                className="w-full p-3 border rounded" 
                placeholder="Mental health conditions in family..." 
              />
            </label>
          </div>
        </div>

        {/* Personal History */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Personal & Social History</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label>
              <div className="font-semibold text-sm mb-1">Personal History</div>
              <textarea 
                rows={3}
                value={clerkingData?.personalHistory || ''} 
                onChange={(e) => setClerkingData(prev => ({ ...prev, personalHistory: e.target.value }))} 
                className="w-full p-3 border rounded" 
                placeholder="Development, education, relationships, occupation..." 
              />
            </label>
            
            <label>
              <div className="font-semibold text-sm mb-1">Premorbid Personality</div>
              <textarea 
                rows={3}
                value={clerkingData?.premorbidPersonality || ''} 
                onChange={(e) => setClerkingData(prev => ({ ...prev, premorbidPersonality: e.target.value }))} 
                className="w-full p-3 border rounded" 
                placeholder="Personality traits before current issues..." 
              />
            </label>
          </div>
        </div>

        {/* Mental State Examination */}
        <div>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Mental State Examination
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label>
              <div className="font-semibold text-sm mb-1">Mood</div>
              <input
                type="text"
                value={mentalState.mood || ''}
                onChange={(e) => updateMentalState('mood', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Patient's subjective mood..."
              />
            </label>
            
            <label>
              <div className="font-semibold text-sm mb-1">Affect</div>
              <input
                type="text"
                value={mentalState.affect || ''}
                onChange={(e) => updateMentalState('affect', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Objective emotional expression..."
              />
            </label>
            
            <label>
              <div className="font-semibold text-sm mb-1">Thought Process</div>
              <textarea 
                rows={2}
                value={mentalState.thoughtProcess || ''}
                onChange={(e) => updateMentalState('thoughtProcess', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Flow and form of thoughts..."
              />
            </label>
            
            <label>
              <div className="font-semibold text-sm mb-1">Thought Content</div>
              <textarea 
                rows={2}
                value={mentalState.thoughtContent || ''}
                onChange={(e) => updateMentalState('thoughtContent', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Themes, preoccupations, delusions..."
              />
            </label>
            
            <label>
              <div className="font-semibold text-sm mb-1">Perception</div>
              <input
                type="text"
                value={mentalState.perception || ''}
                onChange={(e) => updateMentalState('perception', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Hallucinations, illusions..."
              />
            </label>
            
            <label>
              <div className="font-semibold text-sm mb-1">Cognition</div>
              <input
                type="text"
                value={mentalState.cognition || ''}
                onChange={(e) => updateMentalState('cognition', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Orientation, memory, concentration..."
              />
            </label>
            
            <label>
              <div className="font-semibold text-sm mb-1">Insight</div>
              <input
                type="text"
                value={mentalState.insight || ''}
                onChange={(e) => updateMentalState('insight', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Understanding of condition..."
              />
            </label>
            
            <label>
              <div className="font-semibold text-sm mb-1">Judgment</div>
              <input
                type="text"
                value={mentalState.judgment || ''}
                onChange={(e) => updateMentalState('judgment', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Decision-making ability..."
              />
            </label>
          </div>
        </div>

        {/* Risk Assessment */}
        <div>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Risk Assessment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label>
              <div className="font-semibold text-sm mb-1">Suicide Risk</div>
              <select
                value={mentalState.suicideRisk || ''}
                onChange={(e) => updateMentalState('suicideRisk', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select risk level</option>
                <option value="None">None</option>
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
                <option value="Immediate">Immediate</option>
              </select>
            </label>
            
            <label>
              <div className="font-semibold text-sm mb-1">Self-Harm Risk</div>
              <select
                value={mentalState.selfHarmRisk || ''}
                onChange={(e) => updateMentalState('selfHarmRisk', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select risk level</option>
                <option value="None">None</option>
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
              </select>
            </label>
            
            <label>
              <div className="font-semibold text-sm mb-1">Violence Risk</div>
              <select
                value={mentalState.violenceRisk || ''}
                onChange={(e) => updateMentalState('violenceRisk', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select risk level</option>
                <option value="None">None</option>
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
              </select>
            </label>
          </div>
          
          <label className="block mt-4">
            <div className="font-semibold text-sm mb-1">Risk Assessment Details</div>
            <textarea 
              rows={3}
              value={mentalState.riskAssessment || ''}
              onChange={(e) => updateMentalState('riskAssessment', e.target.value)}
              className="w-full p-3 border rounded"
              placeholder="Detailed risk assessment, protective factors, risk factors..."
            />
          </label>
        </div>

        {/* Psychosocial Assessment */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Psychosocial Assessment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label>
              <div className="font-semibold text-sm mb-1">Activities of Daily Living</div>
              <textarea 
                rows={2}
                value={mentalState.adls || ''}
                onChange={(e) => updateMentalState('adls', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Self-care, work, social functioning..."
              />
            </label>
            
            <label>
              <div className="font-semibold text-sm mb-1">Social Support</div>
              <textarea 
                rows={2}
                value={mentalState.socialSupport || ''}
                onChange={(e) => updateMentalState('socialSupport', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Family, friends, community support..."
              />
            </label>
            
            <label>
              <div className="font-semibold text-sm mb-1">Current Stressors</div>
              <textarea 
                rows={2}
                value={mentalState.stressors || ''}
                onChange={(e) => updateMentalState('stressors', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Current life stressors..."
              />
            </label>
            
            <label>
              <div className="font-semibold text-sm mb-1">Coping Mechanisms</div>
              <textarea 
                rows={2}
                value={mentalState.copingMechanisms || ''}
                onChange={(e) => updateMentalState('copingMechanisms', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Healthy and unhealthy coping strategies..."
              />
            </label>
          </div>
        </div>

        {/* Management Plan */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Management Plan</h3>
          <div className="grid grid-cols-1 gap-4">
            <label>
              <div className="font-semibold text-sm mb-1">Diagnosis/Formulation</div>
              <textarea 
                rows={3}
                value={clerkingData?.impression || ''} 
                onChange={(e) => setClerkingData(prev => ({ ...prev, impression: e.target.value }))} 
                className="w-full p-3 border rounded" 
                placeholder="Diagnostic impression and formulation..." 
              />
            </label>
            
            <label>
              <div className="font-semibold text-sm mb-1">Management Plan</div>
              <textarea 
                rows={4}
                value={clerkingData?.managementPlan || ''} 
                onChange={(e) => setClerkingData(prev => ({ ...prev, managementPlan: e.target.value }))} 
                className="w-full p-3 border rounded" 
                placeholder="Treatment plan, therapy, medications, follow-up..." 
              />
            </label>
            
            <label>
              <div className="font-semibold text-sm mb-1">Safety Plan</div>
              <textarea 
                rows={3}
                value={clerkingData?.safetyPlan || ''} 
                onChange={(e) => setClerkingData(prev => ({ ...prev, safetyPlan: e.target.value }))} 
                className="w-full p-3 border rounded" 
                placeholder="Crisis plan, emergency contacts, safety measures..." 
              />
            </label>
          </div>
        </div>
      </div>
    );
  };

  /* General Medical Form (Existing) */
  const GeneralMedicalForm = () => (
    <div className="space-y-4">
      <label>
        <div className="font-semibold text-sm mb-1 flex items-center justify-between">
          <span>History of Presenting Illness (HPI)</span>
          <button 
            onClick={() => setShowTemplates(true)}
            className="text-xs text-blue-600 flex items-center gap-1"
          >
            <BookOpen className="w-3 h-3" /> Templates
          </button>
        </div>
        <textarea 
          ref={hpiRef}
          rows={3} 
          value={clerkingData?.hpi || ''} 
          onChange={(e) => {
            setClerkingData((c) => ({ ...c, hpi: e.target.value }));
            resizeHpi();
          }} 
          className="w-full p-3 border rounded" 
          placeholder="Document symptoms, duration, severity..." 
        />
      </label>

      <label>
        <div className="font-semibold text-sm mb-1">General Examination</div>
        <textarea rows={2} value={clerkingData?.generalExam || ''} onChange={(e) => setClerkingData((c) => ({ ...c, generalExam: e.target.value }))} className="w-full p-3 border rounded" placeholder="General appearance..." />
      </label>

      <label>
        <div className="font-semibold text-sm mb-1">Systemic Examination</div>
        <textarea rows={3} value={clerkingData?.systemExam || ''} onChange={(e) => setClerkingData((c) => ({ ...c, systemExam: e.target.value }))} className="w-full p-3 border rounded" placeholder="Cardiovascular, respiratory, etc." />
      </label>

      <label>
        <div className="font-semibold text-sm mb-1">Investigations</div>
        <textarea ref={investigationsRef} rows={2} value={clerkingData?.investigations || ''} onChange={(e) => setClerkingData((c) => ({ ...c, investigations: e.target.value }))} className="w-full p-3 border rounded" placeholder="Lab tests, imaging..." />
      </label>

      <label>
        <div className="font-semibold text-sm mb-1">Impression / Diagnosis</div>
        <textarea rows={2} value={clerkingData?.impression || ''} onChange={(e) => setClerkingData((c) => ({ ...c, impression: e.target.value }))} className="w-full p-3 border rounded" placeholder="Clinical impression" />
      </label>

      <label>
        <div className="font-semibold text-sm mb-1 flex items-center justify-between">
          <span>Plan / Treatment</span>
          <button 
            onClick={() => setShowTemplates(true)}
            className="text-xs text-blue-600 flex items-center gap-1"
          >
            <BookOpen className="w-3 h-3" /> Templates
          </button>
        </div>
        <textarea 
          ref={planRef}
          rows={3} 
          value={clerkingData?.plan || ''} 
          onChange={(e) => {
            setClerkingData((c) => ({ ...c, plan: e.target.value }));
            resizePlan();
          }} 
          className="w-full p-3 border rounded" 
          placeholder="Treatment plan, follow-up..." 
        />
      </label>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label>
          <div className="font-semibold text-sm mb-1">Medications</div>
          <textarea rows={2} value={clerkingData?.medications || ''} onChange={(e) => setClerkingData((c) => ({ ...c, medications: e.target.value }))} className="w-full p-3 border rounded" placeholder="Current medications..." />
        </label>
        
        <label>
          <div className="font-semibold text-sm mb-1">Allergies</div>
          <textarea rows={2} value={clerkingData?.allergies || ''} onChange={(e) => setClerkingData((c) => ({ ...c, allergies: e.target.value }))} className="w-full p-3 border rounded" placeholder="Known allergies..." />
        </label>
      </div>
    </div>
  );

  /* Enhanced PDF generation with mental health support */
  const generatePdfSummary = async () => {
    if (!activePatient) return toast.error('No active patient');
    
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm' });
    
    try {
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      
      // Different title for mental health
      if (isMentalHealthPatient) {
        doc.text('MENTAL HEALTH ASSESSMENT SUMMARY', 105, 20, { align: 'center' });
      } else {
        doc.text('PATIENT CONSULTATION SUMMARY', 105, 20, { align: 'center' });
      }
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 27, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      let yPosition = 40;
      
      // Patient Information
      doc.setFillColor(240, 240, 240);
      doc.rect(14, yPosition - 5, 182, 8, 'F');
      doc.text('PATIENT INFORMATION', 20, yPosition);
      yPosition += 10;
      
      doc.text(`Name: ${activePatient.patientName}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Age: ${activePatient.age || 'N/A'}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Service: ${activePatient.service || 'N/A'}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Phone: ${activePatient.phone || 'N/A'}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Status: ${activePatient.status || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      // Vitals for both types
      if (clerkingData?.vitals && Object.keys(clerkingData.vitals).length > 0) {
        doc.setFillColor(240, 240, 240);
        doc.rect(14, yPosition - 5, 182, 8, 'F');
        doc.text('VITAL SIGNS', 20, yPosition);
        yPosition += 10;
        
        const vitals = clerkingData.vitals;
        const vitalKeys = ['bp', 'hr', 'rr', 'temp', 'spo2', 'weight', 'height', 'bmi'];
        const vitalLabels = {
          bp: 'Blood Pressure', hr: 'Heart Rate', rr: 'Respiratory Rate',
          temp: 'Temperature', spo2: 'SpO2', weight: 'Weight', height: 'Height', bmi: 'BMI'
        };
        
        vitalKeys.forEach((key, index) => {
          if (vitals[key]) {
            const xPos = index % 2 === 0 ? 20 : 110;
            if (index % 2 === 0 && index !== 0) yPosition += 7;
            
            doc.text(`${vitalLabels[key as keyof typeof vitalLabels]}: ${vitals[key]}`, xPos, yPosition);
            if (index % 2 !== 0) yPosition += 7;
          }
        });
        yPosition += 10;
      }
      
      // Mental Health Specific Content
      if (isMentalHealthPatient) {
        // Presenting Complaint
        if (clerkingData?.presentingComplaint) {
          doc.setFillColor(240, 240, 240);
          doc.rect(14, yPosition - 5, 182, 8, 'F');
          doc.text('PRESENTING COMPLAINT', 20, yPosition);
          yPosition += 10;
          
          const splitText = doc.splitTextToSize(clerkingData.presentingComplaint, 180);
          doc.text(splitText, 20, yPosition);
          yPosition += splitText.length * 6 + 10;
        }
        
        // Mental State Examination
        if (clerkingData?.mentalStateExam) {
          const mse = clerkingData.mentalStateExam;
          doc.setFillColor(240, 240, 240);
          doc.rect(14, yPosition - 5, 182, 8, 'F');
          doc.text('MENTAL STATE EXAMINATION', 20, yPosition);
          yPosition += 10;
          
          const mseFields = [
            { label: 'Mood', value: mse.mood },
            { label: 'Affect', value: mse.affect },
            { label: 'Thought Process', value: mse.thoughtProcess },
            { label: 'Thought Content', value: mse.thoughtContent },
            { label: 'Perception', value: mse.perception },
            { label: 'Cognition', value: mse.cognition },
            { label: 'Insight', value: mse.insight },
            { label: 'Judgment', value: mse.judgment }
          ];
          
          for (const field of mseFields) {
            if (field.value) {
              doc.text(`${field.label}: ${field.value}`, 20, yPosition);
              yPosition += 7;
            }
          }
          yPosition += 5;
        }
        
        // Risk Assessment
        if (clerkingData?.mentalStateExam?.riskAssessment || 
            clerkingData?.mentalStateExam?.suicideRisk ||
            clerkingData?.mentalStateExam?.selfHarmRisk ||
            clerkingData?.mentalStateExam?.violenceRisk) {
          
          doc.setFillColor(240, 240, 240);
          doc.rect(14, yPosition - 5, 182, 8, 'F');
          doc.text('RISK ASSESSMENT', 20, yPosition);
          yPosition += 10;
          
          const riskFields = [
            { label: 'Suicide Risk', value: clerkingData.mentalStateExam?.suicideRisk },
            { label: 'Self-Harm Risk', value: clerkingData.mentalStateExam?.selfHarmRisk },
            { label: 'Violence Risk', value: clerkingData.mentalStateExam?.violenceRisk }
          ];
          
          for (const field of riskFields) {
            if (field.value) {
              doc.text(`${field.label}: ${field.value}`, 20, yPosition);
              yPosition += 7;
            }
          }
          
          if (clerkingData.mentalStateExam?.riskAssessment) {
            const splitRisk = doc.splitTextToSize(clerkingData.mentalStateExam.riskAssessment, 180);
            doc.text(splitRisk, 20, yPosition);
            yPosition += splitRisk.length * 6 + 5;
          }
          yPosition += 5;
        }
      }
      
      // Common sections for both mental health and general medical
      const sections = isMentalHealthPatient ? [
        { title: 'PSYCHIATRIC HISTORY', content: clerkingData?.psychiatricHistory },
        { title: 'FAMILY PSYCHIATRIC HISTORY', content: clerkingData?.familyPsychiatricHistory },
        { title: 'PERSONAL HISTORY', content: clerkingData?.personalHistory },
        { title: 'MANAGEMENT PLAN', content: clerkingData?.managementPlan },
        { title: 'SAFETY PLAN', content: clerkingData?.safetyPlan },
        { title: 'MEDICATIONS', content: clerkingData?.medications },
        { title: 'ALLERGIES', content: clerkingData?.allergies }
      ] : [
        { title: 'HISTORY OF PRESENTING ILLNESS', content: clerkingData?.hpi },
        { title: 'GENERAL EXAMINATION', content: clerkingData?.generalExam },
        { title: 'SYSTEMIC EXAMINATION', content: clerkingData?.systemExam },
        { title: 'INVESTIGATIONS', content: clerkingData?.investigations },
        { title: 'IMPRESSION/DIAGNOSIS', content: clerkingData?.impression },
        { title: 'TREATMENT PLAN', content: clerkingData?.plan },
        { title: 'MEDICATIONS', content: clerkingData?.medications },
        { title: 'ALLERGIES', content: clerkingData?.allergies }
      ];
      
      for (const section of sections) {
        if (section.content) {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.setFillColor(240, 240, 240);
          doc.rect(14, yPosition - 5, 182, 8, 'F');
          doc.text(section.title, 20, yPosition);
          yPosition += 10;
          
          const splitText = doc.splitTextToSize(section.content, 180);
          doc.text(splitText, 20, yPosition);
          yPosition += splitText.length * 6 + 10;
        }
      }
      
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(14, pageHeight - 15, 196, pageHeight - 15);
      
      doc.text('TibaCare - Your Trusted Telemedicine Partner', 105, pageHeight - 10, { align: 'center' });
      doc.text('Phone: +254 705 575 068 | Email: info@tibacare.com', 105, pageHeight - 5, { align: 'center' });
      
      const fileName = isMentalHealthPatient 
        ? `mental-health-assessment-${activePatient.patientName.replace(/\s+/g, '-')}.pdf`
        : `consultation-summary-${activePatient.patientName.replace(/\s+/g, '-')}.pdf`;
      
      doc.save(fileName);
      toast.success('PDF generated successfully');
      
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  /* Render provider tool */
  const renderProviderTool = () => {
    if (!activeTool) return null;
    
    const tool = PROVIDER_TOOLS.find(t => t.id === activeTool);
    if (!tool) return null;
    
    const ToolComponent = tool.component;
    
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-md max-w-4xl w-full max-h-[80vh] overflow-auto p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {tool.icon} {tool.name}
            </h3>
            <button 
              onClick={() => setActiveTool(null)} 
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <ToolComponent 
            patient={activePatient} 
            onClose={() => setActiveTool(null)}
          />
        </div>
    );
  };

  /* Filtered view */
  const filtered = useMemo(() => {
    const uid = auth.currentUser?.uid;
    let result = preConsultations;
    
    if (tab === 'MyPatients') {
      result = result.filter((p) => p.providerId === uid || p.assignedProviderId === uid);
    } else if (tab !== 'All') {
      result = result.filter((p) => p.status === tab);
    }
    
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      result = result.filter(p => 
        p.patientName.toLowerCase().includes(term) ||
        p.service?.toLowerCase().includes(term) ||
        p.symptoms?.toLowerCase().includes(term) ||
        p.phone?.includes(term)
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }
    
    if (dateFilter) {
      const filterDate = new Date(dateFilter).toDateString();
      result = result.filter(p => {
        const patientDate = p.preferredDate?.toDate ? p.preferredDate.toDate().toDateString() : 
                          new Date(p.preferredDate || '').toDateString();
        return patientDate === filterDate;
      });
    }
    
    if (serviceFilter !== 'all') {
      result = result.filter(p => p.service === serviceFilter);
    }
    
    if (urgentFilter !== null) {
      result = result.filter(p => p.urgent === urgentFilter);
    }
    
    return result;
  }, [preConsultations, tab, debouncedSearchTerm, statusFilter, dateFilter, serviceFilter, urgentFilter]);

  const formatClerkingData = (data?: ClerkingData) => {
    if (!data || Object.keys(data).length === 0) return <p className="text-gray-500">No clerking data available.</p>;
    return (
      <div className="space-y-3">
        {data.hpi && (
          <div>
            <h4 className="font-semibold">HPI</h4>
            <p className="whitespace-pre-wrap">{data.hpi}</p>
          </div>
        )}
        {data.generalExam && (
          <div>
            <h4 className="font-semibold">General Exam</h4>
            <p className="whitespace-pre-wrap">{data.generalExam}</p>
          </div>
        )}
        {data.systemExam && (
          <div>
            <h4 className="font-semibold">Systemic Exam</h4>
            <p className="whitespace-pre-wrap">{data.systemExam}</p>
          </div>
        )}
        {data.investigations && (
          <div>
            <h4 className="font-semibold">Investigations</h4>
            <p className="whitespace-pre-wrap">{data.investigations}</p>
          </div>
        )}
        {data.impression && (
          <div>
            <h4 className="font-semibold">Impression</h4>
            <p className="whitespace-pre-wrap">{data.impression}</p>
          </div>
        )}
        {data.plan && (
          <div>
            <h4 className="font-semibold">Plan</h4>
            <p className="whitespace-pre-wrap">{data.plan}</p>
          </div>
        )}
      </div>
    );
  };

  // Get unique services for filter
  const services = useMemo(() => {
    const allServices = preConsultations
      .map(p => p.service)
      .filter(Boolean) as string[];
    return [...new Set(allServices)];
  }, [preConsultations]);

  /* ---------------- UI rendering ---------------- */
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Toaster position="top-center" />

      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-800">TibaCare — Provider Dashboard</h1>
          <p className="text-sm text-gray-600">Manage patient queue and clerking</p>
          {isAdmin && (
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded inline-block mt-1">
              🔧 Administrator Mode - Full Access
            </div>
          )}
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              providerStatus === 'available' ? 'bg-green-100 text-green-800' :
              providerStatus === 'busy' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {providerStatus.toUpperCase()}
            </div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => {
                setShowRealTimeUpdates(!showRealTimeUpdates);
                markUpdatesAsRead();
              }}
              className="p-2 rounded-full hover:bg-gray-100 relative"
              title="Recent updates"
            >
              <Bell className="w-5 h-5" />
              {unreadUpdates > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadUpdates}
                </span>
              )}
            </button>
            
            {showRealTimeUpdates && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
                <div className="p-3 border-b font-medium flex justify-between items-center">
                  <span>Recent Updates</span>
                  <button onClick={() => setShowRealTimeUpdates(false)}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {realTimeUpdates.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No recent updates</div>
                  ) : (
                    realTimeUpdates.map((update, index) => (
                      <div key={index} className="p-3 border-b">
                        <div className="text-sm">{update.message}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {update.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setShowToolsPanel(!showToolsPanel)}
            className="px-3 py-2 bg-purple-600 text-white rounded flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Tools
          </button>
          
          <div className="text-sm text-gray-600">View:</div>
          <div className="flex gap-1 rounded-lg bg-white p-1 shadow-sm border">
            {(['Waiting', 'In-Progress', 'Paused', 'Completed', 'All', 'MyPatients', 'No-Show', 'Cancelled'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 text-sm rounded-md flex items-center gap-1 ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                title={t}
              >
                {t === 'Waiting' && <Clock className="w-4 h-4" />}
                {t === 'In-Progress' && <FileText className="w-4 h-4" />}
                {t === 'Paused' && <PauseCircle className="w-4 h-4" />}
                {t === 'Completed' && <CheckCircle2 className="w-4 h-4" />}
                {t === 'All' && <Eye className="w-4 h-4" />}
                {t === 'MyPatients' && <User className="w-4 h-4" />}
                {t === 'No-Show' && <X className="w-4 h-4" />}
                {t === 'Cancelled' && <X className="w-4 h-4" />}
                <span className="ml-1">{t}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-3 py-2 bg-white border rounded-lg flex items-center gap-2"
          >
          <Filter className="w-4 h-4" />
          Filters
          {showFilters ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
        </button>
        
        {showFilters && (
          <div className="w-full bg-white p-4 rounded-lg border mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="all">All Statuses</option>
                <option value="Waiting">Waiting</option>
                <option value='In-Progress'>In Progress</option>
                <option value='Paused'>Paused</option>
                <option value='Completed'>Completed</option>
                <option value='No-Show'>No Show</option>
                <option value='Cancelled'>Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Service</label>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="all">All Services</option>
                {services.map(service => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={urgentFilter === null ? 'all' : urgentFilter ? 'urgent' : 'normal'}
                onChange={(e) => {
                  if (e.target.value === 'all') setUrgentFilter(null);
                  else setUrgentFilter(e.target.value === 'urgent');
                }}
                className="w-full p-2 border rounded"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent Only</option>
                <option value="normal">Normal Only</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <main className="grid grid-cols-12 gap-6">
        {/* Left: Queue */}
        <section className="col-span-4 bg-white rounded-lg shadow-sm border p-4 h-[80vh] overflow-auto">
          <h2 className="text-lg font-semibold mb-3 flex items-center justify-between">
            <span>
              {tab === 'MyPatients' ? 'My Patients' : `Patients Queue (${filtered.length})`}
            </span>
            <span className="text-xs font-normal text-gray-500">
              Updated: {new Date().toLocaleTimeString()}
            </span>
          </h2>

          {filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p>No patients in this view.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((p) => {
                const buttonsLocked = areButtonsLocked(p);
                const assignedToOther = isAssignedToOther(p);
                
                return (
                  <div
                    key={p.id}
                    className={`border rounded-lg p-3 ${
                      p.urgent && p.status !== 'Completed' && p.status !== 'Cancelled' && p.status !== 'No-Show' 
                        ? 'bg-red-50 border-red-200' 
                        : p.status === 'In-Progress' 
                          ? 'bg-blue-50 border-blue-100' 
                          : p.status === 'Waiting' && p.assignedProviderId
                            ? 'bg-purple-50 border-purple-100'
                            : p.status === 'Waiting'
                              ? 'bg-yellow-50 border-yellow-100'
                              : p.status === 'Paused'
                                ? 'bg-orange-50 border-orange-100'
                                : 'bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {p.patientName}
                          {p.urgent && p.status !== 'Completed' && p.status !== 'Cancelled' && p.status !== 'No-Show' && (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                          
                          {p.status === 'In-Progress' && p.providerId && (
                            <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center gap-1">
                              <UserCheck className="w-3 h-3" />
                              {p.providerName || 'Provider'} attending
                            </div>
                          )}
                          
                          {p.status === 'Waiting' && p.assignedProviderId && (
                            <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded flex items-center gap-1">
                              <UserCheck className="w-3 h-3" />
                              Assigned to {p.assignedProviderName}
                              {assignedToOther && !isAdmin && <Lock className="w-3 h-3 ml-1" />}
                            </div>
                          )}
                          
                          {p.status === 'Waiting' && !p.assignedProviderId && (
                            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Unassigned - Available
                            </div>
                          )}
                          
                          {p.status === 'Paused' && (
                            <div className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded flex items-center gap-1">
                              <PauseCircle className="w-3 h-3" />
                              Paused {p.providerId === auth.currentUser?.uid ? '(You)' : p.providerName ? `(${p.providerName})` : ''}
                              {buttonsLocked && !isAdmin && <Lock className="w-3 h-3 ml-1" />}
                            </div>
                          )}

                          {isAdmin && (
                            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded flex items-center gap-1">
                              <UserCheck className="w-3 h-3" />
                              Admin Access
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-600 flex items-center gap-2 mt-1">
                          <User className="w-3 h-3" /> {p.service || '-'} • {p.age ? `${p.age} yrs` : '-'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          <Calendar className="w-3 h-3 inline mr-1" /> 
                          {fmtDate(p.preferredDate)} at {p.preferredTime || 'N/A'}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {fmtDate(p.createdAt)}
                        </div>
                        <div className="text-xs mt-1">{fmtTime(p.createdAt)}</div>
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                      {p.symptoms || 'No symptoms provided'}
                    </div>

                    <div className="flex gap-2 flex-wrap mt-3">
                      {(p.status === 'Waiting' || p.status === 'Paused') && 
                       (!buttonsLocked || isAdmin) && 
                       (!p.assignedProviderId || p.assignedProviderId === auth.currentUser?.uid || isAdmin) && (
                        <button 
                          onClick={() => startClerking(p)} 
                          className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm flex items-center gap-1"
                        >
                          <FileText className="w-4 h-4" /> 
                          {p.status === 'Paused' ? 'Resume' : 'Start'}
                        </button>
                      )}

                      {p.status === 'In-Progress' && (p.providerId === auth.currentUser?.uid || isAdmin) && (
                        <button 
                          onClick={() => { setActivePatient(p); setClerkingData(p.clerkingData || {}); }} 
                          className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm flex items-center gap-1"
                        >
                          <RefreshCw className="w-4 h-4" /> Resume
                        </button>
                      )}

                      {(!buttonsLocked || isAdmin) && (
                        <>
                          <button onClick={() => openWhatsAppDirect(p)} className="px-3 py-1 bg-green-600 text-white rounded-md text-sm flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" /> WhatsApp
                          </button>

                          <button onClick={() => initiateWhatsAppCall(p.phone, false)} className="px-3 py-1 bg-blue-400 text-white rounded-md text-sm flex items-center gap-1">
                            <Phone className="w-4 h-4" /> Call
                          </button>

                          <button onClick={() => initiateWhatsAppCall(p.phone, true)} className="px-3 py-1 bg-purple-500 text-white rounded-md text-sm flex items-center gap-1">
                            <Video className="w-4 h-4" /> Video
                          </button>
                        </>
                      )}

                      <button onClick={() => openViewHistory(p)} className="px-3 py-1 bg-gray-600 text-white rounded-md text-sm flex items-center gap-1">
                        <Eye className="w-4 h-4" /> History
                      </button>

                      {(isAdmin || (p.status === 'Waiting' || p.status === 'Paused')) && (!buttonsLocked || isAdmin) && (
                        <button 
                          onClick={() => { 
                            if (isAdmin) {
                              openAdminAssignModal(p);
                            } else {
                              openProviderAssignModal(p);
                            }
                          }} 
                          className="px-3 py-1 bg-orange-500 text-white rounded-md text-sm flex items-center gap-1"
                        >
                          <Users className="w-4 h-4" /> Assign
                        </button>
                      )}

                      {isAdmin && (
                        <>
                          <button onClick={() => toggleUrgent(p)} className="px-3 py-1 bg-red-500 text-white rounded-md text-sm flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" /> {p.urgent ? 'Unmark' : 'Priority'}
                          </button>

                          <button onClick={() => deleteSubmission(p.id)} className="px-3 py-1 bg-gray-700 text-white rounded-md text-sm flex items-center gap-1">
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>

                          {p.status === 'Completed' && (
                            <button onClick={() => reopenVisit(p)} className="px-3 py-1 bg-green-600 text-white rounded-md text-sm flex items-center gap-1">
                              <RefreshCw className="w-4 h-4" /> Reopen
                            </button>
                          )}
                          
                          {(p.status === 'No-Show' || p.status === 'Cancelled') && (
                            <button onClick={() => undoNoShowOrCancelled(p)} className="px-3 py-1 bg-orange-500 text-white rounded-md text-sm flex items-center gap-1">
                              <RefreshCw className="w-4 h-4" /> Undo {p.status}
                            </button>
                          )}
                        </>
                      )}

                      {(isAdmin || p.status !== 'In-Progress' || p.providerId === auth.currentUser?.uid) && 
                       p.status !== 'Completed' && p.status !== 'Cancelled' && p.status !== 'No-Show' && 
                       (!buttonsLocked || isAdmin) && (
                        <button 
                          onClick={() => { setReschedulePatient(p); setRescheduleOpen(true); }} 
                          className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md text-sm flex items-center gap-1"
                        >
                          <Calendar className="w-4 h-4" /> Reschedule
                        </button>
                      )}
                      
                      {(p.status === 'Waiting') && isAdmin && (
                        <>
                          <button onClick={() => markAsNoShow(p)} className="px-3 py-1 bg-orange-500 text-white rounded-md text-sm flex items-center gap-1">
                            <X className="w-4 h-4" /> No Show
                          </button>
                          <button onClick={() => cancelAppointment(p)} className="px-3 py-1 bg-red-600 text-white rounded-md text-sm flex items-center gap-1">
                            <X className="w-4 h-4" /> Cancel
                          </button>
                        </>
                      )}

                      {buttonsLocked && !isAdmin && (
                        <div className="flex items-center gap-1 text-xs text-orange-600">
                          <Lock className="w-3 h-3" />
                          <span>
                            {assignedToOther 
                              ? `Assigned to ${p.assignedProviderName}` 
                              : 'Locked - Contact attending provider or admin'
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Center: Clerking - Modified for Mental Health */}
        <section className="col-span-8 bg-white rounded-lg shadow-sm border p-4 h-[80vh] overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {isMentalHealthPatient ? (
                <>
                  <Brain className="w-5 h-5 text-purple-600" />
                  Mental Health Assessment
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Clinical Encounter
                </>
              )}
            </h2>
            <div className="flex items-center gap-2">
              {activePatient && isMentalHealthPatient && (
                <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  Mental Health Mode
                </div>
              )}
              <button onClick={() => setShowVitalsPanel((s) => !s)} className="text-sm text-blue-600">
                {showVitalsPanel ? 'Hide Vitals' : 'Show Vitals'}
              </button>
              <button onClick={() => setShowTemplates(true)} className="text-sm text-blue-600 flex items-center gap-1">
                <BookOpen className="w-4 h-4" /> Templates
              </button>
            </div>
          </div>

          {activePatient && (
            <div className="flex items-center gap-3 mb-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <input
                  type="checkbox"
                  id="auto-save"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="auto-save">Auto-save</label>
              </div>
              
              {lastSaved && (
                <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
              )}
            </div>
          )}

          {activePatient ? (
            <>
              <div className="mb-4 p-3 rounded border bg-blue-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-lg flex items-center gap-2">
                      {activePatient.patientName}
                      {activePatient.urgent && activePatient.status !== 'Completed' && activePatient.status !== 'Cancelled' && activePatient.status !== 'No-Show' && (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                      {isMentalHealthPatient && (
                        <Brain className="w-5 h-5 text-purple-600" />
                      )}
                      {isAdmin && (
                        <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          🔧 Admin Mode
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1 flex gap-4 items-center">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" /> {activePatient.service || '-'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" /> {fmtTs(activePatient.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {new Date(elapsed).toISOString().substr(11, 8)}
                      </span>
                    </div>
                    <div className="text-sm mt-2">
                      <span className="font-medium">Age:</span> {activePatient.age || 'N/A'} • 
                      <span className="font-medium ml-2">Phone:</span> {activePatient.phone || 'N/A'}
                    </div>
                  </div>
                  <div className="text-sm bg-white px-2 py-1 rounded border">
                    {activePatient.status === 'In-Progress' && activePatient.providerName ? 
                      `${activePatient.providerName} attending` : 
                      activePatient.status === 'Waiting' && activePatient.assignedProviderName ?
                      `Waiting for ${activePatient.assignedProviderName}` : 
                      activePatient.status === 'Paused' && activePatient.providerName ?
                      `Paused - ${activePatient.providerName} attending` : '—'
                    }
                  </div>
                </div>

                <div className="mt-3 text-sm bg-white p-2 rounded border">
                  <span className="font-medium">Presenting Symptoms:</span> {activePatient.symptoms || 'None provided'}
                </div>
              </div>

              {showVitalsPanel && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" /> Vitals
                    </h3>
                    <button onClick={() => setClerkingData((cd) => ({ ...cd, vitals: {} }))} className="text-sm text-gray-600">
                      Clear
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded">
                    {['bp', 'hr', 'rr', 'temp', 'spo2', 'weight', 'height', 'bmi'].map((k) => (
                      <div key={k}>
                        <label className="block text-sm font-medium mb-1">{k.toUpperCase()}</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded"
                          value={(clerkingData?.vitals as any)?.[k] || ''}
                          onChange={(e) => setClerkingData((prev) => ({ ...prev, vitals: { ...(prev.vitals || {}), [k]: e.target.value } }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditional Form Rendering */}
              {isMentalHealthPatient ? (
                <MentalHealthAssessmentForm />
              ) : (
                <GeneralMedicalForm />
              )}

              <div className="mt-4 flex gap-2 flex-wrap">
                <button onClick={pauseVisit} className="px-4 py-2 bg-yellow-600 text-white rounded flex items-center gap-2">
                  <PauseCircle className="w-4 h-4" /> Pause
                </button>

                <button onClick={completeVisit} className="px-4 py-2 bg-green-600 text-white rounded flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Complete
                </button>

                <button onClick={() => openWhatsAppDirect(activePatient)} className="px-4 py-2 bg-green-500 text-white rounded flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>

                <button onClick={() => initiateWhatsAppCall(activePatient.phone, true)} className="px-4 py-2 bg-blue-500 text-white rounded flex items-center gap-2">
                  <Video className="w-4 h-4" /> Video
                </button>

                <button onClick={generatePdfSummary} className="px-4 py-2 bg-purple-600 text-white rounded flex items-center gap-2">
                  <DownloadCloud className="w-4 h-4" /> PDF Summary
                </button>

                {/* Add mental health specific tools if needed */}
                {isMentalHealthPatient && (
                  <button 
                    onClick={() => {/* Add mental health specific action */}}
                    className="px-4 py-2 bg-indigo-600 text-white rounded flex items-center gap-2"
                  >
                    <Heart className="w-4 h-4" /> Safety Plan
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Select a patient to start clerking.</p>
              <p className="text-sm mt-1">Click "Start" next to a patient's name to begin.</p>
            </div>
          )}
        </section>
      </main>

      {renderProviderTool()}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Clinical Templates</h3>
                <button onClick={() => setShowTemplates(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map(template => (
                  <div key={template.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h4 className="font-semibold mb-2">{template.name}</h4>
                    <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">{template.content}</p>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => applyTemplate(template, 'hpi')}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
                      >
                        Apply to HPI
                      </button>
                      <button
                        onClick={() => applyTemplate(template, 'plan')}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200"
                      >
                        Apply to Plan
                      </button>
                      {template.category === 'exam' && (
                        <button
                          onClick={() => applyTemplate(template, 'generalExam')}
                          className="px-3 py-1 bg-purple-100 text-purple-800 rounded text-sm hover:bg-purple-200"
                        >
                          Apply to Exam
                        </button>
                      )}
                      {template.category === 'mental_health' && (
                        <button
                          onClick={() => setClerkingData(prev => ({ 
                            ...prev, 
                            presentingComplaint: prev.presentingComplaint ? 
                              `${prev.presentingComplaint}\n${template.content}` : template.content 
                          }))}
                          className="px-3 py-1 bg-pink-100 text-pink-800 rounded text-sm hover:bg-pink-200"
                        >
                          Apply to Presenting
                        </button>
                      )}
                      {template.category === 'mental_status' && (
                        <button
                          onClick={() => setClerkingData(prev => ({ 
                            ...prev, 
                            mentalStateExam: {
                              ...prev.mentalStateExam,
                              thoughtProcess: prev.mentalStateExam?.thoughtProcess ?
                                `${prev.mentalStateExam.thoughtProcess}\n${template.content}` : template.content
                            }
                          }))}
                          className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded text-sm hover:bg-indigo-200"
                        >
                          Apply to MSE
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modals */}
      {assignModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Assign Patient to Provider</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Provider</label>
                <select
                  value={assignProvider || ''}
                  onChange={(e) => setAssignProvider(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select a provider</option>
                  {providers.map(provider => (
                    <option key={provider.uid} value={provider.uid}>
                      {provider.name} ({provider.status})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAdminAssign}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {providerAssignModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Assign Patient to Provider</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Provider</label>
                <select
                  value={assignProvider || ''}
                  onChange={(e) => setAssignProvider(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select a provider</option>
                  {providers.map(provider => (
                    <option key={provider.uid} value={provider.uid}>
                      {provider.name} ({provider.status})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setProviderAssignModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmProviderAssign}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {whatsappModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Send WhatsApp Message to {selectedWhatsappPatient?.patientName}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  rows={4}
                  className="w-full p-2 border rounded"
                  placeholder="Type your message here..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setWhatsappModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={sendCustomWhatsAppMessage}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Send via WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {viewHistoryOpen && historyPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">
                  Consultation History - {historyPatient.patientName}
                </h3>
                <button onClick={() => setViewHistoryOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
              {formatClerkingData(historyPatient.clerkingData)}
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleOpen && reschedulePatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Reschedule {reschedulePatient.patientName}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select New Time</label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  {availableSlots.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-gray-600">
                Current appointment: {fmtDate(reschedulePatient.preferredDate)} at {reschedulePatient.preferredTime}
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setRescheduleOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={reschedulePatientToSlot}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Reschedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProviderDashboard;