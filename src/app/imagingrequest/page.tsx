'use client';

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";

export default function ImagingrequestPage() {
  const [formData, setFormData] = useState({
    patientName: '',
    imagingType: '',
    reason: '',
    doctorName: ''
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    try {
      await addDoc(collection(db, "imagingRequests"), {
        ...formData,
        createdAt: serverTimestamp(),
      });
      setSuccessMsg("Submitted successfully!");
      setFormData({
        patientName: '',
        imagingType: '',
        reason: '',
        doctorName: ''
      });
    } catch (error) {
      alert("Error submitting form: " + error);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded shadow mt-8">
      <h1 className="text-xl font-semibold mb-4">Imaging Request Form</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="patientName" className="block font-medium mb-1">Patient Name</label>
          <input
            type="text"
            id="patientName"
            name="patientName"
            value={formData.patientName}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>
        <div>
          <label htmlFor="imagingType" className="block font-medium mb-1">Imaging Type</label>
          <input
            type="text"
            id="imagingType"
            name="imagingType"
            value={formData.imagingType}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>
        <div>
          <label htmlFor="reason" className="block font-medium mb-1">Reason</label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>
        <div>
          <label htmlFor="doctorName" className="block font-medium mb-1">Doctor Name</label>
          <input
            type="text"
            id="doctorName"
            name="doctorName"
            value={formData.doctorName}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>
      {successMsg && <p className="mt-4 text-green-600">{successMsg}</p>}
    </div>
  );
}
