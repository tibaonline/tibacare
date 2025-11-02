import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/AuthContext";
import { PatientProvider } from "@/context/PatientContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TibaCare",
  description: "Telemedicine Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <AuthProvider>
          <PatientProvider>
            <div className="h-full">
              {children}
            </div>
            <Toaster position="top-right" />
          </PatientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}