'use client';

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const ADMIN_EMAIL = "humphreykiboi1@gmail.com";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      let role: "admin" | "provider" | "patient" = "patient";
      
      if (user.email === ADMIN_EMAIL) {
        role = "admin";
        router.push("/admin"); 
      } else {
        role = "provider";
        router.push("/provider");
      }

    } catch (err: any) {
      console.error(err);
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
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
          disabled={isLoading}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="border p-2 rounded"
          disabled={isLoading}
        />
        {error && <p className="text-red-500">{error}</p>}
        <button 
          type="submit" 
          className="bg-blue-600 text-white p-2 rounded disabled:bg-blue-400"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}