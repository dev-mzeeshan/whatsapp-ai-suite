"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#00a884] mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <h1 className="text-white text-xl font-semibold">Forgot Password</h1>
          <p className="text-[#8696a0] text-sm mt-2">Enter your email we will send a reset link</p>
        </div>

        {sent ? (
          <div className="bg-[#1f2c33] border border-[#2a3942] rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#00a884]/20 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00a884" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-white font-medium mb-1">Check your email</p>
            <p className="text-[#8696a0] text-sm mb-4">
              If this email exists, a reset link has been sent.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="w-full bg-[#2a3942] hover:bg-[#374c57] text-white py-2.5 rounded-lg text-sm transition-colors"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email" placeholder="Email address" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-[#1f2c33] text-white placeholder-[#8696a0] rounded-lg px-4 py-3 text-sm border border-[#2a3942] focus:border-[#00a884] focus:outline-none"
            />
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-[#00a884] hover:bg-[#02b48f] disabled:opacity-50 text-white font-medium py-3 rounded-lg text-sm transition-colors">
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <button type="button" onClick={() => router.push("/login")}
              className="w-full text-[#8696a0] hover:text-white py-2 text-sm transition-colors">
              Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}