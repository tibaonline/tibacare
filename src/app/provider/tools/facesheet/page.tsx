'use client';

import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Button } from '@/components/ui/button';

export default function FacesheetPage() {
  const [user, setUser] = useState<any>(null);
  const [facesheets, setFacesheets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        // check if admin (for now simple check by email)
        if (u.email === 'humphreykiboi1@gmail.com') {
          setIsAdmin(true);
        }
        // load all facesheets
        const q = query(collection(db, 'facesheets'), orderBy('createdAt', 'desc'));
        onSnapshot(q, (snap) => {
          const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setFacesheets(data);
        });
      }
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    await deleteDoc(doc(db, 'facesheets', id));
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Patient Facesheets</h1>
      <div className="flex gap-6">
        {/* Left side: visit dates */}
        <div className="w-1/3 border-r pr-4">
          <h2 className="font-semibold mb-2">Visit Dates</h2>
          <ul className="space-y-2">
            {facesheets.map((fs) => (
              <li
                key={fs.id}
                className="cursor-pointer p-2 rounded hover:bg-gray-100"
                onClick={() => setSelected(fs)}
              >
                {fs.createdAt?.toDate().toLocaleString()}
              </li>
            ))}
          </ul>
        </div>

        {/* Right side: selected visit */}
        <div className="flex-1">
          {selected ? (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Visit Details</h2>
              <p><strong>Patient ID:</strong> {selected.patientId}</p>
              <p><strong>Provider ID:</strong> {selected.providerId}</p>
              <p><strong>Clinical Notes:</strong> {selected.clinicalNotes}</p>
              <p><strong>Prescriptions:</strong> {JSON.stringify(selected.prescriptions)}</p>
              <p><strong>Labs:</strong> {JSON.stringify(selected.labs)}</p>
              <p><strong>Imaging:</strong> {JSON.stringify(selected.imaging)}</p>
              <p><strong>Impression:</strong> {selected.impression}</p>
              <p><strong>Plan:</strong> {selected.plan}</p>

              {isAdmin && (
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(selected.id)}
                >
                  Delete Facesheet
                </Button>
              )}
            </div>
          ) : (
            <p>Select a visit date to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
