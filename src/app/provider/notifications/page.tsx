'use client';

import React, { useEffect, useState } from 'react';
import { db, auth } from '@/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  message: string;
  read: boolean;
  timestamp: any;
}

export default function ProviderNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
      else setUserId(null);
    });
    return () => unsubscribeAuth();
  }, []);

  // Listen to notifications in real-time
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach((doc) => {
        notifs.push({ id: doc.id, ...(doc.data() as Notification) });
      });
      setNotifications(notifs);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching notifications:', err);
      toast.error('Failed to fetch notifications');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      // Optimistic UI update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      await updateDoc(doc(db, 'notifications', id), { read: true, readAt: serverTimestamp() });
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast.error('Failed to mark as read');
    }
  };

  if (loading) return <p className="p-6">Loading notifications...</p>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-3xl font-bold text-blue-700 mb-4">Notifications</h1>
      {notifications.length === 0 ? (
        <p>No notifications.</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map(({ id, message, read, timestamp }) => (
            <li
              key={id}
              className={`p-3 rounded cursor-pointer transition-all duration-150
                ${read ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 font-semibold text-blue-800'}
              `}
              onClick={() => markAsRead(id)}
            >
              <div>{message}</div>
              {timestamp?.seconds && (
                <span className="text-sm text-gray-500">
                  {new Date(timestamp.seconds * 1000).toLocaleString()}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
