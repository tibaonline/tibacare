'use client';

import Link from "next/link";

export default function ManageHomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-blue-600">Manage Dashboard</h1>
      <p>Welcome to your Manage Dashboard. Select a section below to get started:</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/manage/users"
          className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">Users</h2>
          <p>Manage user profiles, roles, and permissions.</p>
        </Link>

        <Link
          href="/manage/appointments"
          className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">Appointments</h2>
          <p>View, schedule, and manage appointments.</p>
        </Link>

        <Link
          href="/manage/messages"
          className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">Messages</h2>
          <p>Review and respond to patient and provider messages.</p>
        </Link>

        <Link
          href="/manage/clients"
          className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">Clients</h2>
          <p>Manage client records and profiles.</p>
        </Link>

        <Link
          href="/manage/consultations"
          className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">Consultations</h2>
          <p>View consultation history and details.</p>
        </Link>

        <Link
          href="/manage/feedback"
          className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">Feedback</h2>
          <p>View patient feedback and ratings.</p>
        </Link>
      </div>
    </div>
  );
}
