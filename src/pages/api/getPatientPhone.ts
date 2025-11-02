// src/pages/api/getPatientPhone.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: "Missing patient name" });

  const q = query(collection(db, "preconsultations"), where("name", "==", name));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return res.status(404).json({ error: "Patient not found" });

  const patient = snapshot.docs[0].data();
  return res.status(200).json({ phone: patient.phone || null });
}
