'use client';
import StatusBadge from './StatusBadge';

interface Appointment {
  id: string;
  patientName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed';
  reason: string;
}

export default function AppointmentList() {
  const appointments: Appointment[] = [
    {
      id: '1',
      patientName: 'John Doe',
      date: '2023-06-15',
      time: '10:00 AM',
      status: 'confirmed',
      reason: 'Annual checkup',
    },
    {
      id: '2',
      patientName: 'Jane Smith',
      date: '2023-06-15',
      time: '11:30 AM',
      status: 'pending',
      reason: 'Back pain consultation',
    },
    {
      id: '3',
      patientName: 'Michael Johnson',
      date: '2023-06-16',
      time: '09:15 AM',
      status: 'completed',
      reason: 'Follow-up visit',
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Patient
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date/Time
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Reason
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {appointments.map((appointment) => (
            <tr key={appointment.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">{appointment.patientName}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-gray-900">
                  {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={appointment.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                {appointment.reason}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button className="text-green-600 hover:text-green-800 font-medium">
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}