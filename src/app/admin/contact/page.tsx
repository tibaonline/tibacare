'use client';

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  deleteDoc,
  doc,
  query,
  updateDoc,
} from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import toast, { Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";

type Contact = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  createdAt?: any;
};

export default function AdminContactPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [stats, setStats] = useState({ total: 0, today: 0, thisWeek: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Check admin privileges
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

  // Fetch contacts in real-time
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, "contact"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Contact[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Contact[];
      setContacts(data);
      setFilteredContacts(data);

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

  // Search + sort
  useEffect(() => {
    let result = [...contacts];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(f =>
        f.name.toLowerCase().includes(term) ||
        f.email.toLowerCase().includes(term) ||
        (f.phone || "").toLowerCase().includes(term) ||
        f.message.toLowerCase().includes(term)
      );
    }
    if (sortBy === "oldest") result = result.reverse();
    setFilteredContacts(result);
  }, [contacts, searchTerm, sortBy]);

  // Delete contact
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    try { 
      await deleteDoc(doc(db, "contact", id)); 
      toast.success("Contact deleted");
      setEditingId(null);
      setViewingId(null);
    }
    catch (err) { console.error(err); toast.error("Delete failed"); }
  };

  // Edit contact
  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setEditForm({
      name: contact.name,
      email: contact.email,
      phone: contact.phone || "",
      message: contact.message
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    try {
      await updateDoc(doc(db, "contact", editingId), {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        message: editForm.message
      });
      toast.success("Contact updated");
      setEditingId(null);
    } catch (err) {
      console.error(err);
      toast.error("Update failed");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // View contact
  const handleView = (id: string) => {
    setViewingId(viewingId === id ? null : id);
  };

  // Share contact
  const handleShare = async (contact: Contact) => {
    const shareData = {
      title: `Contact from ${contact.name}`,
      text: `Name: ${contact.name}\nEmail: ${contact.email}\nPhone: ${contact.phone || "N/A"}\nMessage: ${contact.message}\nDate: ${formatDate(contact.createdAt)}`,
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

  // Export CSV
  const exportToCSV = () => {
    const csv = Papa.unparse(filteredContacts.map(f => ({
      Name: f.name, Email: f.email, Phone: f.phone, Message: f.message, Date: formatDate(f.createdAt)
    })));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("CSV downloaded");
  };

  // Export PDF
  const exportToPDF = () => {
    const docPdf = new jsPDF();
    const pageWidth = docPdf.internal.pageSize.getWidth();

    const logoImg = new Image();
    logoImg.src = "/tibacare-logo.png";

    logoImg.onload = () => {
      const logoWidth = 40;
      const logoHeight = 20;
      const logoX = (pageWidth - logoWidth) / 2;
      docPdf.addImage(logoImg, "PNG", logoX, 15, logoWidth, logoHeight);

      docPdf.setFontSize(10);
      docPdf.setTextColor(100, 100, 100);
      const contactText = "Phone: +254 705 575 068 | Email: info@tibacare.com";
      const contactWidth = docPdf.getTextWidth(contactText);
      docPdf.text(contactText, (pageWidth - contactWidth) / 2, 40);

      docPdf.setDrawColor(200, 200, 200);
      docPdf.line(14, 45, pageWidth - 14, 45);

      docPdf.setFontSize(16);
      docPdf.setTextColor(0, 0, 0);
      docPdf.text("TibaCare - Contact Submissions", pageWidth / 2, 55, { align: "center" });

      autoTable(docPdf, {
        startY: 65,
        head: [["Name", "Email", "Phone", "Message", "Date"]],
        body: filteredContacts.map(f => [f.name, f.email, f.phone || "", f.message, formatDate(f.createdAt)]),
        theme: "grid",
        headStyles: { fillColor: [66, 139, 202] },
        margin: { top: 65 }
      });

      const finalY = (docPdf as any).lastAutoTable.finalY || 65;

      docPdf.setDrawColor(200, 200, 200);
      docPdf.line(14, finalY + 10, pageWidth - 14, finalY + 10);

      docPdf.setFontSize(9);
      docPdf.setTextColor(100, 100, 100);
      docPdf.text(`Issued on: ${new Date().toLocaleString()}`, pageWidth / 2, finalY + 20, { align: "center" });
      docPdf.text("© 2025 TibaCare. All rights reserved.", pageWidth / 2, finalY + 25, { align: "center" });
      docPdf.text("P.O. Box 20625 - 00200, Nairobi, Kenya", pageWidth / 2, finalY + 30, { align: "center" });
      docPdf.text("Phone: +254 705 575 068 | Email: info@tibacare.com", pageWidth / 2, finalY + 35, { align: "center" });
      docPdf.text("Your Trusted Telemedicine Partner", pageWidth / 2, finalY + 40, { align: "center" });

      docPdf.save(`contacts_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF downloaded");
    };
  };

  // Export single contact as PDF
  const exportSinglePDF = (contact: Contact) => {
    const docPdf = new jsPDF();
    const pageWidth = docPdf.internal.pageSize.getWidth();

    const logoImg = new Image();
    logoImg.src = "/tibacare-logo.png";

    logoImg.onload = () => {
      const logoWidth = 40;
      const logoHeight = 20;
      const logoX = (pageWidth - logoWidth) / 2;
      docPdf.addImage(logoImg, "PNG", logoX, 15, logoWidth, logoHeight);

      docPdf.setFontSize(10);
      docPdf.setTextColor(100, 100, 100);
      const contactText = "Phone: +254 705 575 068 | Email: info@tibacare.com";
      const contactWidth = docPdf.getTextWidth(contactText);
      docPdf.text(contactText, (pageWidth - contactWidth) / 2, 40);

      docPdf.setDrawColor(200, 200, 200);
      docPdf.line(14, 45, pageWidth - 14, 45);

      docPdf.setFontSize(16);
      docPdf.setTextColor(0, 0, 0);
      docPdf.text("TibaCare - Contact Details", pageWidth / 2, 55, { align: "center" });

      autoTable(docPdf, {
        startY: 65,
        body: [
          ["Name", contact.name],
          ["Email", contact.email],
          ["Phone", contact.phone || "N/A"],
          ["Message", { content: contact.message, rowSpan: 4 }],
          ["Date Submitted", formatDate(contact.createdAt)],
        ],
        theme: "grid",
        headStyles: { fillColor: [66, 139, 202] },
        margin: { top: 65 }
      });

      const finalY = (docPdf as any).lastAutoTable.finalY || 65;

      docPdf.setDrawColor(200, 200, 200);
      docPdf.line(14, finalY + 10, pageWidth - 14, finalY + 10);

      docPdf.setFontSize(9);
      docPdf.setTextColor(100, 100, 100);
      docPdf.text(`Issued on: ${new Date().toLocaleString()}`, pageWidth / 2, finalY + 20, { align: "center" });
      docPdf.text("© 2025 TibaCare. All rights reserved.", pageWidth / 2, finalY + 25, { align: "center" });
      docPdf.text("P.O. Box 20625 - 00200, Nairobi, Kenya", pageWidth / 2, finalY + 30, { align: "center" });
      docPdf.text("Phone: +254 705 575 068 | Email: info@tibacare.com", pageWidth / 2, finalY + 35, { align: "center" });
      docPdf.text("Your Trusted Telemedicine Partner", pageWidth / 2, finalY + 40, { align: "center" });

      docPdf.save(`contact_${contact.id}.pdf`);
      toast.success("Contact PDF downloaded");
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
          <h1 className="text-xl font-bold">📬 Contact Admin Portal</h1>
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
            placeholder="Search contacts..."
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
              {filteredContacts.map(contact => (
                <>
                  <tr key={contact.id} className="border-t hover:bg-gray-50">
                    <td className="p-2">{contact.name}</td>
                    <td className="p-2">{contact.email}</td>
                    <td className="p-2">{contact.phone || "N/A"}</td>
                    <td className="p-2 max-w-xs truncate">{contact.message}</td>
                    <td className="p-2">{formatDate(contact.createdAt)}</td>
                    <td className="p-2 space-x-1">
                      <button onClick={() => exportSinglePDF(contact)} className="text-blue-600 hover:underline">PDF</button>
                      <button onClick={() => handleDelete(contact.id)} className="text-red-600 hover:underline">Delete</button>
                      <button onClick={() => handleShare(contact)} className="text-green-600 hover:underline">Share</button>
                      <button onClick={() => handleEdit(contact)} className="text-yellow-600 hover:underline">Edit</button>
                      <button onClick={() => handleView(contact.id)} className="text-purple-600 hover:underline">
                        {viewingId === contact.id ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  
                  {/* Edit Form Row */}
                  {editingId === contact.id && (
                    <tr className="bg-yellow-50">
                      <td colSpan={6} className="p-4">
                        <div className="space-y-3">
                          <h3 className="font-bold">Edit Contact</h3>
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
                  {viewingId === contact.id && (
                    <tr className="bg-blue-50">
                      <td colSpan={6} className="p-4">
                        <div className="space-y-2">
                          <h3 className="font-bold">Contact Details</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <strong>Name:</strong> {contact.name}
                            </div>
                            <div>
                              <strong>Email:</strong> {contact.email}
                            </div>
                            <div>
                              <strong>Phone:</strong> {contact.phone || "N/A"}
                            </div>
                            <div>
                              <strong>Date:</strong> {formatDate(contact.createdAt)}
                            </div>
                            <div className="col-span-2">
                              <strong>Message:</strong>
                              <div className="mt-1 p-3 bg-white border rounded">
                                {contact.message}
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