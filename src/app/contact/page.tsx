'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  createdAt?: any;
}

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, 'contact'), {
        ...form,
        createdAt: serverTimestamp(),
      });
      toast.success('✅ Message submitted successfully');
      setForm({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('❌ Failed to submit message');
    } finally {
      setLoading(false);
    }
  };

  // Real-time listener for contacts
  useEffect(() => {
    const q = query(collection(db, 'contact'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Contact[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Contact, 'id'>),
      }));
      setContacts(list);
    });
    return () => unsubscribe();
  }, []);

  // Format Firestore timestamp
  const formatTimestamp = (ts: any) => {
    if (!ts) return 'Submitting…';
    try {
      return ts.toDate ? ts.toDate().toLocaleString() : new Date(ts).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-6">
      <Toaster position="top-right" />

      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md mb-8">
        <h1 className="text-3xl font-bold mb-4 text-center text-blue-700">Contact Us</h1>
        <p className="mb-6 text-center text-gray-700">
          We’d love to hear from you. Please fill out the form below:
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border rounded-lg p-3"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border rounded-lg p-3"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Phone</label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Message</label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              rows={5}
              className="w-full border rounded-lg p-3"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Message'}
          </button>
        </form>
      </div>

      {/* Display recent messages */}
      <div className="max-w-4xl w-full">
        <h2 className="text-xl font-bold mb-4 text-blue-700 text-center">Recent Messages</h2>
        {contacts.length === 0 && (
          <p className="text-center text-gray-500">No messages yet</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((c) => (
            <div key={c.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <p><span className="font-medium">Name:</span> {c.name}</p>
              <p><span className="font-medium">Email:</span> {c.email}</p>
              {c.phone && <p><span className="font-medium">Phone:</span> {c.phone}</p>}
              <p><span className="font-medium">Message:</span> {c.message}</p>
              <p><span className="font-medium">Submitted:</span> {formatTimestamp(c.createdAt)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
