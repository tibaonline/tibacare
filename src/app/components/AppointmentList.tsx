// src/components/AppointmentList.tsx
'use client';

import { useState } from 'react';
import { FiCalendar, FiClock, FiUser, FiInfo, FiEdit2, FiTrash2 } from 'react-icons/fi';

interface Appointment {
  id: string;
  patientName: string;
  date: string;
  time: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  reason: string;
}

export default function AppointmentList() {
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: '1',
      patientName: 'John Doe',
      date: '2023-06-15',
      time: '10:00 AM',
      status: 'confirmed',
      reason: 'Annual checkup'
    },
    {
      id: '2',
      patientName: 'Jane Smith',
      date: '2023-06-15',
      time: '11:30 AM',
      status: 'pending',
      reason: 'Back pain consultation'
    },
    {
      id: '3',
      patientName: 'Michael Johnson',
      date: '2023-06-16',
      time: '09:15 AM',
      status: 'confirmed',
      reason: 'Follow-up visit'
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);

  const handleEdit = (appointment: Appointment) => {
    setCurrentAppointment(appointment);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setAppointments(appointments.filter(appt => appt.id !== id));
  };

  const handleStatusChange = (id: string, status: 'confirmed' | 'pending' | 'cancelled') => {
    setAppointments(appointments.map(appt => 
      appt.id === id ? { ...appt, status } : appt
    ));
  };

  return (
    <>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {appointments.map((appointment) => (
            <tr key={appointment.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <FiUser className="flex-shrink-0 h-4 w-4 text-gray-400 mr-2" />
                  <span className="font-medium">{appointment.patientName}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <FiCalendar className="flex-shrink-0 h-4 w-4 text-gray-400 mr-2" />
                  <span>{new Date(appointment.date).toLocaleDateString()}</span>
                  <FiClock className="flex-shrink-0 h-4 w-4 text-gray-400 ml-3 mr-2" />
                  <span>{appointment.time}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                {appointment.reason}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEdit(appointment)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <FiEdit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(appointment.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                  <select
                    value={appointment.status}
                    onChange={(e) => handleStatusChange(
                      appointment.id, 
                      e.target.value as 'confirmed' | 'pending' | 'cancelled'
                    )}
                    className="text-xs border rounded p-1"
                  >
                    <option value="confirmed">Confirm</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancel</option>
                  </select>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Appointment Modal (for editing) */}
      {showModal && currentAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Appointment</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Patient Name</label>
                <input
                  type="text"
                  value={currentAppointment.patientName}
                  onChange={(e) => setCurrentAppointment({
                    ...currentAppointment,
                    patientName: e.target.value
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={currentAppointment.date}
                    onChange={(e) => setCurrentAppointment({
                      ...currentAppointment,
                      date: e.target.value
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Time</label>
                  <input
                    type="time"
                    value={currentAppointment.time}
                    onChange={(e) => setCurrentAppointment({
                      ...currentAppointment,
                      time: e.target.value
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <textarea
                  value={currentAppointment.reason}
                  onChange={(e) => setCurrentAppointment({
                    ...currentAppointment,
                    reason: e.target.value
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setAppointments(appointments.map(appt => 
                    appt.id === currentAppointment.id ? currentAppointment : appt
                  ));
                  setShowModal(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}