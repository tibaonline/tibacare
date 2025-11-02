'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type Consultation = {
  id: string;
  patientName: string;
  age?: number;
  service: string;
  status: 'Pending' | 'In-Progress' | 'Completed' | 'Paused';
  preferredDate?: any;
  preferredTime?: string;
  createdAt?: any;
  providerId?: string;
  providerName?: string;
  symptoms?: string;
  // REMOVED: clerkingData reference since it doesn't exist
  startedAt?: any;
  completedAt?: any;
};

type Provider = {
  uid: string;
  name: string;
  email: string;
};

const formatTimestamp = (ts: any) => {
  if (!ts) return 'Not set';
  if (typeof ts.toDate === 'function') return ts.toDate().toLocaleString();
  if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  if (typeof ts === 'string') return ts;
  return 'Not set';
};

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'provider'>('provider');
  const [uid, setUid] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'myPatients' | 'pending' | 'in-progress' | 'completed'>('all');
  const [reassignModal, setReassignModal] = useState<{open: boolean; consultationId: string | null}>({open: false, consultationId: null});
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const router = useRouter();

  // Check user role and load data
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/login');
      return;
    }

    setUid(user.uid);
    setUserName(user.displayName || user.email || 'Provider');
    
    // Check if user is admin (replace with your admin detection logic)
    const isAdmin = user.email === 'admin@example.com' || user.uid === '7B9Tlua5FkP8UGJ6Neiny8R6s8o1';
    setUserRole(isAdmin ? 'admin' : 'provider');

    // Load providers for admin reassignment
    if (isAdmin) {
      loadProviders();
    }

    // Real-time consultations fetch - Check both collections
    const preconsultationsQuery = query(collection(db, 'preconsultations'), orderBy('preferredDate', 'asc'));
    const consultationsQuery = query(collection(db, 'consultations'), orderBy('preferredDate', 'asc'));
    
    const unsubscribePreconsultations = onSnapshot(preconsultationsQuery, (snapshot) => {
      const data: Consultation[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Consultation[];
      
      // Merge with existing consultations
      setConsultations(prev => {
        const filtered = prev.filter(c => !c.id.startsWith('pre-'));
        return [...filtered, ...data];
      });
    }, (error) => {
      console.error('Error fetching preconsultations:', error);
    });

    const unsubscribeConsultations = onSnapshot(consultationsQuery, (snapshot) => {
      const data: Consultation[] = snapshot.docs.map((doc) => ({
        id: `cons-${doc.id}`, // Prefix to distinguish from preconsultations
        ...doc.data(),
      })) as Consultation[];
      
      // Merge with existing preconsultations
      setConsultations(prev => {
        const filtered = prev.filter(c => !c.id.startsWith('cons-'));
        return [...filtered, ...data];
      });
      setLoading(false);
    }, (error) => {
      console.error('Error fetching consultations:', error);
      toast.error('Failed to load consultations');
      setLoading(false);
    });

    return () => {
      unsubscribePreconsultations();
      unsubscribeConsultations();
    };
  }, [router]);

  // Load providers for admin reassignment
  const loadProviders = async () => {
    try {
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'provider'));
      const snapshot = await getDocs(usersQuery);
      const providersData: Provider[] = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as Provider[];
      setProviders(providersData);
    } catch (error) {
      console.error('Error loading providers:', error);
      toast.error('Failed to load providers');
    }
  };

  // Get the correct collection name based on consultation ID
  const getCollectionName = (consultationId: string): string => {
    return consultationId.startsWith('cons-') ? 'consultations' : 'preconsultations';
  };

  // Get the actual document ID (remove prefix if present)
  const getDocumentId = (consultationId: string): string => {
    return consultationId.startsWith('cons-') ? consultationId.substring(5) : consultationId;
  };

  // Start consultation
  const startConsultation = async (consultation: Consultation) => {
    if (!uid) return;
    
    // Check if provider is already attending another patient
    const alreadyAttending = consultations.find(c => 
      c.status === 'In-Progress' && c.providerId === uid && c.id !== consultation.id
    );
    
    if (alreadyAttending) {
      toast.error(`You are already attending ${alreadyAttending.patientName}. Please complete or pause that visit first.`);
      return;
    }

    try {
      const collectionName = getCollectionName(consultation.id);
      const documentId = getDocumentId(consultation.id);
      
      await updateDoc(doc(db, collectionName, documentId), {
        status: 'In-Progress',
        providerId: uid,
        providerName: userName,
        startedAt: serverTimestamp(),
      });
      toast.success(`Started consultation with ${consultation.patientName}`);
      router.push(`/provider/consultations/${consultation.id}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to start consultation');
    }
  };

  // Complete consultation
  const completeConsultation = async (id: string) => {
    try {
      const collectionName = getCollectionName(id);
      const documentId = getDocumentId(id);
      
      await updateDoc(doc(db, collectionName, documentId), { 
        status: 'Completed',
        completedAt: serverTimestamp(),
      });
      toast.success('Consultation marked as completed!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to complete consultation.');
    }
  };

  // Pause consultation
  const pauseConsultation = async (id: string) => {
    try {
      const collectionName = getCollectionName(id);
      const documentId = getDocumentId(id);
      
      await updateDoc(doc(db, collectionName, documentId), { status: 'Paused' });
      toast.success('Consultation paused!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to pause consultation.');
    }
  };

  // Reopen consultation (admin only)
  const reopenConsultation = async (id: string) => {
    try {
      const collectionName = getCollectionName(id);
      const documentId = getDocumentId(id);
      
      await updateDoc(doc(db, collectionName, documentId), { 
        status: 'Pending',
        providerId: null,
        providerName: null,
        startedAt: null,
        completedAt: null,
      });
      toast.success('Consultation reopened!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to reopen consultation.');
    }
  };

  // Delete consultation (admin only)
  const deleteConsultation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this consultation?')) return;
    try {
      const collectionName = getCollectionName(id);
      const documentId = getDocumentId(id);
      
      await deleteDoc(doc(db, collectionName, documentId));
      toast.success('Consultation deleted!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete consultation.');
    }
  };

  // Reassign provider (admin only)
  const reassignProvider = async (consultationId: string, newProviderId: string) => {
    try {
      const collectionName = getCollectionName(consultationId);
      const documentId = getDocumentId(consultationId);
      const provider = providers.find(p => p.uid === newProviderId);
      
      await updateDoc(doc(db, collectionName, documentId), { 
        providerId: newProviderId,
        providerName: provider?.name || 'Unknown Provider'
      });
      toast.success('Provider reassigned successfully!');
      setReassignModal({open: false, consultationId: null});
      setSelectedProvider('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to reassign provider.');
    }
  };

  // View consultation details - FIXED: Now correctly routes based on status
  const viewConsultation = (consultation: Consultation) => {
    if (consultation.status === 'Completed') {
      // For completed consultations, use the view page
      router.push(`/provider/consultations/${consultation.id}/view`);
    } else if (consultation.providerId === uid || userRole === 'admin') {
      // For active consultations, use the main consultation page
      router.push(`/provider/consultations/${consultation.id}`);
    } else {
      toast.error('This consultation is being handled by another provider');
    }
  };

  // Filters for consultations
  const filteredConsultations = consultations.filter((c) => {
    if (filter === 'myPatients') return c.providerId === uid;
    if (filter === 'pending') return c.status === 'Pending';
    if (filter === 'in-progress') return c.status === 'In-Progress';
    if (filter === 'completed') return c.status === 'Completed';
    return true; // 'all' filter
  });

  // Check if provider can start a consultation
  const canStartConsultation = (consultation: Consultation) => {
    if (userRole === 'admin') return true;
    if (consultation.status !== 'Pending') return false;
    
    // Check if provider is already attending another patient
    const alreadyAttending = consultations.find(c => 
      c.status === 'In-Progress' && c.providerId === uid
    );
    
    return !alreadyAttending;
  };

  if (loading) return <div className="p-4 text-center">Loading consultations...</div>;

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Consultation Management</h1>
        <div className="flex gap-2 flex-wrap">
          <button
            className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setFilter('all')}
          >
            All Consultations
          </button>
          <button
            className={`px-3 py-1 rounded ${filter === 'myPatients' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setFilter('myPatients')}
          >
            My Patients
          </button>
          <button
            className={`px-3 py-1 rounded ${filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button
            className={`px-3 py-1 rounded ${filter === 'in-progress' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setFilter('in-progress')}
          >
            In Progress
          </button>
          <button
            className={`px-3 py-1 rounded ${filter === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>
      </div>

      {filteredConsultations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No consultations found for the selected filter.
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredConsultations.map((consultation) => {
            const isCompleted = consultation.status === 'Completed';
            const isInProgress = consultation.status === 'In-Progress';
            const isMyPatient = consultation.providerId === uid;
            const canStart = canStartConsultation(consultation);

            return (
              <div
                key={consultation.id}
                className={`border rounded-lg p-4 shadow-sm ${
                  isCompleted ? 'bg-gray-50' : 'bg-white'
                } ${
                  isInProgress && isMyPatient ? 'border-blue-400 border-2' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {consultation.patientName} {consultation.age ? `(${consultation.age} yrs)` : ''}
                    </h3>
                    <p className="text-gray-700">Service: {consultation.service}</p>
                    {consultation.symptoms && (
                      <p className="text-gray-600 text-sm mt-1">Symptoms: {consultation.symptoms}</p>
                    )}
                    <p className="text-gray-700">
                      Status:{' '}
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          consultation.status === 'Completed'
                            ? 'bg-green-100 text-green-800'
                            : consultation.status === 'In-Progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : consultation.status === 'Paused'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {consultation.status}
                      </span>
                    </p>
                    <p className="text-gray-700 text-sm">
                      Preferred: {formatTimestamp(consultation.preferredDate)} {consultation.preferredTime || ''}
                    </p>
                    {consultation.providerName && (
                      <p className="text-gray-600 text-sm">Provider: {consultation.providerName}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Action buttons based on status and permissions */}
                    {consultation.status === 'Pending' && (
                      <button
                        onClick={() => startConsultation(consultation)}
                        disabled={!canStart}
                        className={`px-3 py-1 rounded text-sm ${
                          canStart ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Start Consultation
                      </button>
                    )}

                    {consultation.status === 'In-Progress' && isMyPatient && (
                      <>
                        <button
                          onClick={() => viewConsultation(consultation)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Continue Consultation
                        </button>
                        <button
                          onClick={() => pauseConsultation(consultation.id)}
                          className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                        >
                          Pause
                        </button>
                        <button
                          onClick={() => completeConsultation(consultation.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Complete
                        </button>
                      </>
                    )}

                    {consultation.status === 'Paused' && isMyPatient && (
                      <>
                        <button
                          onClick={() => viewConsultation(consultation)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Resume Consultation
                        </button>
                        <button
                          onClick={() => completeConsultation(consultation.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Complete
                        </button>
                      </>
                    )}

                    {consultation.status === 'Completed' && (
                      <button
                        onClick={() => viewConsultation(consultation)}
                        className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                      >
                        View Details
                      </button>
                    )}

                    {/* Admin actions */}
                    {userRole === 'admin' && (
                      <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-200">
                        {consultation.status === 'Completed' ? (
                          <button
                            onClick={() => reopenConsultation(consultation.id)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            Reopen
                          </button>
                        ) : (
                          <button
                            onClick={() => completeConsultation(consultation.id)}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                          >
                            Force Complete
                          </button>
                        )}
                        
                        <button
                          onClick={() => setReassignModal({open: true, consultationId: consultation.id})}
                          className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                        >
                          Reassign
                        </button>
                        
                        <button
                          onClick={() => deleteConsultation(consultation.id)}
                          className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reassign Modal */}
      {reassignModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Reassign Provider</h3>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full p-2 border rounded mb-4"
            >
              <option value="">Select a provider</option>
              {providers.map((provider) => (
                <option key={provider.uid} value={provider.uid}>
                  {provider.name} ({provider.email})
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setReassignModal({open: false, consultationId: null});
                  setSelectedProvider('');
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => reassignProvider(reassignModal.consultationId!, selectedProvider)}
                disabled={!selectedProvider}
                className={`px-4 py-2 rounded text-white ${
                  selectedProvider ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'
                }`}
              >
                Reassign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}