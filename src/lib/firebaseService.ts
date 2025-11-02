import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/firebase";

export async function fetchCollection(collectionName: string) {
  const colRef = collection(db, collectionName);
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
