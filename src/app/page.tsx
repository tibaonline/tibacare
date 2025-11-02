'use client'; 

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// ----------------------
// Types
// ----------------------
interface Service {
  id: string;
  emoji: string;
  title: {
    en: string;
    sw: string;
  };
  description: {
    en: string;
    sw: string;
  };
  price: number;
  category: string;
}

// ----------------------
// Translations
// ----------------------
const translations = {
  en: {
    title: 'TibaCare',
    tagline: 'Your Trusted Telemedicine Partner',
    professionalAccess: 'Professional Access',
    providerDashboard: 'Provider Panel',
    adminDashboard: 'Admin Panel',
    services: 'Services',
    whatsappChat: 'WhatsApp Chat',
    videoCall: 'Video Call',
    contact: 'Contact',
    preconsultation: 'Pre-Consultation',
    feedback: 'Feedback',
    ourServices: 'Our Services',
    footer: `© ${new Date().getFullYear()} TibaCare. All rights reserved.`,
    chooseService: 'Choose how to connect:',
    price: 'Price:',
    currency: 'KES',
    patientAccess: 'Patient Access',
    language: 'Language',
    english: 'English',
    kiswahili: 'Kiswahili',
  },
  sw: {
    title: 'TibaCare',
    tagline: 'Mshirika Wako Wa Kiamini Wa Telemedicine',
    professionalAccess: 'Ufikiaji wa Wataalamu',
    providerDashboard: 'Paneli ya Mtoa Huduma',
    adminDashboard: 'Paneli ya Admin',
    services: 'Huduma',
    whatsappChat: 'WhatsApp',
    videoCall: 'Video',
    contact: 'Mawasiliano',
    preconsultation: 'Kabla ya Ushauri',
    feedback: 'Maoni',
    ourServices: 'Huduma Zetu',
    footer: `© ${new Date().getFullYear()} TibaCare. Haki zote zimehifadhiwa.`,
    chooseService: 'Chagua jinsi ya kuunganisha:',
    price: 'Bei:',
    currency: 'KES',
    patientAccess: 'Mgonjwa',
    language: 'Lugha',
    english: 'English',
    kiswahili: 'Kiswahili',
  },
};

// ----------------------
// Services
// ----------------------
const servicesData: Service[] = [
  { id: '1', emoji: '👶', title: { en: 'Pediatrics', sw: 'Watoto' }, description: { en: 'Child care', sw: 'Huduma ya watoto' }, price: 350, category: 'specialist' },
  { id: '2', emoji: '❤️', title: { en: 'Reproductive', sw: 'Uzazi' }, description: { en: 'Reproductive health', sw: 'Afya ya uzazi' }, price: 500, category: 'specialist' },
  { id: '3', emoji: '🧠', title: { en: 'Mental', sw: 'Akili' }, description: { en: 'Mental health', sw: 'Afya ya akili' }, price: 500, category: 'specialist' },
  { id: '4', emoji: '🩺', title: { en: 'Physician', sw: 'Daktari' }, description: { en: 'Medical care', sw: 'Huduma za kimatibabu' }, price: 500, category: 'general' },
  { id: '5', emoji: '🤒', title: { en: 'Skin', sw: 'Ngozi' }, description: { en: 'Skin treatment', sw: 'Matibabu ya ngozi' }, price: 350, category: 'specialist' },
  { id: '6', emoji: '📞', title: { en: 'General', sw: 'Jumla' }, description: { en: 'General consultation', sw: 'Ushauri wa jumla' }, price: 350, category: 'general' },
  { id: '7', emoji: '💪', title: { en: 'Physiotherapy', sw: 'Physiotherapy' }, description: { en: 'Physical therapy & rehabilitation', sw: 'Tiba ya fizikia na urekebishaji' }, price: 500, category: 'specialist' },
];

