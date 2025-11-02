'use client';

import Link from "next/link";

export default function FormsPage() {
  const forms = [
    { name: "Prescription", path: "/admin/forms/prescription" },
    { name: "Referral", path: "/admin/forms/referral" },
    { name: "Lab Request", path: "/admin/forms/lab-request" },
    { name: "Imaging Request", path: "/admin/forms/imaging-request" },
    { name: "Sick Note", path: "/admin/forms/sick-note" },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">Forms</h1>
      <p className="text-gray-700 mb-6">
        Manage all medical forms including prescriptions, referrals, lab requests, imaging requests, and sick notes. Click a form to add or view entries.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {forms.map((form) => (
          <div key={form.name} className="bg-white p-6 rounded shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-4">{form.name}</h2>
            <Link
              href={form.path}
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Go to {form.name}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
