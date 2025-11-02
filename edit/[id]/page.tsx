'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, auth } from '@/firebase';
import { doc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function EditRecordPage() {
  const params = useParams();
  const router = useRouter();
  const recordId = params.id as string;

  const [record, setRecord] = useState<any>(null);
  const [editableRecord, setEditableRecord] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const user = auth.currentUser;
  const isAdmin = user?.email === 'humphreykiboi1@gmail.com';

  useEffect(() => {
    if (!recordId) return;
    const docRef = doc(db, 'records', recordId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setRecord(data);
        setEditableRecord(data);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [recordId]);

  const saveChanges = async () => {
    if (!recordId) return;
    try {
      await updateDoc(doc(db, 'records', recordId), editableRecord);
      toast.success('Record updated successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update record');
    }
  };

  const deleteRecord = async () => {
    if (!recordId || !confirm('Are you sure you want to delete this record?')) return;
    try {
      await deleteDoc(doc(db, 'records', recordId));
      toast.success('Record deleted!');
      router.push('/records');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete record');
    }
  };

  if (loading) return <p className="p-6 text-blue-600">Loading record...</p>;
  if (!record) return <p className="p-6 text-red-500">Record not found.</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow rounded space-y-4">
      <h1 className="text-2xl font-bold text-blue-600">Edit Record: {record.patientName}</h1>

      <div className="space-y-3">
        <div>
          <label className="font-semibold">Patient Name</label>
          <input
            type="text"
            value={editableRecord.patientName || ''}
            onChange={(e) => setEditableRecord({ ...editableRecord, patientName: e.target.value })}
            readOnly={!isAdmin}
            className={`w-full border p-2 rounded ${!isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>

        <div>
          <label className="font-semibold">Date</label>
          <input
            type="date"
            value={editableRecord.date || ''}
            onChange={(e) => setEditableRecord({ ...editableRecord, date: e.target.value })}
            readOnly={!isAdmin}
            className={`w-full border p-2 rounded ${!isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>

        <div>
          <label className="font-semibold">Summary</label>
          <textarea
            value={editableRecord.summary || ''}
            onChange={(e) => setEditableRecord({ ...editableRecord, summary: e.target.value })}
            readOnly={!isAdmin}
            rows={5}
            className={`w-full border p-2 rounded ${!isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>

        <div>
          <label className="font-semibold">Provider ID</label>
          <input
            type="text"
            value={editableRecord.providerId || ''}
            onChange={(e) => setEditableRecord({ ...editableRecord, providerId: e.target.value })}
            readOnly={!isAdmin}
            className={`w-full border p-2 rounded ${!isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>

        {editableRecord.notes && (
          <div>
            <label className="font-semibold">Notes</label>
            <textarea
              value={editableRecord.notes}
              onChange={(e) => setEditableRecord({ ...editableRecord, notes: e.target.value })}
              readOnly={!isAdmin}
              rows={4}
              className={`w-full border p-2 rounded ${!isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="flex gap-3 pt-4">
          <button
            onClick={saveChanges}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Save Changes
          </button>
          <button
            onClick={deleteRecord}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Delete Record
          </button>
        </div>
      )}

      <div className="pt-6">
        <button
          onClick={() => router.push('/records')}
          className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          ← Back to Records
        </button>
      </div>
    </div>
  );
}
