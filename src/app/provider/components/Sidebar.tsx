'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function ProviderSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', href: '/provider/dashboard' },
    { label: 'Patients', href: '/provider/patients' },
    { label: 'Records', href: '/provider/records' },
    { label: 'Consultations', href: '/provider/consultations' },
    { label: 'Pre-Consultations', href: '/provider/preconsult' },
    { label: 'Messages', href: '/provider/messages' },
    { label: 'Settings', href: '/provider/settings' },
    // Tools removed
  ];

  return (
    <aside className="w-64 bg-gray-100 min-h-screen p-4 space-y-4">
      <h1 className="text-xl font-bold mb-6">TibaCare Provider</h1>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-4 py-2 rounded ${
              pathname.startsWith(item.href)
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <button
        onClick={logout}
        className="mt-6 w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Logout
      </button>
    </aside>
  );
}
