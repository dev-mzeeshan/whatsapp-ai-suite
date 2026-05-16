"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Search, Bot, User } from "lucide-react";
import { conversationsAPI } from "@/lib/api";
import { useStore, Conversation } from "@/lib/store";
import { useSidebarSocket } from "@/lib/websocket";
import ProfileSettings from "./ProfileSettings";

export default function Sidebar() {
  const conversations = useStore((s) => s.conversations);
  const setConversations = useStore((s) => s.setConversations);
  const activeConvId = useStore((s) => s.activeConvId);
  const setActiveConvId = useStore((s) => s.setActiveConvId);
  const user = useStore((s) => s.user);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  // Sidebar WebSocket — real-time updates
  useSidebarSocket();

  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const tenantId = params.get("tenant_id");

    conversationsAPI
      .list(1, tenantId || undefined)
      .then((res) => setConversations(res.data))
      .finally(() => setLoading(false));
  }, [setConversations]);

  const filtered = conversations.filter((c) => {
    const name = c.contact_name || c.contact_wa_id;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-[#111b21] border-r border-[#2a3942]">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#2a3942]">
        <div>
          <h1 className="text-white font-semibold text-base">ChatSetGo</h1>
          <p className="text-[#8696a0] text-xs">{user?.full_name}</p>
        </div>
        {/* <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            user?.role === "SUPER_ADMIN"
              ? "bg-amber-500/20 text-amber-400"
              : "bg-[#00a884]/20 text-[#00a884]"
          }`}
        >
          {user?.role === "SUPER_ADMIN" ? "Admin" : "Operator"}
        </span> */}
        <div className="flex items-center gap-2">
          {user?.role === "SUPER_ADMIN" && (
            <button
              onClick={() => window.location.href = "/admin"}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors border border-amber-500/30 hover:border-amber-400/50 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg"
              title="Back to Admin Panel"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Admin Panel
            </button>
          )}

          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            user?.role === "SUPER_ADMIN"
              ? "bg-amber-500/20 text-amber-400"
              : "bg-[#00a884]/20 text-[#00a884]"
          }`}>
            {user?.role === "SUPER_ADMIN" ? "Admin" : "Operator"}
          </span>
          <button
            onClick={() => setShowProfile(true)}
            className="text-[#8696a0] hover:text-white transition-colors"
            title="Profile Settings"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
          <button
            onClick={() => {
              useStore.getState().logout();
              window.location.href = "/login";
            }}
            className="text-[#8696a0] hover:text-red-400 transition-colors"
            title="Logout"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
        {showProfile && (
          <ProfileSettings onClose={() => setShowProfile(false)} />
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 bg-[#2a3942] rounded-lg px-3 py-2">
          <Search size={14} className="text-[#8696a0]" />
          <input
            type="text"
            placeholder="Search conversations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-white placeholder-[#8696a0] text-sm flex-1 outline-none"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center text-[#8696a0] text-sm py-12 px-4">
            No conversations yet
          </div>
        )}

        {filtered.map((conv) => (
          <ConversationItem
            key={conv.id}
            conv={conv}
            isActive={conv.id === activeConvId}
            onClick={() => {
              setActiveConvId(conv.id);
              conversationsAPI.markRead(conv.id).catch(() => {});
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ConversationItem({
  conv,
  isActive,
  onClick,
}: {
  conv: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  const initials = (conv.contact_name || conv.contact_wa_id)
    .slice(0, 2)
    .toUpperCase();

  const timeAgo = conv.last_message_at
    ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })
        .replace("about ", "")
        .replace(" minutes", "m")
        .replace(" minute", "m")
        .replace(" hours", "h")
        .replace(" hour", "h")
        .replace(" days", "d")
        .replace(" day", "d")
    : "";

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors hover:bg-[#1f2c33] ${
        isActive ? "bg-[#2a3942]" : ""
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-[#2a3942] flex items-center justify-center text-[#8696a0] text-sm font-medium">
          {initials}
        </div>
        {/* Bot/Manual indicator */}
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#111b21] flex items-center justify-center ${
            conv.is_bot_active ? "bg-[#00a884]" : "bg-amber-500"
          }`}
        >
          {conv.is_bot_active ? (
            <Bot size={7} className="text-white" />
          ) : (
            <User size={7} className="text-white" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-medium truncate">
            {conv.contact_name || conv.contact_wa_id}
          </span>
          {timeAgo && (
            <span className="text-[#8696a0] text-xs ml-2 flex-shrink-0">
              {timeAgo}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[#8696a0] text-xs truncate">
            {conv.last_message_preview || "No messages yet"}
          </span>
          {conv.unread_count > 0 && (
            <span className="ml-2 flex-shrink-0 w-4 h-4 rounded-full bg-[#00a884] text-white text-[10px] flex items-center justify-center font-medium">
              {conv.unread_count > 9 ? "9+" : conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}