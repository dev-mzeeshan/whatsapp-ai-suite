"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { authAPI } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";

export default function DashboardPage() {
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);
  const setToken = useStore((s) => s.setToken);
  const user = useStore((s) => s.user);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    setToken(token);

    // admin=true ya tenant_id ho to Super Admin conversations dekh raha hai
    const params = new URLSearchParams(window.location.search);
    const isAdminView = params.get("admin") === "true";

    authAPI
      .me()
      .then((res) => {
        setUser(res.data);
        // Super Admin sirf tab redirect karo jab admin view nahi hai
        if (res.data.role === "SUPER_ADMIN" && !isAdminView) {
          router.push("/admin");
        } else {
          setReady(true);
        }
      })
      .catch(() => router.push("/login"));
  }, []); // eslint-disable-line

  if (!ready || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0b1418] overflow-hidden">
      <div className="w-[380px] flex-shrink-0 flex flex-col">
        <Sidebar />
      </div>
      <ChatWindow />
    </div>
  );
}