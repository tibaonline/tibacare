"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  where,
  limit,
  getDocs,
} from 'firebase/firestore';
import { ChevronLeft, Send, Search, User, Clock } from 'lucide-react';

/*
  ProviderChat component
  - Real-time conversation list (left)
  - Message thread (right)
  - Writes messages to Firestore (conversations/{conversationId}/messages)
  - Safe to use while WABA is pending — WhatsApp forwarding is optional

  How to wire up:
  - Ensure you have `db` and `auth` exported from `@/lib/firebase`.
  - Collections used:
    - conversations (documents with metadata)
    - conversations/{conversationId}/messages (subcollection of message docs)
  - Message schema for subcollection:
    {
      sender: 'provider' | 'patient' | 'system',
      text: string,
      timestamp: serverTimestamp(),
      delivered?: boolean,
      read?: boolean
    }

  Next steps after WABA approval:
  - In your server webhook (/api/whatsapp-webhook) write incoming WhatsApp messages into the matching conversation's messages subcollection.
  - When provider sends a message, optionally call your server endpoint (/api/whatsapp) to forward to the patient's phone.
*/

type Conversation = {
  id: string;
  patientId?: string;
  patientName?: string;
  phone?: string;
  lastMessage?: string;
  lastUpdated?: any;
  status?: string;
  unreadCount?: number;
};

type Message = {
  id?: string;
  sender: 'provider' | 'patient' | 'system';
  text: string;
  timestamp?: any;
  delivered?: boolean;
  read?: boolean;
};

