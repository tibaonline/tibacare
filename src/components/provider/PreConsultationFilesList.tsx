'use client';

import { useState, useEffect } from 'react';

interface PreConsultationFile {
  id: string;
  filename: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  description: string;
  patientName: string;
  patientEmail: string;
  preConsultationId: string;
  status: string;
}

export default function PreConsultationFilesList() {
  const [files, setFiles] = useState<PreConsultationFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/provider/preconsultation-files');
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      const data = await response.json();
      setFiles(data.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Add your JSX rendering logic here
  if (loading) return <div>Loading files...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Pre-Consultation Files</h2>
      {/* Render your files list here */}
    </div>
  );
}