'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc,
  doc,
  serverTimestamp, 
  onSnapshot, 
  query, 
  orderBy,
  where 
} from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';

interface PreConsultation {
  id: string;
  patientName: string;
  age: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  service: string;
  symptoms: string;
  status: 'Pending' | 'In-Progress' | 'Completed' | 'Waiting' | 'Paused' | 'No-Show' | 'Cancelled';
  createdAt: any;
  clerkingData?: any;
  providerName?: string;
  completedAt?: any;
  patientPhone: string; // Add this to identify patient by phone
}

interface Service {
  title: string;
  emoji: string;
  desc: string;
  price: number;
}

// Format timestamp helper
const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return '-';
  try {
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString('en-KE', { 
        timeZone: 'Africa/Nairobi',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString('en-KE', { 
        timeZone: 'Africa/Nairobi',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return new Date(timestamp).toLocaleString('en-KE', { 
        timeZone: 'Africa/Nairobi',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch {
    return String(timestamp);
  }
};

// Get current date (today)
const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get current time for display
const getCurrentTime = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Get minimum date (today)
const getMinDate = () => {
  return new Date().toISOString().split('T')[0];
};

// Generate time slots from 7:00 AM to 8:00 PM in 15-minute intervals
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 7; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === 20 && minute > 0) continue;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeString);
    }
  }
  return slots;
};

// Get next available time slot (10 minutes from now, rounded up to next 15-minute interval)
const getNextAvailableTime = () => {
  const now = new Date();
  
  // If current time is after 8 PM, return first slot of next day
  if (now.getHours() >= 20) {
    return '07:00';
  }
  
  // Add 10 minutes
  const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
  
  // Round up to next 15-minute interval
  const minutes = tenMinutesLater.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 15) * 15;
  
  if (roundedMinutes === 60) {
    tenMinutesLater.setHours(tenMinutesLater.getHours() + 1);
    tenMinutesLater.setMinutes(0);
  } else {
    tenMinutesLater.setMinutes(roundedMinutes);
  }
  
  tenMinutesLater.setSeconds(0, 0);
  
  // Ensure time is within 7 AM - 8 PM
  const hours = tenMinutesLater.getHours();
  if (hours < 7) {
    tenMinutesLater.setHours(7, 0, 0, 0);
  } else if (hours >= 20) {
    tenMinutesLater.setHours(7, 0, 0, 0);
    tenMinutesLater.setDate(tenMinutesLater.getDate() + 1);
  }
  
  const hoursFormatted = String(tenMinutesLater.getHours()).padStart(2, '0');
  const minutesFormatted = String(tenMinutesLater.getMinutes()).padStart(2, '0');
  return `${hoursFormatted}:${minutesFormatted}`;
};

// Get available time slots for a specific date
const getAvailableTimeSlotsForDate = (selectedDate: string) => {
  const allSlots = generateTimeSlots();
  const today = getTodayDate();
  
  if (selectedDate === today) {
    const nextAvailable = getNextAvailableTime();
    return allSlots.filter(slot => slot >= nextAvailable);
  } else {
    return allSlots;
  }
};

