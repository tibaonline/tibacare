'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase';
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
} from 'firebase/firestore';

interface TimeSlot {
  id: string;
  start: string;
  end: string;
  providerId: string | null;
  available: boolean;
}

interface Provider {
  id: string;
  name: string;
}

interface Booking {
  id: string;
  providerId: string;
  start: string;
  end: string;
}

export default function TimeSlots() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [newSlot, setNewSlot] = useState({ start: '', end: '', providerId: '' });

  // Real-time slots
  useEffect(() => {
    const q = query(collection(db, 'slots'), orderBy('start', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const updatedSlots = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as TimeSlot));
      setSlots(updatedSlots);
    });
    return () => unsub();
  }, []);

  // Real-time providers
  useEffect(() => {
    const q = collection(db, 'providers');
    const unsub = onSnapshot(q, (snap) => {
      setProviders(snap.docs.map((doc) => ({ id: doc.id, name: doc.data().name })));
    });
    return () => unsub();
  }, []);

  // Real-time bookings & preconsultations
  useEffect(() => {
    const bookingsQ = collection(db, 'bookings');
    const unsubBookings = onSnapshot(bookingsQ, (snap) => {
      const booked: Booking[] = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          providerId: data.providerId,
          start: data.start,
          end: data.end,
        };
      });
      setBookings(booked);
    });
    return () => unsubBookings();
  }, []);

  // Function to determine if a slot is booked
  const isSlotBooked = (slot: TimeSlot) => {
    if (!slot.providerId) return false;
    return bookings.some(
      (b) =>
        b.providerId === slot.providerId &&
        b.start === slot.start &&
        b.end === slot.end
    );
  };

  // Add Slot
  const handleAddSlot = async () => {
    if (!newSlot.start || !newSlot.end) return;

    await addDoc(collection(db, 'slots'), {
      start: newSlot.start,
      end: newSlot.end,
      providerId: newSlot.providerId || null,
      available: true,
    });

    setNewSlot({ start: '', end: '', providerId: '' });
  };

  // Delete Slot
  const handleDeleteSlot = async (id: string) => {
    await deleteDoc(doc(db, 'slots', id));
  };

  // Toggle availability manually
  const toggleAvailability = async (slot: TimeSlot) => {
    if (isSlotBooked(slot)) return; // Prevent toggling booked slots
    await updateDoc(doc(db, 'slots', slot.id), { available: !slot.available });
  };

  // Assign provider
  const handleAssignProvider = async (slot: TimeSlot, providerId: string) => {
    // Prevent assigning provider if slot is booked
    if (isSlotBooked({ ...slot, providerId })) return;
    await updateDoc(doc(db, 'slots', slot.id), { providerId });
  };

  return (
    <div className="time-slots bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Manage Time Slots</h3>

      {/* Add Slot */}
      <div className="flex gap-2 mb-4">
        <input
          type="time"
          value={newSlot.start}
          onChange={(e) => setNewSlot({ ...newSlot, start: e.target.value })}
          className="p-2 border rounded"
        />
        <input
          type="time"
          value={newSlot.end}
          onChange={(e) => setNewSlot({ ...newSlot, end: e.target.value })}
          className="p-2 border rounded"
        />
        <select
          value={newSlot.providerId}
          onChange={(e) => setNewSlot({ ...newSlot, providerId: e.target.value })}
          className="p-2 border rounded"
        >
          <option value="">Assign Provider (optional)</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleAddSlot}
          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Slot
        </button>
      </div>

      {/* Slots List */}
      <div className="space-y-2">
        {slots.map((slot) => {
          const booked = isSlotBooked(slot);
          return (
            <div
              key={slot.id}
              className={`p-3 rounded flex justify-between items-center ${
                booked ? 'bg-red-100' : slot.available ? 'bg-green-50' : 'bg-yellow-50'
              }`}
            >
              <span>
                {slot.start} - {slot.end}{' '}
                {slot.providerId
                  ? `(${providers.find((p) => p.id === slot.providerId)?.name})`
                  : '(Unassigned)'}
                {booked ? ' - Booked' : ''}
              </span>

              <div className="flex gap-2">
                <select
                  value={slot.providerId || ''}
                  onChange={(e) => handleAssignProvider(slot, e.target.value)}
                  className="p-1 border rounded"
                >
                  <option value="">Assign Provider</option>
                  {providers.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={bookings.some(
                        (b) =>
                          b.providerId === p.id &&
                          b.start === slot.start &&
                          b.end === slot.end
                      )}
                    >
                      {p.name}
                      {bookings.some(
                        (b) =>
                          b.providerId === p.id &&
                          b.start === slot.start &&
                          b.end === slot.end
                      )
                        ? ' (Busy)'
                        : ''}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => toggleAvailability(slot)}
                  className={`px-3 py-1 rounded text-sm ${
                    booked
                      ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                      : slot.available
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                  disabled={booked}
                >
                  {booked ? 'Booked' : slot.available ? 'Available' : 'Unavailable'}
                </button>

                <button
                  onClick={() => handleDeleteSlot(slot.id)}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
