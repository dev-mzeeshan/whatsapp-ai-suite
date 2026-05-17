// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { useStore } from "@/lib/store";
// import { authAPI } from "@/lib/api";
// import Sidebar from "@/components/Sidebar";
// import ChatWindow from "@/components/ChatWindow";

// export default function DashboardPage() {
//   const router = useRouter();
//   const setUser = useStore((s) => s.setUser);
//   const setToken = useStore((s) => s.setToken);
//   const user = useStore((s) => s.user);
//   const [ready, setReady] = useState(false);

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       router.push("/login");
//       return;
//     }
//     setToken(token);

//     // admin=true ya tenant_id ho to Super Admin conversations dekh raha hai
//     const params = new URLSearchParams(window.location.search);
//     const isAdminView = params.get("admin") === "true";

//     authAPI
//       .me()
//       .then((res) => {
//         setUser(res.data);
//         // Super Admin sirf tab redirect karo jab admin view nahi hai
//         if (res.data.role === "SUPER_ADMIN" && !isAdminView) {
//           router.push("/admin");
//         } else {
//           setReady(true);
//         }
//       })
//       .catch(() => router.push("/login"));
//   }, []); // eslint-disable-line

//   if (!ready || !user) {
//     return (
//       <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
//         <div className="w-6 h-6 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
//       </div>
//     );
//   }

//   return (
//     <div className="flex h-screen bg-[#0b1418] overflow-hidden">
//       <div className="w-[380px] flex-shrink-0 flex flex-col">
//         <Sidebar />
//       </div>
//       <ChatWindow />
//     </div>
//   );
// }

"use client";
 
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { authAPI } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import { Menu, X } from "lucide-react";
 
export default function DashboardPage() {
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);
  const setToken = useStore((s) => s.setToken);
  const user = useStore((s) => s.user);
  const activeConvId = useStore((s) => s.activeConvId);
  const setActiveConvId = useStore((s) => s.setActiveConvId);
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
 
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    setToken(token);
 
    const params = new URLSearchParams(window.location.search);
    const isAdminView = params.get("admin") === "true";
 
    authAPI.me()
      .then((res) => {
        setUser(res.data);
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
    <div className="flex h-screen h-[100dvh] bg-[#0b1418] overflow-hidden">
 
      {/* Mobile overlay */}
      {sidebarOpen && activeConvId && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
 
      {/* Sidebar */}
      <div className={`
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
        fixed md:relative z-30 md:z-auto
        w-[85vw] md:w-[380px]
        h-full flex-shrink-0 flex flex-col
        transition-transform duration-300 ease-in-out
      `}>
        <Sidebar onConversationSelect={() => setSidebarOpen(false)} />
      </div>
 
      {/* Chat window */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile top bar — show only when no conversation */}
        {!activeConvId && (
          <div className="md:hidden flex items-center px-4 py-3 bg-[#1f2c33] border-b border-[#2a3942]">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-[#8696a0] hover:text-white"
            >
              <Menu size={20} />
            </button>
            <span className="text-white font-medium text-sm ml-3">ChatSetGo</span>
          </div>
        )}
 
        <ChatWindow
          onBack={() => {
            setActiveConvId(null);
            setSidebarOpen(true);
          }}
        />
      </div>
    </div>
  );
}