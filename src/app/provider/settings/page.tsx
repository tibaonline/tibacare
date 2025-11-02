'use client';

import React, { useEffect, useState } from 'react';
import { auth, storage } from '@/firebase';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import toast from 'react-hot-toast';

export default function ProviderSettingsPage() {
  const user = auth.currentUser;
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleUpdate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let updatedPhotoURL = photoURL;

      // Upload new profile photo if selected
      if (photoFile) {
        const photoRef = ref(storage, `profiles/${user.uid}/${photoFile.name}`);
        await uploadBytes(photoRef, photoFile);
        updatedPhotoURL = await getDownloadURL(photoRef);
        setPhotoURL(updatedPhotoURL);
      }

      await updateProfile(user, { displayName, photoURL: updatedPhotoURL });
      setMessage({ text: 'Profile updated successfully ✅', type: 'success' });
      toast.success('Profile updated successfully ✅');
    } catch (error) {
      console.error(error);
      setMessage({ text: 'Failed to update profile ❌', type: 'error' });
      toast.error('Failed to update profile ❌');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
      const previewURL = URL.createObjectURL(e.target.files[0]);
      setPhotoURL(previewURL);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;
    try {
      if (user.photoURL) {
        // Remove photo from Firebase Storage
        const oldPhotoRef = ref(storage, user.photoURL);
        try {
          await deleteObject(oldPhotoRef);
        } catch {
          console.warn('Photo not found in storage, skipping delete.');
        }
      }
      await updateProfile(user, { photoURL: '' });
      setPhotoURL('');
      setMessage({ text: 'Profile photo removed ✅', type: 'success' });
      toast.success('Profile photo removed ✅');
    } catch (error) {
      console.error(error);
      setMessage({ text: 'Failed to remove photo ❌', type: 'error' });
      toast.error('Failed to remove photo ❌');
    }
  };

  return (
    <div className="p-6 max-w-md space-y-6">
      <h1 className="text-3xl font-bold text-blue-700 mb-4">Settings</h1>

      {/* Avatar Preview */}
      <div className="flex flex-col items-center gap-3 mb-4">
        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-blue-600">
          {photoURL ? (
            <img src={photoURL} alt="Profile Photo" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-xl font-bold">
              {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
        </div>
        {photoURL && (
          <button
            onClick={handleRemovePhoto}
            className="text-red-600 hover:underline text-sm"
          >
            Remove Photo
          </button>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block mb-1 font-semibold">Email (readonly)</label>
        <input
          type="email"
          className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed"
          value={user?.email || ''}
          disabled
        />
      </div>

      {/* Display Name */}
      <div>
        <label className="block mb-1 font-semibold">Display Name</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>

      {/* Profile Photo */}
      <div>
        <label className="block mb-1 font-semibold">Profile Photo (optional)</label>
        <input type="file" accept="image/*" onChange={handlePhotoChange} />
      </div>

      <button
        onClick={handleUpdate}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? 'Updating...' : 'Update Profile'}
      </button>

      {message && (
        <p className={`mt-2 font-semibold ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
