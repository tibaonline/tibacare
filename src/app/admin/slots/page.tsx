'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';

export default function SlotManager() {
  const [slots, setSlots] = useState([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [provider, setProvider] = useState('');

  // Load slots in real time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'slots'), (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSlots(list);
    });
    return () => unsub();
  }, []);

  // Create new slot
  const createSlot = async () => {
    if (!date || !time || !provider) {
      return toast.error('Fill all fields');
    }
    try {
      await addDoc(collection(db, 'slots'), {
        date,
        time,
        provider,
        booked: false,
        patientId: null,
      });
      toast.success('Slot created');
      setDate('');
      setTime('');
      setProvider('');
    } catch (err) {
      console.error(err);
      toast.error('Error creating slot');
    }
  };

  // Delete slot
  const deleteSlot = async (id) => {
    try {
      await deleteDoc(doc(db, 'slots', id));
      toast.success('Slot deleted');
    } catch (err) {
      console.error(err);
      toast.error('Error deleting slot');
    }
  };

  // Mark slot booked/unbooked
  const toggleBooked = async (slot) => {
    try {
      await updateDoc(doc(db, 'slots', slot.id), {
        booked: !slot.booked,
      });
      toast.success(`Slot ${slot.booked ? 'unbooked' : 'booked'}`);
    } catch (err) {
      console.error(err);
      toast.error('Error updating slot');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Admin Slot Manager</h1>

      {/* Create Slot */}
      <Card className="p-4 mb-6">
        <h2 className="text-lg mb-2">Create New Slot</h2>
        <div className="flex flex-col md:flex-row gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          <Input
            placeholder="Provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          />
          <Button onClick={createSlot}>Add Slot</Button>
        </div>
      </Card>

      {/* List Slots */}
      <div className="grid gap-4">
        {slots.map((slot) => (
          <Card key={slot.id} className="p-4 flex justify-between items-center">
            <div>
              <p>
                <strong>{slot.date}</strong> at <strong>{slot.time}</strong>
              </p>
              <p className="text-sm">Provider: {slot.provider}</p>
              <p className="text-sm">
                Status: {slot.booked ? 'Booked' : 'Available'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => toggleBooked(slot)}>
                {slot.booked ? 'Unbook' : 'Book'}
              </Button>
              <Button variant="destructive" onClick={() => deleteSlot(slot.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
