"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";
import jsPDF from "jspdf";

type Consultation = { id: string; providerName: string; serviceType?: string; date?: any };
type Feedback = { id: string; createdAt?: any };
type Billing = { id: string; amount: number; date?: any };
type Patient = { id: string; createdAt?: any };

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28CFE", "#FF4F81"];

export default function AnalyticsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setLoading(true);

    const unsubConsult = onSnapshot(collection(db, "consultations"), (snap) => {
      setConsultations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Consultation)));
    });

    const unsubFeedback = onSnapshot(collection(db, "feedback"), (snap) => {
      setFeedbacks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback)));
    });

    const unsubBilling = onSnapshot(collection(db, "billing"), (snap) => {
      setBillings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Billing)));
    });

    const unsubPatients = onSnapshot(collection(db, "patients"), (snap) => {
      setPatients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    });

    // Set a timeout to handle cases where data might take time to load
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => {
      unsubConsult();
      unsubFeedback();
      unsubBilling();
      unsubPatients();
      clearTimeout(timer);
    };
  }, []);

  // 🔎 Date range filter - handles both string dates and Firestore Timestamps
  const filterByDate = (dateValue: any) => {
    if (!dateValue) return false;
    
    let date: Date;
    
    // Handle Firestore Timestamp objects
    if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
      date = dateValue.toDate();
    } 
    // Handle string dates
    else if (typeof dateValue === 'string') {
      date = new Date(dateValue.split("T")[0]);
    } 
    // Handle other cases (like already Date objects)
    else {
      date = new Date(dateValue);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) return false;
    
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    
    if (from && date < from) return false;
    if (to && date > to) return false;
    
    return true;
  };

  const filteredConsultations = consultations.filter(c => filterByDate(c.date));
  const filteredBillings = billings.filter(b => filterByDate(b.date));
  const filteredPatients = patients.filter(p => filterByDate(p.createdAt));
  const filteredFeedbacks = feedbacks.filter(f => filterByDate(f.createdAt));

  // Format date for display - handles both string dates and Firestore Timestamps
  const formatDate = (dateValue: any): string => {
    if (!dateValue) return "Unknown";
    
    let date: Date;
    
    // Handle Firestore Timestamp objects
    if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
      date = dateValue.toDate();
    } 
    // Handle string dates
    else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } 
    // Handle other cases
    else {
      date = new Date(dateValue);
    }
    
    if (isNaN(date.getTime())) return "Unknown";
    
    return date.toISOString().split("T")[0];
  };

  // 📊 Aggregations
  const providerData = filteredConsultations.reduce((acc: { name: string; value: number }[], curr) => {
    const existing = acc.find(a => a.name === curr.providerName);
    if (existing) existing.value += 1;
    else acc.push({ name: curr.providerName, value: 1 });
    return acc;
  }, []);

  const serviceData = filteredConsultations.reduce((acc: { name: string; value: number }[], curr) => {
    const key = curr.serviceType || "Other";
    const existing = acc.find(a => a.name === key);
    if (existing) existing.value += 1;
    else acc.push({ name: key, value: 1 });
    return acc;
  }, []);

  const consultationsByDate = filteredConsultations.reduce((acc: Record<string, number>, curr) => {
    const date = formatDate(curr.date);
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});
  const consultationsTrend = Object.entries(consultationsByDate).map(([date, value]) => ({ date, value }));

  const patientsByDate = filteredPatients.reduce((acc: Record<string, number>, curr) => {
    const date = formatDate(curr.createdAt);
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});
  const patientTrend = Object.entries(patientsByDate).map(([date, value]) => ({ date, value }));

  const billingByDate = filteredBillings.reduce((acc: Record<string, number>, curr) => {
    const date = formatDate(curr.date);
    const amount = curr.amount || 0;
    acc[date] = (acc[date] || 0) + amount;
    return acc;
  }, {});
  const billingTrend = Object.entries(billingByDate).map(([date, value]) => ({ date, value }));

  const totalBilling = filteredBillings.reduce((sum, b) => sum + (b.amount || 0), 0);

  // 📑 Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("TibaCare Analytics Report", 20, 20);
    doc.setFontSize(12);
    
    // Add date range info if filters are applied
    if (dateFrom || dateTo) {
      doc.text(`Date Range: ${dateFrom || 'Start'} to ${dateTo || 'End'}`, 20, 30);
      doc.text(`Total Consultations: ${filteredConsultations.length}`, 20, 45);
      doc.text(`Total Feedbacks: ${filteredFeedbacks.length}`, 20, 55);
      doc.text(`Total Billing: Ksh ${totalBilling.toLocaleString()}`, 20, 65);
      doc.text(`Total Patients: ${filteredPatients.length}`, 20, 75);
    } else {
      doc.text(`Total Consultations: ${filteredConsultations.length}`, 20, 35);
      doc.text(`Total Feedbacks: ${filteredFeedbacks.length}`, 20, 45);
      doc.text(`Total Billing: Ksh ${totalBilling.toLocaleString()}`, 20, 55);
      doc.text(`Total Patients: ${filteredPatients.length}`, 20, 65);
    }
    
    doc.save("tibacare-analytics.pdf");
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold text-blue-600">Analytics Dashboard</h1>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <span>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <button
            onClick={exportPDF}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow"
          >
            Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-lg">Loading analytics data...</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-4 rounded shadow text-center">
              <h2 className="font-bold text-lg">Consultations</h2>
              <p className="text-2xl">{filteredConsultations.length}</p>
              <p className="text-sm text-gray-500">{consultations.length} total</p>
            </div>
            <div className="bg-white p-4 rounded shadow text-center">
              <h2 className="font-bold text-lg">Feedbacks</h2>
              <p className="text-2xl">{filteredFeedbacks.length}</p>
              <p className="text-sm text-gray-500">{feedbacks.length} total</p>
            </div>
            <div className="bg-white p-4 rounded shadow text-center">
              <h2 className="font-bold text-lg">Billing</h2>
              <p className="text-2xl">Ksh {totalBilling.toLocaleString()}</p>
              <p className="text-sm text-gray-500">{filteredBillings.length} transactions</p>
            </div>
            <div className="bg-white p-4 rounded shadow text-center">
              <h2 className="font-bold text-lg">Patients</h2>
              <p className="text-2xl">{filteredPatients.length}</p>
              <p className="text-sm text-gray-500">{patients.length} total</p>
            </div>
          </div>

          {/* Date filter info */}
          {(dateFrom || dateTo) && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-blue-700 text-sm">
                Showing data from {dateFrom || 'the beginning'} to {dateTo || 'now'}
              </p>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Provider Pie */}
            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-bold text-lg mb-2">Consultations per Provider</h2>
              {providerData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={providerData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {providerData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <p className="text-gray-500">No consultation data available</p>
                </div>
              )}
            </div>

            {/* Service Pie */}
            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-bold text-lg mb-2">Service Breakdown</h2>
              {serviceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={serviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {serviceData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <p className="text-gray-500">No service data available</p>
                </div>
              )}
            </div>

            {/* Consultations Trend */}
            <div className="bg-white p-4 rounded shadow md:col-span-2">
              <h2 className="font-bold text-lg mb-2">Consultations Trend</h2>
              {consultationsTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={consultationsTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#0088FE" name="Consultations" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <p className="text-gray-500">No consultation trend data available</p>
                </div>
              )}
            </div>

            {/* Patient Growth */}
            <div className="bg-white p-4 rounded shadow md:col-span-2">
              <h2 className="font-bold text-lg mb-2">Patient Growth</h2>
              {patientTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={patientTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#00C49F" name="New Patients" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <p className="text-gray-500">No patient growth data available</p>
                </div>
              )}
            </div>

            {/* Billing */}
            <div className="bg-white p-4 rounded shadow md:col-span-2">
              <h2 className="font-bold text-lg mb-2">Revenue Trend</h2>
              {billingTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={billingTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`Ksh ${value}`, 'Revenue']} />
                    <Legend />
                    <Bar dataKey="value" fill="#FFBB28" name="Daily Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <p className="text-gray-500">No revenue data available</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}