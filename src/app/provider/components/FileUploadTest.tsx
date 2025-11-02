'use client';

import { useState } from 'react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';

export default function FileUploadTest() {
  const [uploading, setUploading] = useState(false);
  const [uploadCode, setUploadCode] = useState('');
  const [patientName, setPatientName] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadCode) {
      toast.error('Please enter upload code and select a file');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Uploading file...');

    try {
      // Create the correct storage path
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `whatsapp_uploads/${uploadCode}/${fileName}`);
      
      console.log('📤 Uploading to path:', `whatsapp_uploads/${uploadCode}/${fileName}`);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ File uploaded successfully:', downloadURL);
      toast.success('File uploaded successfully!', { id: toastId });
      
      // Clear form
      setUploadCode('');
      setPatientName('');
      event.target.value = '';
      
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      toast.error(`Upload failed: ${error.message}`, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mb-6">
      <h3 className="text-lg font-semibold mb-4">Test File Upload</h3>
      <p className="text-sm text-gray-600 mb-4">
        Use this to test file uploads. Enter a patient's upload code and select a file.
      </p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Upload Code *</label>
          <input
            type="text"
            value={uploadCode}
            onChange={(e) => setUploadCode(e.target.value.toUpperCase())}
            placeholder="Enter upload code (e.g., 9RQSPW)"
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Patient Name</label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Enter patient name"
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Select File *</label>
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="w-full p-2 border rounded"
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.txt"
          />
          <p className="text-xs text-gray-500 mt-1">
            Supported: Images, PDF, Word documents, Text files
          </p>
        </div>
      </div>
    </div>
  );
}