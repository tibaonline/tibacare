'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';

interface Feedback {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: any;
}

export default function FeedbackPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, 'feedback'), {
        ...form,
        userId: auth.currentUser?.uid || null,
        createdAt: serverTimestamp(),
      });
      toast.success('✅ Feedback submitted successfully');
      setForm({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error('Error saving feedback:', error);
      toast.error('❌ Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  // Format timestamp to readable date and time
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'No date available';
    
    try {
      // If timestamp is a Firestore timestamp object
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString();
      }
      
      // If it's already a Date object or string
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid date';
    }
  };

  // Real-time listener for feedbacks
  useEffect(() => {
    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feedbackList: Feedback[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Feedback, 'id'>),
      }));
      setFeedbacks(feedbackList);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-6">
      <Toaster position="top-right" />
      <div className="bg-white shadow-lg rounded-2xl p-8 max-w-lg w-full mb-8">
        {/* Static Contact Info */}
        <p className="text-center text-gray-600 mb-6">
          Phone: <span className="font-medium">+254 705 575 068</span> | Email: <span className="font-medium">info@tibacare.com</span>
        </p>

        <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">We Value Your Feedback</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} className="w-full border rounded-lg p-2" required />
          </div>

          <div>
            <label className="block mb-1 font-medium">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full border rounded-lg p-2" required />
          </div>

          <div>
            <label className="block mb-1 font-medium">Phone</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="w-full border rounded-lg p-2" required />
          </div>

          <div>
            <label className="block mb-1 font-medium">Message</label>
            <textarea name="message" value={form.message} onChange={handleChange} rows={4} className="w-full border rounded-lg p-2" required />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>

      {/* Real-time Feedback Display */}
      <div className="max-w-4xl w-full">
        <h2 className="text-xl font-bold mb-4 text-blue-700 text-center">Recent Feedbacks</h2>
        {feedbacks.length === 0 && <p className="text-center text-gray-500">No feedback yet</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feedbacks.map((fb) => (
            <div key={fb.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <p><span className="font-medium">Name:</span> {fb.name}</p>
              <p><span className="font-medium">Email:</span> {fb.email}</p>
              <p><span className="font-medium">Phone:</span> {fb.phone}</p>
              <p><span className="font-medium">Message:</span> {fb.message}</p>
              <p><span className="font-medium">Submitted:</span> {formatTimestamp(fb.createdAt)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}