'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import {
  Clipboard,
  User,
  FileText,
  Calendar,
  MessageSquare,
  Settings,
  Bell,
  Stethoscope,
  FilePlus2,
  FileImage,
  FileSignature,
  FlaskConical,
  Files,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  section?: string;
}

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [navItems, setNavItems] = useState<SidebarItem[]>([]);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [preConsultationFiles, setPreConsultationFiles] = useState<any[]>([]);

  useEffect(() => {
    const pages: SidebarItem[] = [
      // --- Main Section ---
      { name: "Dashboard", href: "/provider/dashboard", icon: <Clipboard />, section: "Main" },
      { name: "Patients", href: "/provider/patients", icon: <User />, section: "Main" },
      { name: "Records", href: "/provider/records", icon: <FileText />, section: "Main" },
      { name: "Consultations", href: "/provider/consultations", icon: <Calendar />, section: "Main" },
      { name: "Pre-Consultations", href: "/provider/preconsultations", icon: <Clipboard />, section: "Main" },
      { name: "Schedule", href: "/provider/schedule", icon: <Calendar />, section: "Main" },
      { name: "Notifications", href: "/provider/notifications", icon: <Bell />, section: "Main" },
      { name: "Messages", href: "/provider/messages", icon: <MessageSquare />, section: "Main" },
      { name: "Settings", href: "/provider/settings", icon: <Settings />, section: "Main" },

      // --- Tools Section ---
      { name: "Prescription", href: "/provider/tools/prescription", icon: <FilePlus2 />, section: "Tools" },
      { name: "Lab Request", href: "/provider/tools/lab-request", icon: <FlaskConical />, section: "Tools" },
      { name: "Imaging Request", href: "/provider/tools/imaging-request", icon: <FileImage />, section: "Tools" },
      { name: "Referral", href: "/provider/tools/referral", icon: <Stethoscope />, section: "Tools" },
      { name: "Sick Note", href: "/provider/tools/sick-note", icon: <FileSignature />, section: "Tools" },
      { name: "Medical Report", href: "/provider/tools/medical-report", icon: <FileText />, section: "Tools" },
      { name: "Face Sheet", href: "/provider/tools/facesheet", icon: <Files />, section: "Tools" },
    ];

    setNavItems(pages);
  }, []);

  useEffect(() => {
    // Auto-expand Tools if currently inside a tools page
    if (pathname?.startsWith("/provider/tools")) {
      setToolsOpen(true);
    }
  }, [pathname]);

  // Fetch pre-consultation files when on dashboard or preconsultations page
  useEffect(() => {
    const fetchPreConsultationFiles = async () => {
      if (pathname === '/provider/dashboard' || pathname === '/provider/preconsultations') {
        try {
          // Replace with your actual API endpoint
          const response = await fetch('/api/provider/preconsultation-files');
          const data = await response.json();
          setPreConsultationFiles(data.files || []);
        } catch (error) {
          console.error('Error fetching pre-consultation files:', error);
        }
      }
    };

    fetchPreConsultationFiles();
  }, [pathname]);

  const groupedNav = {
    Main: navItems.filter((item) => item.section === "Main"),
    Tools: navItems.filter((item) => item.section === "Tools"),
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-5 flex flex-col">
        <h1 className="text-xl font-bold mb-8 text-center text-blue-700">TibaCare Provider</h1>

        {/* Main Navigation */}
        <nav className="flex flex-col space-y-2 mb-6">
          {groupedNav.Main.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded ${
                pathname?.startsWith(item.href)
                  ? "bg-blue-100 text-blue-700 font-semibold"
                  : "text-gray-800 hover:bg-blue-50"
              }`}
            >
              {item.icon} {item.name}
            </Link>
          ))}
        </nav>

        {/* Collapsible Tools Section */}
        <div>
          <button
            onClick={() => setToolsOpen(!toolsOpen)}
            className="flex items-center justify-between w-full px-2 py-2 text-sm font-semibold text-gray-600 uppercase hover:bg-gray-100 rounded"
          >
            <span className="flex items-center gap-2">
              {toolsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              Tools
            </span>
          </button>

          {toolsOpen && (
            <nav className="flex flex-col space-y-2 mt-2 ml-4">
              {groupedNav.Tools.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded ${
                    pathname?.startsWith(item.href)
                      ? "bg-green-100 text-green-700 font-semibold"
                      : "text-gray-800 hover:bg-green-50"
                  }`}
                >
                  {item.icon} {item.name}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {/* Logout */}
        <div className="mt-auto pt-4 border-t">
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        {/* Display pre-consultation files if on relevant pages */}
        {(pathname === '/provider/dashboard' || pathname === '/provider/preconsultations') && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Pre-Consultation Uploads</h2>
            {preConsultationFiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {preConsultationFiles.map((file, index) => (
                  <div key={index} className="bg-white p-4 rounded shadow">
                    <h3 className="font-medium">{file.filename}</h3>
                    <p className="text-sm text-gray-600">From: {file.patientName}</p>
                    <p className="text-sm text-gray-500">{new Date(file.uploadDate).toLocaleDateString()}</p>
                    <a 
                      href={file.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                    >
                      View File
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No pre-consultation files available.</p>
            )}
          </div>
        )}
        
        {children}
      </main>
    </div>
  );
}