export default function ProviderChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const user = auth.currentUser;

  // --- Utility: format time ---
  const fmtTime = (t: any) => {
    if (!t) return '';
    try {
      const d = t?.toDate ? t.toDate() : new Date(t);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(t);
    }
  };

  // --- Format date for display ---
  const fmtDate = (t: any) => {
    if (!t) return '';
    try {
      const d = t?.toDate ? t.toDate() : new Date(t);
      return d.toLocaleDateString();
    } catch {
      return String(t);
    }
  };

  // --- Load conversations (real-time) ---
  useEffect(() => {
    const q = query(collection(db, 'conversations'), orderBy('lastUpdated', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: Conversation[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setConversations(items);
        // auto-select first conversation if none selected
        if (!activeConvId && items.length > 0) setActiveConvId(items[0].id);
      },
      (err) => {
        console.error('Conversations listener error', err);
      }
    );
    return () => unsub();
  }, [activeConvId]);

  // --- Subscribe to messages for active conversation ---
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    const messagesCol = collection(db, 'conversations', activeConvId, 'messages');
    const q = query(messagesCol, orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs: Message[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setMessages(msgs);
        // scroll to bottom
        setTimeout(() => {
          if (messagesRef.current) {
            messagesRef.current.scrollTo({ 
              top: messagesRef.current.scrollHeight, 
              behavior: 'smooth' 
            });
          }
        }, 50);
      },
      (err) => console.error('Messages listener error', err)
    );
    return () => unsub();
  }, [activeConvId]);

  // --- Send message: write to subcollection and update conversation meta ---
  const sendMessage = async (text: string) => {
    if (!activeConvId || !text.trim() || !user) return;
    setLoading(true);
    try {
      const messagesCol = collection(db, 'conversations', activeConvId, 'messages');
      const msg: Message = {
        sender: 'provider',
        text: text.trim(),
        timestamp: serverTimestamp(),
        delivered: false,
        read: true, // Provider's own messages are read by default
      };

      // add message doc
      await addDoc(messagesCol, msg);

      // update conversation lastMessage + lastUpdated
      const convRef = doc(db, 'conversations', activeConvId);
      await updateDoc(convRef, {
        lastMessage: text.trim(),
        lastUpdated: serverTimestamp(),
      });

      // Optionally: forward to WhatsApp via your server endpoint if configured
      // const conversation = conversations.find(c => c.id === activeConvId);
      // if (conversation?.phone) {
      //   await fetch('/api/whatsapp', { 
      //     method: 'POST', 
      //     headers: { 'Content-Type': 'application/json' }, 
      //     body: JSON.stringify({ to: conversation.phone, message: text }) 
      //   });
      // }

      setInput('');
    } catch (err) {
      console.error('Send message error', err);
      // consider adding a local system message with error
    } finally {
      setLoading(false);
    }
  };

  // --- Create new conversation (helper used when starting chat from patient record) ---
  const createConversation = async (opts: { patientId?: string; patientName?: string; phone?: string }) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }
    
    setCreating(true);
    try {
      const conv = {
        patientId: opts.patientId || null,
        patientName: opts.patientName || 'Unknown',
        phone: opts.phone || null,
        lastMessage: '',
        lastUpdated: serverTimestamp(),
        status: 'open',
        createdBy: user.uid,
        unreadCount: 0,
      };
      const docRef = await addDoc(collection(db, 'conversations'), conv);
      // auto-select
      setActiveConvId(docRef.id);
      return docRef.id;
    } catch (err) {
      console.error('Create conversation error', err);
      throw err;
    } finally {
      setCreating(false);
    }
  };

  // --- Search/filter conversations client-side ---
  const filteredConversations = useMemo(() => {
    if (!search) return conversations;
    const term = search.toLowerCase();
    return conversations.filter((c) => 
      (c.patientName || '').toLowerCase().includes(term) || 
      (c.lastMessage || '').toLowerCase().includes(term) || 
      (c.phone || '').includes(term)
    );
  }, [conversations, search]);

  // --- Mark messages as read when opening conversation ---
  useEffect(() => {
    if (!activeConvId || !user) return;
    
    // mark unread messages as read by provider
    (async () => {
      try {
        const msgsSnap = await getDocs(
          query(
            collection(db, 'conversations', activeConvId, 'messages'), 
            where('sender', '==', 'patient'), 
            where('read', '==', false),
            limit(50)
          )
        );
        
        // Update each unread message
        const updatePromises = msgsSnap.docs.map(m => 
          updateDoc(doc(db, 'conversations', activeConvId, 'messages', m.id), { 
            read: true 
          })
        );
        
        await Promise.all(updatePromises);
        
        // Reset unread count for this conversation
        await updateDoc(doc(db, 'conversations', activeConvId), {
          unreadCount: 0
        });
        
      } catch (err) {
        console.error('Error marking messages as read:', err);
      }
    })();
  }, [activeConvId, user]);

  // Get the active conversation
  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConvId);
  }, [conversations, activeConvId]);

  return (
    <div className="grid grid-cols-12 gap-6 p-4 min-h-[70vh]">
      {/* Left: Conversation List */}
      <aside className="col-span-4 bg-white rounded-lg shadow border p-3 flex flex-col">
        <div className="flex items-center gap-3 mb-3">
          <h3 className="font-semibold text-lg">Conversations</h3>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search conversations..." 
            className="flex-1 p-2 border rounded" 
          />
        </div>

        <div className="overflow-auto flex-1">
          {filteredConversations.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {search ? 'No matching conversations' : 'No conversations yet'}
            </div>
          ) : (
            filteredConversations.map((c) => (
              <div
                key={c.id}
                onClick={() => setActiveConvId(c.id)}
                className={`p-3 rounded cursor-pointer mb-2 ${activeConvId === c.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'} ${c.unreadCount ? 'border-l-4 border-l-blue-500' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-2 truncate">
                      <User className="w-4 h-4 flex-shrink-0" /> 
                      <span className="truncate">{c.patientName || 'Unknown Patient'}</span>
                      {c.unreadCount > 0 && (
                        <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ml-auto flex-shrink-0">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">{c.phone || 'No phone'}</div>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap pl-2">
                    {fmtTime(c.lastUpdated)}
                  </div>
                </div>
                <div className="text-sm text-gray-700 mt-2 truncate">{c.lastMessage || '—'}</div>
              </div>
            ))
          )}
        </div>

        <div className="mt-auto pt-3">
          <button
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
            onClick={() => createConversation({ patientName: 'New patient' })}
            disabled={creating}
          >
            {creating ? 'Creating...' : 'New Conversation'}
          </button>
        </div>
      </aside>

      {/* Right: Messages */}
      <section className="col-span-8 bg-white rounded-lg shadow border p-4 flex flex-col">
        {!activeConvId ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation or create a new one
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <div className="font-semibold">{activeConversation?.patientName || 'Unknown Patient'}</div>
                  <div className="text-xs text-gray-500">{activeConversation?.phone || 'No phone'}</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <Clock className="w-4 h-4" /> 
                {fmtDate(activeConversation?.lastUpdated)} {fmtTime(activeConversation?.lastUpdated)}
              </div>
            </div>

            <div ref={messagesRef} className="flex-1 overflow-auto p-3 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((m) => (
                  <div 
                    key={m.id} 
                    className={`max-w-[80%] ${m.sender === 'provider' ? 'ml-auto bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'} p-3 rounded-lg`}
                  >
                    <div className="text-sm break-words">{m.text}</div>
                    <div className={`text-xs mt-1 ${m.sender === 'provider' ? 'text-blue-200' : 'text-gray-500'} text-right`}>
                      {fmtTime(m.timestamp)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter' && !e.shiftKey) { 
                      e.preventDefault(); 
                      sendMessage(input); 
                    } 
                  }}
                  placeholder="Type a message..."
                  className="flex-1 p-3 border rounded-lg"
                  disabled={loading}
                />
                <button 
                  onClick={() => sendMessage(input)} 
                  disabled={loading || input.trim() === ''} 
                  className="px-4 py-3 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 disabled:bg-green-300"
                >
                  <Send className="w-4 h-4" /> 
                  {loading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}