'use client';

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

const adminNavItems = [
  { label: "Provider Panel", href: "/admin/provider" },
  { label: "Client Records", href: "/admin/clients" },
  { label: "Appointments", href: "/admin/appointments" },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "Forms", href: "/admin/forms" },
  { label: "Tools", href: "/admin/tools" },
  { label: "Users", href: "/admin/users" },
  { label: "Consultations", href: "/admin/consultations" },
  { label: "Billing", href: "/admin/billing" },
  { label: "Logs", href: "/admin/logs" },
  { label: "Feedback", href: "/admin/feedback" },
  { label: "Compliance", href: "/admin/compliance" },
  { label: "Messages", href: "/admin/messages" },
  { label: "Notifications", href: "/admin/notifications" },
  { label: "Settings", href: "/admin/settings" },
  { label: "Contact", href: "/admin/contact" }, // ✅ Added Contact
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-4 flex flex-col">
        <h1 className="text-xl font-bold mb-6 text-center text-blue-700">
          TibaCare Admin
        </h1>

        <nav className="space-y-2 flex-grow">
          {adminNavItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2 rounded ${
                  isActive
                    ? "bg-blue-600 text-white font-semibold"
                    : "text-gray-800 hover:bg-blue-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout button */}
        <div className="mt-auto pt-4 border-t">
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