// ----------------------
// Component
// ----------------------
export default function Home() {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'sw'>('en');
  const t = translations[currentLanguage];
  const router = useRouter();

  const toggleLanguage = () => {
    setCurrentLanguage(prev => (prev === 'en' ? 'sw' : 'en'));
  };

  // Redirect to pre-consultation with service pre-selected
  const handleServiceClick = (service: Service) => {
    router.push(`/patient-portal?service=${service.id}`);
  };

  // Memoized services list
  const servicesList = useMemo(
    () =>
      servicesData.map(service => (
        <div
          key={service.id}
          onClick={() => handleServiceClick(service)}
          className="bg-white rounded-lg p-3 text-center hover:shadow-md transition-all cursor-pointer flex flex-col items-center justify-center border border-blue-100 hover:border-blue-300 group"
          tabIndex={0}
          role="button"
        >
          <div className="text-3xl mb-2">{service.emoji}</div>
          <h3 className="font-semibold text-gray-800 mb-1 text-sm leading-tight">
            {service.title[currentLanguage]}
          </h3>
          <p className="text-xs text-gray-600 mb-2 leading-tight">
            {service.description[currentLanguage]}
          </p>
          <div className="w-full mt-auto">
            <div className="text-blue-700 font-bold text-xs bg-blue-50 rounded-md py-1 px-2 inline-block group-hover:bg-blue-100 transition-colors">
              {t.currency} {service.price}
            </div>
          </div>
        </div>
      )),
    [currentLanguage, t]
  );

  return (
    <div className="flex flex-col items-center w-full min-h-screen px-4 py-4 bg-gradient-to-br from-blue-50 to-teal-50 relative">
      {/* Language switch */}
      <div className="absolute top-3 right-3 z-10">
        <div className="flex items-center bg-white rounded-full shadow-sm pl-2 pr-1 py-1 border border-blue-100">
          <span className="text-xs text-gray-600 mr-1">{t.language}:</span>
          <button
            onClick={toggleLanguage}
            className="flex items-center justify-center w-12 rounded-full bg-blue-100 text-blue-800 font-medium text-xs px-2 py-1 transition-all hover:bg-blue-200"
          >
            {currentLanguage === 'en' ? t.english : t.kiswahili}
          </button>
        </div>
      </div>

      {/* Logo and tagline - LARGE LOGO WITH READABLE TEXT */}
      <section className="text-center w-full max-w-4xl mb-3 mt-1 flex flex-col items-center justify-center">
        <div className="relative w-64 h-64 mx-auto mb-3">
          <Image
            src="/tibacare-logo.png"
            alt="TibaCare Logo"
            fill
            className="object-contain drop-shadow-lg"
            priority
            sizes="(max-width: 768px) 256px, 256px"
          />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-blue-900 mb-1">{t.title}</h1>
        <p className="text-base md:text-lg text-gray-700 font-medium max-w-2xl">{t.tagline}</p>
      </section>

      {/* Main content grid - COMPACT BUT READABLE */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3 flex-1">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-3">
          {/* Professional Access */}
          <section className="bg-white rounded-lg shadow-sm p-3 border border-blue-100">
            <h2 className="text-base font-semibold mb-2 text-blue-900">
              {t.professionalAccess}
            </h2>
            <div className="space-y-2">
              <Link
                href="/login?redirect=/provider"
                className="block bg-teal-600 text-white px-3 py-2 rounded-lg shadow hover:bg-teal-700 transition-all text-center text-xs font-medium hover:shadow-md"
              >
                {t.providerDashboard}
              </Link>
              <Link
                href="/login?redirect=/admin/provider"
                className="block bg-blue-700 text-white px-3 py-2 rounded-lg shadow hover:bg-blue-800 transition-all text-center text-xs font-medium hover:shadow-md"
              >
                {t.adminDashboard}
              </Link>
            </div>
          </section>

          {/* Patient Access */}
          <section className="bg-white rounded-lg shadow-sm p-3 border border-blue-100">
            <h2 className="text-base font-semibold mb-2 text-blue-900">{t.patientAccess}</h2>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/patient-portal"
                className="bg-purple-600 text-white px-2 py-2 rounded-lg hover:bg-purple-700 transition-all text-center text-xs font-medium shadow hover:shadow-md"
              >
                {t.preconsultation}
              </Link>
              <Link
                href="/feedback"
                className="bg-amber-500 text-white px-2 py-2 rounded-lg hover:bg-amber-600 transition-all text-center text-xs font-medium shadow hover:shadow-md"
              >
                {t.feedback}
              </Link>
              <Link
                href="/contact"
                className="bg-gray-600 text-white px-2 py-2 rounded-lg hover:bg-gray-700 transition-all text-center text-xs font-medium shadow hover:shadow-md col-span-2"
              >
                {t.contact}
              </Link>
            </div>
          </section>
        </div>

        {/* Services section */}
        <div className="lg:col-span-2">
          <section className="bg-white rounded-lg shadow-sm p-3 border border-blue-100 h-full">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">{t.ourServices}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">{servicesList}</div>
          </section>
        </div>
      </div>

      <footer className="text-center text-gray-500 text-xs mt-auto pt-3 pb-2">
        {t.footer}
      </footer>
    </div>
  );
}