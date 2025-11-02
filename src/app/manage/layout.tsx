'use client';

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton"; // Adjust path if needed

const manageNavItems = [
  { label: "Users", href: "/manage/users" },
  { label: "Clients", href: "/manage/clients" },
  { label: "Appointments", href: "/manage/appointments" },
  { label: "Consultations", href: "/manage/consultations" },
  { label: "Providers", href: "/manage/providers" },
  { label: "Notifications", href: "/manage/notifications" },
  { label: "Feedback", href: "/manage/feedback" },
  { label: "Reports", href: "/manage/reports" },
];

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-4 flex flex-col">
        <h1 className="text-xl font-bold mb-6 text-center text-blue-700">
          TibaCare Manage
        </h1>
        <nav className="space-y-2 flex-grow">
          {manageNavItems.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={`block px-4 py-2 rounded hover:bg-blue-100 text-gray-800 ${
                pathname.startsWith(href) ? "bg-blue-200 font-semibold" : ""
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="pt-4 border-t mt-auto">
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
