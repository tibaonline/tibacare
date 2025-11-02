'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db, auth } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function NewMessagePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [message, setMessage] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const recipient = searchParams.get('to') || '';
    setTo(recipient);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to) return alert('Recipient missing');

    setLoading(true);
    try {
      await addDoc(collection(db, 'messages'), {
        from: auth.currentUser?.email || 'Provider',
        to,
        content: message,
        read: false,
        createdAt: serverTimestamp(),
      });
      alert('Message sent!');
      router.push('/provider/messages');
    } catch (err) {
      alert('Error sending message: ' + err);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow mt-8">
      <h1 className="text-xl font-semibold mb-4">Message Patient</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={to}
          readOnly
          className="w-full border rounded p-2 bg-gray-100"
          placeholder="To"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          required
          className="w-full border rounded p-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          {loading ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );
}
