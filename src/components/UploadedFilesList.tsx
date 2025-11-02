'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Eye } from 'lucide-react';

interface UploadedFilesListProps {
  patientId: string;
  showAll?: boolean;
}

interface FileItem {
  id: string;
  name: string;
  url: string;
  size: number;
  uploadedAt: Date;
  type: string;
}

export default function UploadedFilesList({ patientId, showAll = false }: UploadedFilesListProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for demonstration - replace with actual Firestore calls
  useEffect(() => {
    const loadFiles = async () => {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setFiles([
          {
            id: '1',
            name: 'medical_report.pdf',
            url: '#',
            size: 2048576,
            uploadedAt: new Date('2024-01-15'),
            type: 'pdf'
          },
          {
            id: '2',
            name: 'lab_results.jpg',
            url: '#',
            size: 1048576,
            uploadedAt: new Date('2024-01-10'),
            type: 'image'
          }
        ]);
        setLoading(false);
      }, 1000);
    };

    loadFiles();
  }, [patientId]);

  const handleDownload = (file: FileItem) => {
    // Implement download logic
    console.log('Downloading:', file.name);
    window.open(file.url, '_blank');
  };

  const handleView = (file: FileItem) => {
    // Implement view logic
    console.log('Viewing:', file.name);
    window.open(file.url, '_blank');
  };

  const handleDelete = (fileId: string) => {
    // Implement delete logic
    console.log('Deleting file:', fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const displayFiles = showAll ? files : files.slice(0, 3);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-teal-700 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5" />
        Uploaded Medical Files
      </h3>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading files...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No files uploaded yet.</p>
          <p className="text-sm mt-1">Upload medical documents using the form above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayFiles.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3 flex-1">
                <FileText className="w-5 h-5 text-teal-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{formatDate(file.uploadedAt)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleView(file)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="View file"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDownload(file)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                  title="Download file"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(file.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!showAll && files.length > 3 && (
        <div className="mt-4 pt-4 border-t">
          <button className="text-teal-600 hover:text-teal-800 text-sm font-medium">
            View all {files.length} files →
          </button>
        </div>
      )}
    </div>
  );
}