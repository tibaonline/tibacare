'use client';

import { useState } from 'react';
import PrescriptionPage from './tools/prescription/page';
import LabRequestPage from './tools/lab-request/page';
import ImagingRequestPage from './tools/imaging-request/page';
import ReferralPage from './tools/referral/page';
import SickNotePage from './tools/sick-note/page';
import MedicalReportPage from './tools/medical-report/page';
import FaceSheetPage from './tools/facesheet/page';

export default function ProviderDashboard() {
  const [selectedTool, setSelectedTool] = useState<
    | 'prescription'
    | 'lab'
    | 'imaging'
    | 'referral'
    | 'sicknote'
    | 'medicalreport'
    | 'facesheet'
    | null
  >(null);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Provider Dashboard</h1>

      {/* Tool Selection Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedTool('prescription')}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Prescription
        </button>
        <button
          onClick={() => setSelectedTool('lab')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Lab Request
        </button>
        <button
          onClick={() => setSelectedTool('imaging')}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          Imaging Request
        </button>
        <button
          onClick={() => setSelectedTool('referral')}
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
        >
          Referral
        </button>
        <button
          onClick={() => setSelectedTool('sicknote')}
          className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
        >
          Sick Note
        </button>
        <button
          onClick={() => setSelectedTool('medicalreport')}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Medical Report
        </button>
        <button
          onClick={() => setSelectedTool('facesheet')}
          className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700"
        >
          Face Sheet
        </button>
      </div>

      {/* Render Selected Tool */}
      <div className="bg-white p-6 rounded shadow">
        {selectedTool === 'prescription' && <PrescriptionPage />}
        {selectedTool === 'lab' && <LabRequestPage />}
        {selectedTool === 'imaging' && <ImagingRequestPage />}
        {selectedTool === 'referral' && <ReferralPage />}
        {selectedTool === 'sicknote' && <SickNotePage />}
        {selectedTool === 'medicalreport' && <MedicalReportPage />}
        {selectedTool === 'facesheet' && <FaceSheetPage />}
        {!selectedTool && (
          <p className="text-gray-500">
            Select a tool above to start using it.
          </p>
        )}
      </div>
    </div>
  );
}
