'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideLayout = pathname.startsWith('/provider');

  return (
    <>
      {!hideLayout && <Navbar />}
      <main className="max-w-6xl mx-auto px-4 py-8 min-h-[calc(100vh-140px)]">
        {children}
      </main>
      {!hideLayout && <Footer />}
    </>
  );
}
