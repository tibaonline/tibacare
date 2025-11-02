'use client';

import { useRouter, useParams } from "next/navigation";
import { db, auth } from "@/firebase";
import { doc, deleteDoc } from "firebase/firestore";

export default function DeleteConsultationPage() {
  const { id } = useParams();
  const router = useRouter();
  const user = auth.currentUser;
  const isAdmin = user?.email === "humphreykiboi1@gmail.com";

  async function handleDelete() {
    if (!isAdmin) {
      alert("Only admin can delete consultations");
      return;
    }
    try {
      await deleteDoc(doc(db, "consultations", id as string));
      alert("Consultation deleted successfully");
      router.push("/manage/consultations");
    } catch {
      alert("Failed to delete consultation");
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-red-600 mb-4">
        Confirm Delete
      </h1>
      <p>Are you sure you want to delete this consultation?</p>
      <div className="mt-4 space-x-4">
        <button
          onClick={handleDelete}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Yes, Delete
        </button>
        <button
          onClick={() => router.back()}
          className="bg-gray-600 text-white px-4 py-2 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
