'use client';

import { useState, useRef } from 'react';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { Plus, Upload, X, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface FileUploadFormProps {
  patientId: string;
  patientName: string;
  consultationId?: string; // Add this to link files to specific consultation
}

interface UploadedFile {
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

export default function FileUploadForm({ patientId, patientName, consultationId }: FileUploadFormProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      // Validate file types and sizes
      const validFiles = files.filter(file => {
        const isValidType = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type);
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
        
        if (!isValidType) {
          toast.error(`File type not supported: ${file.name}`);
          return false;
        }
        if (!isValidSize) {
          toast.error(`File too large (max 10MB): ${file.name}`);
          return false;
        }
        return true;
      });
      
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);
    const uploadToast = toast.loading(`Uploading ${selectedFiles.length} files...`);

    try {
      const newUploadedFiles: UploadedFile[] = [];

      for (const file of selectedFiles) {
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const filePath = `patients/${patientId}/documents/${fileName}`;
        const storageRef = ref(storage, filePath);
        
        // Upload file to storage
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        const uploadedFile: UploadedFile = {
          name: file.name,
          url: downloadURL,
          type: file.type,
          size: file.size,
          uploadedAt: new Date()
        };

        newUploadedFiles.push(uploadedFile);

        // If we have a consultationId, update the consultation document
        if (consultationId) {
          await updateDoc(doc(db, 'preconsultations', consultationId), {
            files: arrayUnion(uploadedFile),
            hasFiles: true,
            lastUpdated: new Date()
          });
        }
      }

      // Update local state
      setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
      setSelectedFiles([]);
      
      toast.success(`Successfully uploaded ${newUploadedFiles.length} files`, { id: uploadToast });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files', { id: uploadToast });
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold text-teal-700 mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5" />
        Upload Medical Documents
      </h3>
      
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 mx-auto"
            disabled={uploading}
          >
            <Plus className="w-4 h-4" />
            Select Files
          </button>
          <p className="text-sm text-gray-500 mt-2">
            Supported formats: PDF, JPG, PNG, DOC (Max 10MB per file)
          </p>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Files to Upload:</h4>
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-yellow-50 p-3 rounded border">
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-4 h-4 text-yellow-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeSelectedFile(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            <button
              onClick={uploadFiles}
              disabled={uploading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors w-full flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        )}

        {uploadedFiles.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Uploaded Files:</h4>
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-green-50 p-3 rounded border">
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-4 h-4 text-green-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <div className="flex gap-2 text-xs text-gray-500">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{file.uploadedAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 p-1"
                >
                  <Upload className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}