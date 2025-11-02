'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/firebase';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, deleteDoc, where, orderBy } from 'firebase/firestore';
import CalendarView from './components/CalendarView';
import TimeSlots from './components/TimeSlots';
import toast from 'react-hot-toast';

export default function SchedulePage() {
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [preConsultations, setPreConsultations] = useState<any[]>([]);

  // Real-time fetch slots
  useEffect(() => {
    const q = query(collection(db, 'slots'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSlots(data);
    });
    return () => unsubscribe();
  }, []);

  // Real-time fetch confirmed bookings
  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setBookings(data);
    });
    return () => unsubscribe();
  }, []);

  // Real-time fetch pre-consultations
  useEffect(() => {
    const q = query(collection(db, 'preconsultations'), where('status', '==', 'pending'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPreConsultations(data);
    });
    return () => unsubscribe();
  }, []);

  // Mark slot unavailable if booked or preconsultation exists
  const getAvailableSlots = () => {
    return slots.map(slot => {
      const slotTaken = bookings.some(b => b.slotId === slot.id) || preConsultations.some(p => p.slotId === slot.id);
      return { ...slot, available: !slotTaken };
    });
  };

  // Admin: Add Slot
  const addSlot = async (date: string, time: string) => {
    try {
      await addDoc(collection(db, 'slots'), { date, time });
      toast.success('Slot added');
    } catch (err) {
      console.error(err);
      toast.error('Error adding slot');
    }
  };

  // Admin: Delete Slot
  const deleteSlot = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'slots', id));
      toast.success('Slot deleted');
    } catch (err) {
      console.error(err);
      toast.error('Error deleting slot');
    }
  };

  // Admin: Assign Slot to Provider
  const assignSlot = async (slotId: string, providerId: string) => {
    try {
      await updateDoc(doc(db, 'slots', slotId), { providerId });
      toast.success('Slot assigned');
    } catch (err) {
      console.error(err);
      toast.error('Error assigning slot');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Schedule Management</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <CalendarView slots={getAvailableSlots()} bookings={bookings} />
        <TimeSlots
          slots={getAvailableSlots()}
          bookings={bookings}
          preConsultations={preConsultations}
          addSlot={addSlot}
          deleteSlot={deleteSlot}
          assignSlot={assignSlot}
        />
      </div>
    </div>
  );
}
