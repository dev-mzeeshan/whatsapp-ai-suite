"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api";
import { useStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const setToken = useStore((s) => s.setToken);
  const setUser = useStore((s) => s.setUser);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await authAPI.login(email, password);
      const { access_token } = res.data;
      setToken(access_token);

      const meRes = await authAPI.me();
      setUser(meRes.data);

      router.push("/dashboard");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#00a884] mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.532 5.853L.057 23.571a.75.75 0 00.923.923l5.718-1.475A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.853 0-3.595-.484-5.103-1.333l-.361-.214-3.742.965.984-3.614-.234-.372A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
          </div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">
            ChatSetGo
          </h1>
          <p className="text-[#8696a0] text-sm mt-1">Business Dashboard</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#1f2c33] text-white placeholder-[#8696a0] rounded-lg px-4 py-3 text-sm border border-[#2a3942] focus:border-[#00a884] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#1f2c33] text-white placeholder-[#8696a0] rounded-lg px-4 py-3 text-sm border border-[#2a3942] focus:border-[#00a884] focus:outline-none transition-colors"
            />
          </div>
          <div className="text-right">
            <a href="/forgot-password" className="text-[#8696a0] hover:text-[#00a884] text-xs transition-colors">
                Forgot password?
            </a>
            </div>

          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00a884] hover:bg-[#02b48f] disabled:opacity-50 text-white font-medium py-3 rounded-lg text-sm transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}