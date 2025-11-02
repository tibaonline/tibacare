import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadFileToStorage = async (
  file: File, 
  uploadCode: string, 
  patientName: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'File size too large. Maximum size is 10MB.' };
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'File type not allowed. Please upload images, PDFs, or documents.' };
    }

    // Create storage reference with organized structure
    const fileExtension = file.name.split('.').pop();
    const timestamp = new Date().getTime();
    const fileName = `${patientName.replace(/\s+/g, '_')}_${timestamp}.${fileExtension}`;
    
    const storageRef = ref(storage, `whatsapp_uploads/${uploadCode}/${fileName}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return { success: true, url: downloadURL };
  } catch (error: any) {
    console.error('Upload error:', error);
    return { success: false, error: error.message || 'Failed to upload file' };
  }
};