'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/manage/clients", label: "Clients" },
    { href: "/manage/appointments", label: "Appointments" },
    { href: "/manage/providers", label: "Providers" },
    { href: "/manage/notifications", label: "Notifications" },
    { href: "/manage/feedback", label: "Feedback" },
    { href: "/manage/reports", label: "Reports" },
  ];

  return (
    <aside className="w-64 h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-4 text-2xl font-bold border-b border-gray-700">
        Manage Panel
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`block px-4 py-2 rounded hover:bg-gray-700 ${
              pathname === href ? "bg-gray-700 font-semibold" : ""
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
