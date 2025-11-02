'use client';

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  FilePlus2,
  FlaskConical,
  FileImage,
  FileSignature,
  Stethoscope,
  FileText,
  Files,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import LogoutButton from "./LogoutButton";

export default function FloatingTools() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref]);

  const tools = [
    { name: "Prescription", href: "/provider/tools/prescription", icon: <FilePlus2 /> },
    { name: "Lab Request", href: "/provider/tools/lab-request", icon: <FlaskConical /> },
    { name: "Imaging Request", href: "/provider/tools/imaging-request", icon: <FileImage /> },
    { name: "Referral", href: "/provider/tools/referral", icon: <Stethoscope /> },
    { name: "Sick Note", href: "/provider/tools/sick-note", icon: <FileSignature /> },
    { name: "Medical Report", href: "/provider/tools/medical-report", icon: <FileText /> },
    { name: "Face Sheet", href: "/provider/tools/facesheet", icon: <Files /> },
  ];

  return (
    <div
      ref={ref}
      className="fixed bottom-5 right-5 flex flex-col items-end z-50"
    >
      {/* Main toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition"
        title="Tools"
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Collapsible Tools */}
      <div
        className={`flex flex-col items-end mt-2 space-y-2 transition-all duration-300 ${
          open ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        {tools.map((tool) => (
          <Link
            key={tool.name}
            href={tool.href}
            className="flex items-center gap-2 bg-white text-gray-800 px-4 py-2 rounded shadow hover:bg-gray-100 transition"
            onClick={() => setOpen(false)} // collapse on click
          >
            {tool.icon} {tool.name}
          </Link>
        ))}

        {/* Sign Out */}
        <div className="flex items-center gap-2 bg-white text-gray-800 px-4 py-2 rounded shadow hover:bg-gray-100 transition">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
