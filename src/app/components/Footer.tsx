'use client';

export default function Footer() {
  return (
    <footer className="bg-white border-t py-6 text-center text-sm text-gray-600">
      <div className="flex justify-center mb-4">
        <a
          href="https://wa.me/254705895872?text=Hello%20TibaCare%2C%20I%20would%20like%20to%20consult"
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 flex items-center justify-center bg-[#25D366] text-white rounded-full shadow hover:bg-green-600 transition"
        >
        </a>
      </div>
      <p>© {new Date().getFullYear()} TibaCare. All rights reserved.</p>
    </footer>
  );
}
