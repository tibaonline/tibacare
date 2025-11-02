'use client';

// Import each tool directly
import Prescription from './prescription';
import LabRequest from './lab-request';
import ImagingRequest from './imaging-request';
import Referral from './referral';
import SickNote from './sick-note';
import MedicalReport from './medical-report';
import FaceSheet from './facesheet';

// Export them as named exports
export {
  Prescription,
  LabRequest,
  ImagingRequest,
  Referral,
  SickNote,
  MedicalReport,
  FaceSheet,
};

// Also export a default export for the tools page itself
export default function ToolsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Medical Tools</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Prescription</h2>
          <Prescription />
        </div>
        
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Lab Request</h2>
          <LabRequest />
        </div>
        
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Imaging Request</h2>
          <ImagingRequest />
        </div>
        
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Referral</h2>
          <Referral />
        </div>
        
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Sick Note</h2>
          <SickNote />
        </div>
        
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Medical Report</h2>
          <MedicalReport />
        </div>
        
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Face Sheet</h2>
          <FaceSheet />
        </div>
      </div>
    </div>
  );
}