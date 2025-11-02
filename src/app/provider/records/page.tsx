'use client';

import React, { useEffect, useState } from 'react';
import { db, auth } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import toast, { Toaster } from 'react-hot-toast';

interface Record {
  id: string;
  patientName: string;
  date: string;
  summary: string;
  providerId: string;
  providerName?: string;
  createdAt?: any;
  updatedAt?: any;
}

export default function RecordsPage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<Record[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [newRecord, setNewRecord] = useState<Partial<Record>>({
    patientName: '',
    date: new Date().toISOString().split('T')[0], // Default to today
    summary: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const router = useRouter();

  // Get current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const providerId = user?.uid;
  const isAdmin = user?.email === 'humphreykiboi1@gmail.com';

  // Fetch records in real time
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    try {
      const recordsRef = collection(db, 'records');
      let q;
      
      if (showOnlyMine && providerId) {
        q = query(recordsRef, where('providerId', '==', providerId), orderBy('date', 'desc'));
      } else if (isAdmin) {
        q = query(recordsRef, orderBy('date', 'desc'));
      } else {
        // For non-admin users, show only their records by default
        q = query(recordsRef, where('providerId', '==', providerId), orderBy('date', 'desc'));
        setShowOnlyMine(true);
      }

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const data: Record[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            patientName: doc.data().patientName || '',
            date: doc.data().date || '',
            summary: doc.data().summary || '',
            providerId: doc.data().providerId || '',
            providerName: doc.data().providerName || '',
            createdAt: doc.data().createdAt,
            updatedAt: doc.data().updatedAt,
          }));
          setRecords(data);
          setLoading(false);
          setError(null);
        },
        (error) => {
          console.error('Error fetching records: ', error);
          setError('Failed to load records. Please check your permissions.');
          setLoading(false);
          toast.error('Failed to load records');
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up listener: ', error);
      setError('Failed to set up real-time listener.');
      setLoading(false);
      toast.error('Error setting up records listener');
    }
  }, [showOnlyMine, providerId, user, isAdmin]);

  // Filtering based on search term
  useEffect(() => {
    const filtered = records.filter((r) =>
      r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.date.includes(searchTerm)
    );
    setFilteredRecords(filtered);
  }, [records, searchTerm]);

  // Admin: edit
  const handleEdit = (record: Record) => {
    if (!isAdmin) {
      setError('Only administrators can edit records.');
      toast.error('Admin access required');
      return;
    }
    setEditingRecord(record);
    setIsEditing(true);
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || !isAdmin) return;
    
    setLoading(true);
    try {
      const recordRef = doc(db, 'records', editingRecord.id);
      await updateDoc(recordRef, {
        patientName: editingRecord.patientName,
        date: editingRecord.date,
        summary: editingRecord.summary,
        updatedAt: serverTimestamp(),
      });
      setIsEditing(false);
      setEditingRecord(null);
      setError(null);
      toast.success('Record updated successfully');
    } catch (error) {
      console.error('Error updating document: ', error);
      setError('Failed to update record. Please try again.');
      toast.error('Failed to update record');
    } finally {
      setLoading(false);
    }
  };

  // Admin: delete with confirmation
  const handleDelete = async (id: string, patientName: string) => {
    if (!isAdmin) {
      setError('Only administrators can delete records.');
      toast.error('Admin access required');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete the record for ${patientName}? This action cannot be undone.`)) {
      return;
    }
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'records', id));
      setError(null);
      toast.success('Record deleted successfully');
    } catch (error) {
      console.error('Error deleting document: ', error);
      setError('Failed to delete record. Please try again.');
      toast.error('Failed to delete record');
    } finally {
      setLoading(false);
    }
  };

  // Provider/Admin: add
  const handleAddRecord = async () => {
    if (!newRecord.patientName || !newRecord.date) {
      setError('Patient name and date are required.');
      toast.error('Patient name and date are required');
      return;
    }
    
    if (!user) {
      setError('You must be logged in to add records.');
      toast.error('Authentication required');
      return;
    }
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'records'), {
        patientName: newRecord.patientName,
        date: newRecord.date,
        summary: newRecord.summary || '',
        providerId: user.uid,
        providerName: user.displayName || user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setIsAdding(false);
      setNewRecord({
        patientName: '',
        date: new Date().toISOString().split('T')[0],
        summary: '',
      });
      setError(null);
      toast.success('Record added successfully');
    } catch (error) {
      console.error('Error adding document: ', error);
      setError('Failed to add record. Please try again.');
      toast.error('Failed to add record');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString();
      }
      if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleString();
      }
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  if (loading && records.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading records...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <Toaster position="top-right" />
      
      <h1 className="text-3xl font-bold text-blue-600">Medical Records</h1>
      
      {/* User role indicator */}
      <div className="bg-blue-50 p-3 rounded-lg">
        <p className="text-blue-700">
          Logged in as: <strong>{isAdmin ? 'Administrator' : 'Provider'}</strong>
          {user?.displayName && ` (${user.displayName})`}
          {isAdmin && ' (Full access)'}
          {!isAdmin && ' (Can view and add records)'}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
          <button 
            className="absolute top-3 right-3 text-red-800 font-bold" 
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-center gap-4 p-4 bg-white rounded-lg shadow">
        <input
          type="text"
          placeholder="Search by patient name, summary, or date"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-2 rounded w-full md:w-1/3"
          disabled={loading}
        />
        <button
          onClick={() => setSearchTerm('')}
          className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
          disabled={loading || !searchTerm}
        >
          Clear Search
        </button>
        
        {isAdmin && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlyMine}
              onChange={() => setShowOnlyMine((prev) => !prev)}
              className="w-4 h-4"
              disabled={loading || !providerId}
            />
            Show only my records
          </label>
        )}
        
        <button
          onClick={() => setIsAdding(true)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          disabled={loading}
        >
          + Add New Record
        </button>
      </div>

      {/* Records count */}
      <div className="text-sm text-gray-600">
        Showing {filteredRecords.length} of {records.length} records
        {searchTerm && ` matching "${searchTerm}"`}
      </div>

      {/* Records list */}
      {!loading && filteredRecords.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">
            {records.length === 0 
              ? "No medical records found." 
              : "No records match your search criteria."}
          </p>
          <button 
            onClick={() => setIsAdding(true)}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Your First Record
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRecords.map((record) => (
            <div
              key={record.id}
              className="border rounded-lg p-4 bg-white shadow hover:shadow-md transition-shadow"
            >
              {/* Admin-only actions */}
              {isAdmin && (
                <div className="flex justify-end space-x-2 mb-3">
                  <button
                    onClick={() => handleEdit(record)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit record"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(record.id, record.patientName)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete record"
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-blue-800">
                  {record.patientName || 'Unnamed Patient'}
                </h3>
                
                <div className="text-sm">
                  <p><span className="font-medium">Date:</span> {formatDate(record.date)}</p>
                  {record.providerName && (
                    <p><span className="font-medium">Provider:</span> {record.providerName}</p>
                  )}
                </div>
                
                <div>
                  <p className="font-medium">Summary:</p>
                  <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                    {record.summary || 'No summary provided'}
                  </p>
                </div>
                
                <div className="text-xs text-gray-500 mt-3">
                  <p>Created: {formatTimestamp(record.createdAt)}</p>
                  {record.updatedAt && (
                    <p>Updated: {formatTimestamp(record.updatedAt)}</p>
                  )}
                  <p>Record ID: {record.id.substring(0, 8)}...</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin-only edit modal */}
      {isEditing && editingRecord && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Record</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Patient Name *</label>
                <input
                  type="text"
                  value={editingRecord.patientName}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      patientName: e.target.value,
                    })
                  }
                  className="border p-2 rounded w-full"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Date *</label>
                <input
                  type="date"
                  value={editingRecord.date}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      date: e.target.value,
                    })
                  }
                  className="border p-2 rounded w-full"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Summary</label>
                <textarea
                  value={editingRecord.summary}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      summary: e.target.value,
                    })
                  }
                  className="border p-2 rounded w-full"
                  rows={4}
                  placeholder="Enter clinical summary, findings, and recommendations"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add modal (all users) */}
      {isAdding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add New Record</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Patient Name *</label>
                <input
                  type="text"
                  value={newRecord.patientName || ''}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, patientName: e.target.value })
                  }
                  className="border p-2 rounded w-full"
                  placeholder="Enter patient's full name"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Date *</label>
                <input
                  type="date"
                  value={newRecord.date || ''}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, date: e.target.value })
                  }
                  className="border p-2 rounded w-full"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Summary</label>
                <textarea
                  value={newRecord.summary || ''}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, summary: e.target.value })
                  }
                  className="border p-2 rounded w-full"
                  rows={4}
                  placeholder="Enter clinical summary, findings, and recommendations"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => setIsAdding(false)}
                  className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRecord}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}