'use client';

import Link from "next/link";

export default function ManageDashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-blue-600">Manage Dashboard</h1>

      <p className="text-gray-700">
        Welcome to your Manage Dashboard. Select a section below to get started:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard
          title="Users"
          description="Manage user profiles, roles, and permissions."
          href="/manage/users"
        />

        <SectionCard
          title="Appointments"
          description="View, schedule, and manage appointments."
          href="/manage/appointments"
        />

        <SectionCard
          title="Messages"
          description="Review and respond to patient and provider messages."
          href="/manage/messages"
        />

        <SectionCard
          title="Clients"
          description="Manage client records and profiles."
          href="/manage/clients"
        />

        <SectionCard
          title="Consultations"
          description="View consultation history and details."
          href="/manage/consultations"
        />

        <SectionCard
          title="Feedback"
          description="View patient feedback and ratings."
          href="/manage/feedback"
        />
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-600 mb-4">{description}</p>
      <Link
        href={href}
        className="text-blue-600 hover:underline font-medium"
      >
        Go to {title}
      </Link>
    </div>
  );
}
