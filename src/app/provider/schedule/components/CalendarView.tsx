'use client';

import { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { db } from "@/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

interface Booking {
  id: string;
  providerId: string;
  start: string; // time string, e.g., "09:00"
  end: string;
  date: string; // date string, e.g., "2025-09-02"
}

interface Slot {
  id: string;
  providerId: string | null;
  start: string;
  end: string;
  available: boolean;
  date: string;
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(currentDate, i));

  // Real-time bookings
  useEffect(() => {
    const q = collection(db, "bookings");
    const unsub = onSnapshot(q, (snap) => {
      const booked: Booking[] = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Booking) }));
      setBookings(booked);
    });
    return () => unsub();
  }, []);

  // Real-time slots
  useEffect(() => {
    const q = collection(db, "slots");
    const unsub = onSnapshot(q, (snap) => {
      const allSlots: Slot[] = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Slot) }));
      setSlots(allSlots);
    });
    return () => unsub();
  }, []);

  const getDaySlots = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return slots.filter(slot => slot.date === dayStr);
  };

  const isBooked = (slot: Slot) => {
    return bookings.some(
      b =>
        b.providerId === slot.providerId &&
        b.date === slot.date &&
        b.start === slot.start &&
        b.end === slot.end
    );
  };

  return (
    <div className="calendar-view bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between mb-4">
        <button
          onClick={() => setCurrentDate(addDays(currentDate, -7))}
          className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
        >
          Previous
        </button>
        <h3 className="font-medium">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        <button
          onClick={() => setCurrentDate(addDays(currentDate, 7))}
          className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const daySlots = getDaySlots(day);
          return (
            <div key={day.toString()} className="p-2 border rounded text-center">
              <div className="font-medium text-sm">{format(day, 'EEE')}</div>
              <div className="text-lg mb-1">{format(day, 'd')}</div>

              <div className="space-y-1">
                {daySlots.length === 0 ? (
                  <div className="text-xs text-gray-400">No slots</div>
                ) : (
                  daySlots.map(slot => {
                    const booked = isBooked(slot);
                    return (
                      <div
                        key={slot.id}
                        className={`text-xs p-1 rounded ${
                          booked ? 'bg-red-100 text-red-700' : slot.available ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                        }`}
                      >
                        {slot.start} - {slot.end} {booked ? '(Booked)' : slot.providerId ? '' : '(Unassigned)'}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
