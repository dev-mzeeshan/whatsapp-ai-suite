"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link — no token found.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Reset failed — link may have expired.");
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
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 className="text-white text-xl font-semibold">Set New Password</h1>
          <p className="text-[#8696a0] text-sm mt-2">Choose a strong password</p>
        </div>

        {done ? (
          <div className="bg-[#1f2c33] border border-[#2a3942] rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#00a884]/20 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00a884" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-white font-medium mb-1">Password Changed!</p>
            <p className="text-[#8696a0] text-sm mb-4">You can now login with your new password.</p>
            <button onClick={() => router.push("/login")}
              className="w-full bg-[#00a884] hover:bg-[#02b48f] text-white py-2.5 rounded-lg text-sm transition-colors">
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="password" placeholder="New password (min 8 chars)" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              className="w-full bg-[#1f2c33] text-white placeholder-[#8696a0] rounded-lg px-4 py-3 text-sm border border-[#2a3942] focus:border-[#00a884] focus:outline-none"
            />
            <input type="password" placeholder="Confirm new password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} required
              className="w-full bg-[#1f2c33] text-white placeholder-[#8696a0] rounded-lg px-4 py-3 text-sm border border-[#2a3942] focus:border-[#00a884] focus:outline-none"
            />
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <button type="submit" disabled={loading || !token}
              className="w-full bg-[#00a884] hover:bg-[#02b48f] disabled:opacity-50 text-white font-medium py-3 rounded-lg text-sm transition-colors">
              {loading ? "Saving..." : "Set New Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
    </div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}