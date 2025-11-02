'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login?redirect=/admin");
        return;
      }

      // Force refresh token to get latest claims
      const tokenResult = await user.getIdTokenResult(true);
      const role = tokenResult.claims.role;

      if (role !== "admin") {
        alert("Access denied: Only admins can access this page.");
        router.push("/login");
        return;
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) return <p className="text-center mt-20">Loading...</p>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-blue-800">Welcome, Admin!</h1>
      {/* Your admin dashboard contents go here */}
    </div>
  );
}
