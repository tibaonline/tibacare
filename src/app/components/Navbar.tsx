// src/app/components/Navbar.tsx
import Link from "next/link";
import Image from "next/image";

const Navbar = () => {
  return (
    <nav className="bg-white shadow-md px-4 py-2 flex items-center justify-between">
      {/* LOGO */}
      <Link href="/">
        <div className="flex items-center space-x-2">
          <Image
            src="/tibacare-logo.png"
            alt="TibaCare Logo"
            width={40}
            height={40}
            className="rounded-full"
          />
          <span className="text-xl font-bold text-blue-700">TibaCare</span>
        </div>
      </Link>

      {/* Navigation Links */}
      <div className="space-x-4">
        <Link href="/" className="text-gray-700 hover:text-blue-600">Home</Link>
        <Link href="/services" className="text-gray-700 hover:text-blue-600">Services</Link>
        <Link href="/consultations" className="text-gray-700 hover:text-blue-600">Consultations</Link>
        <Link href="/contact" className="text-gray-700 hover:text-blue-600">Contact</Link>
      </div>
    </nav>
  );
};

export default Navbar;
