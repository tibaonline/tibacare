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

export default function PreConsultationFiles() {
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string): string => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    return '📁';
  };

  if (loading) return (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-3 text-gray-600">Loading files...</span>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center">
        <div className="text-red-600">⚠️</div>
        <div className="ml-3">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
      <button
        onClick={fetchFiles}
        className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
      >
        Try Again
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-semibold text-gray-800">Pre-Consultation Files</h2>
        <p className="text-sm text-gray-600 mt-1">
          {files.length} file{files.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {files.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="text-4xl mb-4">📁</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No files yet</h3>
          <p className="text-gray-500">Pre-consultation files will appear here once patients upload them.</p>
        </div>
      ) : (
        <div className="divide-y">
          {files.map((file) => (
            <div key={file.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="text-2xl mt-1">{getFileIcon(file.fileType)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900 truncate">
                        {file.filename}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        file.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : file.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {file.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {file.description || 'No description'}
                    </p>
                    
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>From: {file.patientName}</span>
                      <span>•</span>
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span>•</span>
                      <span>{new Date(file.uploadDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                  >
                    View
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}