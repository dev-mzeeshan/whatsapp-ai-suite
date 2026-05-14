"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { authAPI } from "@/lib/api";
import AdminPanel from "@/components/AdminPanel";

export default function AdminPage() {
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);
  const setToken = useStore((s) => s.setToken);
  const user = useStore((s) => s.user);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    setToken(token);
    authAPI.me()
      .then((res) => {
        setUser(res.data);
        if (res.data.role !== "SUPER_ADMIN") router.push("/dashboard");
      })
      .catch(() => router.push("/login"));
  }, [router, setToken, setUser]);

  if (!user) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return <AdminPanel />;
}