"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface PatientContextType {
  consultationId: string | null;
  setConsultationId: (id: string | null) => void;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export function PatientProvider({ children }: { children: ReactNode }) {
  const [consultationId, setConsultationId] = useState<string | null>(null);

  return (
    <PatientContext.Provider value={{ consultationId, setConsultationId }}>
      {children}
    </PatientContext.Provider>
  );
}

// 🔥 This must exist so other files can import it
export function usePatientContext() {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error("usePatientContext must be used within PatientProvider");
  }
  return context;
}
