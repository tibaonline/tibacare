'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User, Auth } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';
import { firebaseConfig } from './config';

// Define the Firebase context type
interface FirebaseContextType {
  app: FirebaseApp;
  auth: Auth;
  db: Database;
  user: User | null;
}

// Create context with undefined to enforce checks
const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

// Define the props for the provider
interface FirebaseProviderProps {
  children: ReactNode;
}

export const FirebaseProvider = ({ children }: FirebaseProviderProps) => {
  const [firebaseApp, setFirebaseApp] = useState<Omit<FirebaseContextType, 'user'> | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getDatabase(app);
    setFirebaseApp({ app, auth, db });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
    });

    return () => unsubscribe();
  }, []);

  if (!firebaseApp) return null;

  return (
    <FirebaseContext.Provider value={{ ...firebaseApp, user: authUser }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
