'use client';
import { useState } from "react";
import { auth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const ADMIN_EMAIL = "humphreykiboi1@gmail.com";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Determine role
      let role: "admin" | "provider" | "patient" = "patient";
      if (user.email === ADMIN_EMAIL) {
        role = "admin";
      } else {
        role = "provider"; // default provider
      }

      // 🔑 New Logic: Admin can log in anywhere (no forced redirect)
      if (role === "admin") {
        router.push(redirect); 
      } else if (role === "provider") {
        if (redirect.includes("/admin")) {
          alert("❌ Access Denied: Providers cannot access Admin Panel");
          router.push("/provider"); 
        } else {
          router.push(redirect.includes("/provider") ? redirect : "/provider");
        }
      } else {
        router.push("/patient");
      }

    } catch (err) {
      console.error(err);
      setError("Invalid email or password");
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow mt-20">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="border p-2 rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="border p-2 rounded"
        />
        {error && <p className="text-red-500">{error}</p>}
        <button type="submit" className="bg-blue-600 text-white p-2 rounded">
          Login
        </button>
      </form>
    </div>
  );
}