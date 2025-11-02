'use client';

import Link from 'next/link';

const services = [
  { icon: '🧒', name: 'Pediatrics', path: '/services/pediatrics' },
  { icon: '❤️', name: 'Reproductive Health', path: '/services/reproductive-health' },
  { icon: '🧠', name: 'Mental Health', path: '/services/mental-health' },
  { icon: '👨‍⚕️', name: 'Physician', path: '/services/physician' },
  { icon: '💬', name: 'General Consultations', path: '/services/general' },
  { icon: '🌿', name: 'Dermatology', path: '/services/dermatology' }
];

export default function ServicesSection() {
  return (
    <section id="services" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-green-700">🩺 Our Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Link
              key={service.path}
              href={service.path}
              className="bg-green-50 rounded-lg p-6 text-center hover:bg-green-100 transition-colors block"
            >
              <div className="text-4xl mb-3">{service.icon}</div>
              <h3 className="text-xl font-medium">{service.name}</h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
