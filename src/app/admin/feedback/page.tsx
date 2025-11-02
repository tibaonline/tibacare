'use client';

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import toast, { Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";

type Feedback = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  createdAt?: any;
};

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<Feedback[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [stats, setStats] = useState({ total: 0, today: 0, thisWeek: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [viewingId, setViewingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { setIsAdmin(false); setLoading(false); return; }
      try {
        const token = await user.getIdTokenResult(true);
        const claimAdmin = token.claims.admin === true;
        const emailAdmin = user.email === "humphreykiboi1@gmail.com";
        setIsAdmin(claimAdmin || emailAdmin);
        if (!(claimAdmin || emailAdmin)) toast.error("Admin privileges required");
      } catch (err) { console.error(err); setIsAdmin(false); }
      finally { setLoading(false); }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Feedback[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Feedback[];
      setFeedbacks(data);
      setFilteredFeedbacks(data);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);

      setStats({
        total: data.length,
        today: data.filter(f => f.createdAt?.seconds && new Date(f.createdAt.seconds * 1000) >= todayStart).length,
        thisWeek: data.filter(f => f.createdAt?.seconds && new Date(f.createdAt.seconds * 1000) >= weekStart).length,
      });
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    let result = [...feedbacks];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(fb =>
        fb.name.toLowerCase().includes(term) ||
        fb.email.toLowerCase().includes(term) ||
        (fb.phone || "").toLowerCase().includes(term) ||
        fb.message.toLowerCase().includes(term)
      );
    }
    if (sortBy === "oldest") result = result.reverse();
    setFilteredFeedbacks(result);
  }, [feedbacks, searchTerm, sortBy]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this feedback?")) return;
    try { await deleteDoc(doc(db, "feedback", id)); toast.success("Feedback deleted"); }
    catch (err) { console.error(err); toast.error("Delete failed"); }
  };

  const handleEdit = (feedback: Feedback) => {
    setEditingId(feedback.id);
    setEditForm({
      name: feedback.name,
      email: feedback.email,
      phone: feedback.phone || "",
      message: feedback.message
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    try {
      await updateDoc(doc(db, "feedback", editingId), {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        message: editForm.message
      });
      toast.success("Feedback updated");
      setEditingId(null);
    } catch (err) {
      console.error(err);
      toast.error("Update failed");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleShare = async (feedback: Feedback) => {
    const shareData = {
      title: `Feedback from ${feedback.name}`,
      text: `Name: ${feedback.name}\nEmail: ${feedback.email}\nPhone: ${feedback.phone || "N/A"}\nMessage: ${feedback.message}\nDate: ${formatDate(feedback.createdAt)}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success("Shared successfully");
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error("Share failed:", err);
          toast.error("Sharing failed");
        }
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(shareData.text);
      toast.success("Copied to clipboard");
    }
  };

  const handleView = (id: string) => {
    setViewingId(viewingId === id ? null : id);
  };

  const exportToCSV = () => {
    const csv = Papa.unparse(filteredFeedbacks.map(f => ({
      Name: f.name, Email: f.email, Phone: f.phone, Message: f.message, Date: formatDate(f.createdAt)
    })));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feedback_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("CSV downloaded");
  };

  const exportToPDF = () => {
    const docPdf = new jsPDF();
    const pageWidth = docPdf.internal.pageSize.getWidth();
    
    // Add logo centered at the top
    const logoImg = new Image();
    logoImg.src = "/tibacare-logo.png";
    
    logoImg.onload = () => {
      const logoWidth = 40;
      const logoHeight = 20;
      const logoX = (pageWidth - logoWidth) / 2;
      
      docPdf.addImage(logoImg, "PNG", logoX, 15, logoWidth, logoHeight);
      
      // Add contact info below logo
      docPdf.setFontSize(10);
      docPdf.setTextColor(100, 100, 100);
      const contactText = "Phone: +254 705 575 068 | Email: info@tibacare.com";
      const contactWidth = docPdf.getTextWidth(contactText);
      docPdf.text(contactText, (pageWidth - contactWidth) / 2, 40);
      
      // Add separator line
      docPdf.setDrawColor(200, 200, 200);
      docPdf.line(14, 45, pageWidth - 14, 45);
      
      // Add title
      docPdf.setFontSize(16);
      docPdf.setTextColor(0, 0, 0);
      docPdf.text("TibaCare - Feedback", pageWidth / 2, 55, { align: "center" });
      
      // Add feedback table
      autoTable(docPdf, {
        startY: 65,
        head: [["Name", "Email", "Phone", "Message", "Date"]],
        body: filteredFeedbacks.map(f => [f.name, f.email, f.phone || "", f.message, formatDate(f.createdAt)]),
        theme: "grid",
        headStyles: { fillColor: [66, 139, 202] },
        margin: { top: 65 }
      });
      
      // Get the final Y position after the table
      const finalY = (docPdf as any).lastAutoTable.finalY || 65;
      
      // Add separator line above footer
      docPdf.setDrawColor(200, 200, 200);
      docPdf.line(14, finalY + 10, pageWidth - 14, finalY + 10);
      
      // Add footer content
      docPdf.setFontSize(9);
      docPdf.setTextColor(100, 100, 100);
      
      // Issued on date
      docPdf.text(`Issued on: ${new Date().toLocaleString()}`, pageWidth / 2, finalY + 20, { align: "center" });
      
      // Copyright and address info
      docPdf.text("© 2025 TibaCare. All rights reserved.", pageWidth / 2, finalY + 25, { align: "center" });
      docPdf.text("P.O. Box 20625 - 00200, Nairobi, Kenya", pageWidth / 2, finalY + 30, { align: "center" });
      docPdf.text("Phone: +254 705 575 068 | Email: info@tibacare.com", pageWidth / 2, finalY + 35, { align: "center" });
      docPdf.text("Your Trusted Telemedicine Partner", pageWidth / 2, finalY + 40, { align: "center" });
      
      docPdf.save(`feedback_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF downloaded");
    };
  };

  const exportSinglePDF = (fb: Feedback) => {
    const docPdf = new jsPDF();
    const pageWidth = docPdf.internal.pageSize.getWidth();
    
    // Add logo centered at the top
    const logoImg = new Image();
    logoImg.src = "/tibacare-logo.png";
    
    logoImg.onload = () => {
      const logoWidth = 40;
      const logoHeight = 20;
      const logoX = (pageWidth - logoWidth) / 2;
      
      docPdf.addImage(logoImg, "PNG", logoX, 15, logoWidth, logoHeight);
      
      // Add contact info below logo
      docPdf.setFontSize(10);
      docPdf.setTextColor(100, 100, 100);
      const contactText = "Phone: +254 705 575 068 | Email: info@tibacare.com";
      const contactWidth = docPdf.getTextWidth(contactText);
      docPdf.text(contactText, (pageWidth - contactWidth) / 2, 40);
      
      // Add separator line
      docPdf.setDrawColor(200, 200, 200);
      docPdf.line(14, 45, pageWidth - 14, 45);
      
      // Add title
      docPdf.setFontSize(16);
      docPdf.setTextColor(0, 0, 0);
      docPdf.text("TibaCare - Feedback Details", pageWidth / 2, 55, { align: "center" });
      
      // Add feedback details
      autoTable(docPdf, {
        startY: 65,
        body: [
          ["Name", fb.name],
          ["Email", fb.email],
          ["Phone", fb.phone || ""],
          ["Message", fb.message],
          ["Date Submitted", formatDate(fb.createdAt)],
        ],
        theme: "grid",
        headStyles: { fillColor: [66, 139, 202] },
        margin: { top: 65 }
      });
      
      // Get the final Y position after the table
      const finalY = (docPdf as any).lastAutoTable.finalY || 65;
      
      // Add separator line above footer
      docPdf.setDrawColor(200, 200, 200);
      docPdf.line(14, finalY + 10, pageWidth - 14, finalY + 10);
      
      // Add footer content
      docPdf.setFontSize(9);
      docPdf.setTextColor(100, 100, 100);
      
      // Issued on date
      docPdf.text(`Issued on: ${new Date().toLocaleString()}`, pageWidth / 2, finalY + 20, { align: "center" });
      
      // Copyright and address info
      docPdf.text("© 2025 TibaCare. All rights reserved.", pageWidth / 2, finalY + 25, { align: "center" });
      docPdf.text("P.O. Box 20625 - 00200, Nairobi, Kenya", pageWidth / 2, finalY + 30, { align: "center" });
      docPdf.text("Phone: +254 705 575 068 | Email: info@tibacare.com", pageWidth / 2, finalY + 35, { align: "center" });
      docPdf.text("Your Trusted Telemedicine Partner", pageWidth / 2, finalY + 40, { align: "center" });
      
      docPdf.save(`feedback_${fb.id}.pdf`);
    };
  };

  const formatDate = (ts: any) => ts?.seconds ? new Date(ts.seconds * 1000).toLocaleString() : "N/A";

  if (loading) return <div className="p-8 text-center">Checking admin...</div>;
  if (!isAdmin) return <div className="p-8 text-center">⛔ Admin Access Required</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Toaster />
      <div className="max-w-6xl mx-auto">
        <div className="bg-white shadow p-4 rounded mb-4 flex justify-between">
          <h1 className="text-xl font-bold">📬 Feedback Admin Portal</h1>
          <div className="space-x-2">
            <button onClick={exportToCSV} className="bg-green-600 text-white px-3 py-1 rounded">CSV</button>
            <button onClick={exportToPDF} className="bg-blue-600 text-white px-3 py-1 rounded">PDF</button>
            <button onClick={() => signOut(auth)} className="bg-red-600 text-white px-3 py-1 rounded">Sign Out</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-4 rounded shadow">Total: {stats.total}</div>
          <div className="bg-white p-4 rounded shadow">Today: {stats.today}</div>
          <div className="bg-white p-4 rounded shadow">This Week: {stats.thisWeek}</div>
        </div>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Search..."
            className="p-2 border rounded w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
            className="p-2 border rounded"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>

        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Phone</th>
                <th className="p-2 text-left">Message</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeedbacks.map(fb => (
                <>
                  <tr key={fb.id} className="border-t hover:bg-gray-50">
                    <td className="p-2">{fb.name}</td>
                    <td className="p-2">{fb.email}</td>
                    <td className="p-2">{fb.phone || "N/A"}</td>
                    <td className="p-2 max-w-xs truncate">{fb.message}</td>
                    <td className="p-2">{formatDate(fb.createdAt)}</td>
                    <td className="p-2 space-x-1">
                      <button onClick={() => exportSinglePDF(fb)} className="text-blue-600 hover:underline">PDF</button>
                      <button onClick={() => handleDelete(fb.id)} className="text-red-600 hover:underline">Delete</button>
                      <button onClick={() => handleShare(fb)} className="text-green-600 hover:underline">Share</button>
                      <button onClick={() => handleEdit(fb)} className="text-yellow-600 hover:underline">Edit</button>
                      <button onClick={() => handleView(fb.id)} className="text-purple-600 hover:underline">
                        {viewingId === fb.id ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  
                  {/* Edit Form Row */}
                  {editingId === fb.id && (
                    <tr className="bg-yellow-50">
                      <td colSpan={6} className="p-4">
                        <div className="space-y-3">
                          <h3 className="font-bold">Edit Feedback</h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium">Name</label>
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                className="p-2 border rounded w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium">Email</label>
                              <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                className="p-2 border rounded w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium">Phone</label>
                              <input
                                type="text"
                                value={editForm.phone}
                                onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                                className="p-2 border rounded w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium">Message</label>
                              <textarea
                                value={editForm.message}
                                onChange={(e) => setEditForm({...editForm, message: e.target.value})}
                                className="p-2 border rounded w-full"
                                rows={3}
                              />
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button onClick={handleSaveEdit} className="bg-blue-600 text-white px-3 py-1 rounded">
                              Save
                            </button>
                            <button onClick={handleCancelEdit} className="bg-gray-600 text-white px-3 py-1 rounded">
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  
                  {/* View Details Row */}
                  {viewingId === fb.id && (
                    <tr className="bg-blue-50">
                      <td colSpan={6} className="p-4">
                        <div className="space-y-2">
                          <h3 className="font-bold">Feedback Details</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <strong>Name:</strong> {fb.name}
                            </div>
                            <div>
                              <strong>Email:</strong> {fb.email}
                            </div>
                            <div>
                              <strong>Phone:</strong> {fb.phone || "N/A"}
                            </div>
                            <div>
                              <strong>Date:</strong> {formatDate(fb.createdAt)}
                            </div>
                            <div className="col-span-2">
                              <strong>Message:</strong>
                              <div className="mt-1 p-3 bg-white border rounded">
                                {fb.message}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}