export default function PatientPortal() {
  const [showForm, setShowForm] = useState(false);
  const [preConsultations, setPreConsultations] = useState<PreConsultation[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<PreConsultation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    phone: '',
    preferredDate: '',
    preferredTime: '',
    service: '',
    symptoms: '',
  });
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const [patientPhoneFilter, setPatientPhoneFilter] = useState('');

  const services: Service[] = [
    { emoji: '👶', title: 'Pediatrics', desc: 'Care for children', price: 350 },
    { emoji: '❤️', title: 'Reproductive Health', desc: 'Confidential reproductive services', price: 500 },
    { emoji: '🧠', title: 'Mental Health', desc: 'Counseling & support', price: 500 },
    { emoji: '🩺', title: 'Physician', desc: 'Comprehensive checkups', price: 500 },
    { emoji: '🤒', title: 'Dermatology', desc: 'Skin diagnosis & treatment', price: 350 },
    { emoji: '📞', title: 'General Consultation', desc: 'Talk to a doctor', price: 350 },
  ];

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Initialize form with default date and time when opened
  useEffect(() => {
    if (showForm) {
      const todayDate = getTodayDate();
      const nextAvailableTime = getNextAvailableTime();
      const availableSlots = getAvailableTimeSlotsForDate(todayDate);
      
      setTimeSlots(availableSlots);
      
      const defaultTime = availableSlots.includes(nextAvailableTime) 
        ? nextAvailableTime 
        : availableSlots[0] || '07:00';
      
      setFormData(prev => ({
        ...prev,
        preferredDate: todayDate,
        preferredTime: defaultTime
      }));
    }
  }, [showForm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // If phone number is entered, use it to filter their records
    if (name === 'phone' && value.trim()) {
      setPatientPhoneFilter(value.trim());
    }
  };

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    const availableSlots = getAvailableTimeSlotsForDate(selectedDate);
    
    setFormData(prev => ({ 
      ...prev, 
      preferredDate: selectedDate,
      preferredTime: availableSlots[0] || '07:00'
    }));
    
    setTimeSlots(availableSlots);
  };

  const validateForm = () => {
    if (!formData.patientName.trim()) {
      toast.error('Please enter patient name');
      return false;
    }
    if (!formData.phone.trim()) {
      toast.error('Please enter phone number');
      return false;
    }
    if (!formData.service) {
      toast.error('Please select a service');
      return false;
    }
    return true;
  };

  // Submit consultation form
  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setUploading(true);

    try {
      const consultationData = {
        patientName: formData.patientName.trim(),
        age: formData.age.trim(),
        phone: formData.phone.trim(),
        preferredDate: formData.preferredDate,
        preferredTime: formData.preferredTime,
        service: formData.service,
        symptoms: formData.symptoms.trim(),
        status: 'Pending',
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        patientPhone: formData.phone.trim(), // Store phone for filtering
      };

      const docRef = await addDoc(collection(db, 'preconsultations'), consultationData);
      console.log('✅ Consultation created with ID:', docRef.id);
      
      toast.success('Consultation submitted successfully!');
      
      // Reset form but keep phone number for filtering
      setFormData(prev => ({ 
        ...prev,
        patientName: '', 
        age: '', 
        preferredDate: '', 
        preferredTime: '', 
        service: '', 
        symptoms: '' 
        // Keep phone number to maintain filter
      }));
      setShowForm(false);
      
    } catch (error: any) {
      console.error('❌ Submission error:', error);
      toast.error('Failed to submit consultation. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Real-time Firestore listener - FIXED VERSION
  useEffect(() => {
    let q;
    
    if (patientPhoneFilter) {
      // Filter by patient's phone number
      q = query(
        collection(db, 'preconsultations'), 
        where('patientPhone', '==', patientPhoneFilter),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Show all consultations (or none until phone is entered)
      q = query(
        collection(db, 'preconsultations'), 
        orderBy('createdAt', 'desc')
      );
    }
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: PreConsultation[] = [];
        snapshot.forEach((doc) => {
          try {
            const data = doc.data();
            
            // Validate required fields
            if (!data.patientName || !data.phone) {
              console.warn('Skipping document with missing data:', doc.id);
              return;
            }
            
            const consultation: PreConsultation = {
              id: doc.id,
              patientName: data.patientName || '',
              age: data.age || '',
              phone: data.phone || '',
              preferredDate: data.preferredDate || '',
              preferredTime: data.preferredTime || '',
              service: data.service || '',
              symptoms: data.symptoms || '',
              status: data.status || 'Pending',
              createdAt: data.createdAt,
              clerkingData: data.clerkingData || {},
              providerName: data.providerName || '',
              completedAt: data.completedAt || null,
              patientPhone: data.patientPhone || data.phone, // Fallback to phone
            };
            
            items.push(consultation);
          } catch (error) {
            console.error('Error processing document:', doc.id, error);
          }
        });
        
        setPreConsultations(items);
        setLoadingData(false);
      },
      (error) => {
        console.error('Firestore listener error:', error);
        toast.error('Failed to load consultations');
        setLoadingData(false);
      }
    );

    return () => unsubscribe();
  }, [patientPhoneFilter]); // Re-run when phone filter changes

  // Manual filter by phone number
  const handleManualFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.phone.trim()) {
      setPatientPhoneFilter(formData.phone.trim());
      toast.success(`Showing consultations for phone: ${formData.phone.trim()}`);
    }
  };

  const openDetailsModal = (consultation: PreConsultation) => {
    setSelectedConsultation(consultation);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setSelectedConsultation(null);
    setShowDetailsModal(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'In-Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Waiting': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Pending': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Paused': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'No-Show': return 'bg-red-100 text-red-800 border-red-200';
      case 'Cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50 flex flex-col items-center">
      <Toaster position="top-center" />

      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-teal-800 mb-2">Patient Portal</h1>
          <p className="text-gray-600 mb-6">Book your telemedicine consultations</p>
          
          {/* Schedule Information */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <span>⏰</span>
              <span className="font-medium">Smart Scheduling</span>
            </div>
            <p className="text-sm text-blue-700">
              Current time: <strong>{currentTime}</strong>. 
              Time automatically set to <strong>10 minutes from now</strong>.
              Available slots: <strong>7:00 AM - 8:00 PM</strong> in 15-minute intervals.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4 justify-center mb-8">
          <button
            onClick={() => {
              setFormData({
                patientName: '', 
                age: '', 
                phone: formData.phone || '', // Keep phone if already entered
                preferredDate: '', 
                preferredTime: '', 
                service: '', 
                symptoms: '' 
              });
              setShowForm(true);
            }}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-all shadow-md flex items-center gap-2"
          >
            <span>+</span>
            New Consultation
          </button>
        </div>

        {/* Phone Filter Section */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <h3 className="font-semibold text-lg mb-3">View My Consultation History</h3>
          <form onSubmit={handleManualFilter} className="flex gap-3">
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter your phone number to view your consultations"
              className="flex-1 border p-3 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all"
            >
              View My Records
            </button>
          </form>
          {patientPhoneFilter && (
            <p className="text-sm text-green-600 mt-2">
              ✅ Showing consultations for: {patientPhoneFilter}
            </p>
          )}
        </div>

        {/* Pre-Consultation Form */}
        {showForm && (
          <form onSubmit={submitForm} className="w-full bg-white p-6 rounded-lg shadow-md space-y-6 border border-teal-100 mb-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-teal-700">Consultation Booking</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="block text-gray-700">
                <span className="font-medium">Patient Name *</span>
                <input 
                  type="text" 
                  name="patientName" 
                  value={formData.patientName} 
                  onChange={handleInputChange} 
                  className="w-full border p-3 rounded-lg mt-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent" 
                  required 
                  placeholder="Enter full name"
                />
              </label>
              
              <label className="block text-gray-700">
                <span className="font-medium">Age</span>
                <input 
                  type="number" 
                  name="age" 
                  value={formData.age} 
                  onChange={handleInputChange} 
                  className="w-full border p-3 rounded-lg mt-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent" 
                  placeholder="Enter age"
                  min="0"
                  max="120"
                />
              </label>
              
              <label className="block text-gray-700">
                <span className="font-medium">Phone / WhatsApp *</span>
                <input 
                  type="text" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleInputChange} 
                  className="w-full border p-3 rounded-lg mt-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent" 
                  required 
                  placeholder="Enter phone number"
                />
              </label>
              
              <label className="block text-gray-700">
                <span className="font-medium">Select Service *</span>
                <select 
                  name="service" 
                  value={formData.service} 
                  onChange={handleInputChange} 
                  className="w-full border p-3 rounded-lg mt-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent" 
                  required
                >
                  <option value="">-- Choose Service --</option>
                  {services.map(s => (
                    <option key={s.title} value={s.title}>
                      {s.emoji} {s.title} - KSh {s.price}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-gray-700">
                <span className="font-medium">Preferred Date *</span>
                <input 
                  type="date" 
                  name="preferredDate" 
                  value={formData.preferredDate} 
                  onChange={handleDateChange}
                  min={getMinDate()}
                  className="w-full border p-3 rounded-lg mt-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent" 
                  required 
                />
              </label>
              
              <label className="block text-gray-700">
                <span className="font-medium">Preferred Time *</span>
                <select 
                  name="preferredTime" 
                  value={formData.preferredTime} 
                  onChange={handleInputChange}
                  className="w-full border p-3 rounded-lg mt-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                  required
                >
                  {timeSlots.map((slot, index) => (
                    <option key={index} value={slot}>
                      {slot} {slot === formData.preferredTime ? '(Auto-selected)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  {timeSlots.length} available time slots
                </p>
              </label>
            </div>

            <label className="block text-gray-700">
              <span className="font-medium">Symptoms</span>
              <textarea 
                name="symptoms" 
                value={formData.symptoms} 
                onChange={handleInputChange} 
                rows={4} 
                className="w-full border p-3 rounded-lg mt-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent" 
                placeholder="Describe your symptoms, duration, and any other relevant information..." 
              />
            </label>

            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-all flex items-center justify-center gap-2 font-medium flex-1"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={uploading} 
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-all flex items-center justify-center gap-2 font-medium flex-1"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <span>📋</span>
                    Book Consultation
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Submitted Consultations */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-teal-700">
              {patientPhoneFilter ? 'My Consultations' : 'All Consultations'}
            </h2>
            {preConsultations.length > 0 && (
              <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm">
                {preConsultations.length} record(s)
              </span>
            )}
          </div>
          
          {loadingData ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading consultations...</p>
            </div>
          ) : preConsultations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl mb-3 block">📋</span>
              <p>
                {patientPhoneFilter 
                  ? 'No consultations found for your phone number.' 
                  : 'No consultations available. Enter your phone number to view your records.'}
              </p>
              <p className="text-sm mt-1">
                {patientPhoneFilter 
                  ? 'Book a new consultation using the form above.' 
                  : 'Or book your first consultation using the form above.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {preConsultations.map((consultation) => (
                <div key={consultation.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                        {consultation.patientName}
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(consultation.status)}`}>
                          {consultation.status}
                        </span>
                      </h3>
                      <div className="text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <span>🩺</span> {consultation.service}
                        </span>
                        <span className="flex items-center gap-1 mt-1">
                          <span>📅</span> {consultation.preferredDate} at {consultation.preferredTime}
                        </span>
                        <span className="flex items-center gap-1 mt-1">
                          <span>⏰</span> {formatTimestamp(consultation.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => openDetailsModal(consultation)}
                        className="bg-teal-100 text-teal-800 px-3 py-2 rounded flex items-center gap-2 hover:bg-teal-200 transition-colors text-sm"
                      >
                        <span>👁️</span>
                        View Details
                      </button>
                    </div>
                  </div>
                  
                  {consultation.symptoms && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-700">
                        <strong>Symptoms:</strong> {consultation.symptoms}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedConsultation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Consultation Details</h3>
                <button
                  onClick={closeDetailsModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-medium">Patient Name</label>
                    <p className="text-gray-700">{selectedConsultation.patientName}</p>
                  </div>
                  <div>
                    <label className="font-medium">Age</label>
                    <p className="text-gray-700">{selectedConsultation.age || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="font-medium">Phone</label>
                    <p className="text-gray-700">{selectedConsultation.phone}</p>
                  </div>
                  <div>
                    <label className="font-medium">Service</label>
                    <p className="text-gray-700">{selectedConsultation.service}</p>
                  </div>
                  <div>
                    <label className="font-medium">Preferred Date</label>
                    <p className="text-gray-700">{selectedConsultation.preferredDate}</p>
                  </div>
                  <div>
                    <label className="font-medium">Preferred Time</label>
                    <p className="text-gray-700">{selectedConsultation.preferredTime}</p>
                  </div>
                  <div>
                    <label className="font-medium">Status</label>
                    <p className="text-gray-700">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedConsultation.status)}`}>
                        {selectedConsultation.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="font-medium">Submitted</label>
                    <p className="text-gray-700">{formatTimestamp(selectedConsultation.createdAt)}</p>
                  </div>
                </div>
                
                {selectedConsultation.symptoms && (
                  <div>
                    <label className="font-medium">Symptoms</label>
                    <p className="text-gray-700 mt-1 p-3 bg-gray-50 rounded">
                      {selectedConsultation.symptoms}
                    </p>
                  </div>
                )}

                {selectedConsultation.providerName && (
                  <div>
                    <label className="font-medium">Attending Provider</label>
                    <p className="text-gray-700">{selectedConsultation.providerName}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}