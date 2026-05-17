// "use client";

// import { useEffect, useRef, useState } from "react";
// import { format } from "date-fns";
// import { Bot, User, Send, Power, Phone } from "lucide-react";
// import { conversationsAPI } from "@/lib/api";
// import { useStore, Message } from "@/lib/store";
// import { useConversationSocket } from "@/lib/websocket";

// export default function ChatWindow() {
//   const activeConvId = useStore((s) => s.activeConvId);
//   const conversations = useStore((s) => s.conversations);
//   const messages = useStore((s) => s.messages);
//   const setMessages = useStore((s) => s.setMessages);
//   const updateConversation = useStore((s) => s.updateConversation);

//   const [reply, setReply] = useState("");
//   const [sending, setSending] = useState(false);
//   const [toggling, setToggling] = useState(false);
//   const [loadingMessages, setLoadingMessages] = useState(false);
//   const bottomRef = useRef<HTMLDivElement>(null);

//   const activeConv = conversations.find((c) => c.id === activeConvId);
//   const convMessages = activeConvId ? messages[activeConvId] || [] : [];

//   const user = useStore((s) => s.user);

//   // WebSocket for this conversation
//   useConversationSocket(activeConvId);

//   // Load messages when conversation changes
//   useEffect(() => {
//     if (!activeConvId) return;
//     setLoadingMessages(true);
//     conversationsAPI
//       .messages(activeConvId)
//       .then((res) => setMessages(activeConvId, res.data))
//       .finally(() => setLoadingMessages(false));
//   }, [activeConvId, setMessages]);

//   // Scroll to bottom on new messages
//   useEffect(() => {
//     bottomRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [convMessages.length]);

//   const handleToggleBot = async () => {
//     if (!activeConvId || toggling) return;
//     setToggling(true);
//     try {
//       const res = await conversationsAPI.toggleBot(activeConvId);
//       updateConversation(activeConvId, {
//         is_bot_active: res.data.is_bot_active,
//       });
//     } finally {
//       setToggling(false);
//     }
//   };

//   const handleReply = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!activeConvId || !reply.trim() || sending) return;
//     setSending(true);
//     try {
//       await conversationsAPI.reply(activeConvId, reply.trim());
//       setReply("");
//     } finally {
//       setSending(false);
//     }
//   };

//   // No conversation selected
//   if (!activeConvId || !activeConv) {
//     return (
//       <div className="flex-1 flex flex-col items-center justify-center bg-[#0b1418]">
//         <div className="w-16 h-16 rounded-2xl bg-[#1f2c33] flex items-center justify-center mb-4">
//           <Phone size={28} className="text-[#8696a0]" />
//         </div>
//         <p className="text-[#8696a0] text-sm">
//           Select a conversation to start
//         </p>
//       </div>
//     );
//   }

//   return (
//     <div className="flex-1 flex flex-col bg-[#0b1418] overflow-hidden">
//       {/* Header */}
//       <div className="flex items-center justify-between px-4 py-3 bg-[#1f2c33] border-b border-[#2a3942]">
//         <div className="flex items-center gap-3">
//           <div className="w-9 h-9 rounded-full bg-[#2a3942] flex items-center justify-center text-[#8696a0] text-sm font-medium">
//             {(activeConv.contact_name || activeConv.contact_wa_id)
//               .slice(0, 2)
//               .toUpperCase()}
//           </div>
//           <div>
//             <p className="text-white text-sm font-medium">
//               {activeConv.contact_name || activeConv.contact_wa_id}
//             </p>
//             <p className="text-[#8696a0] text-xs">
//               +{activeConv.contact_wa_id}
//             </p>
//           </div>
//         </div>
//         {user?.role === "SUPER_ADMIN" && (
//           <button
//             onClick={() => window.location.href = "/admin"}
//             className="flex items-center gap-1.5 text-xs text-[#8696a0] hover:text-white transition-colors border border-[#2a3942] px-3 py-1.5 rounded-lg"
//           >
//             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//               <path d="M19 12H5M12 5l-7 7 7 7"/>
//             </svg>
//             Admin Panel
//           </button>
//         )}

//         {/* Bot toggle */}
//         <button
//           onClick={handleToggleBot}
//           disabled={toggling}
//           className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
//             activeConv.is_bot_active
//               ? "bg-[#00a884]/20 text-[#00a884] hover:bg-[#00a884]/30"
//               : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
//           }`}
//         >
//           {activeConv.is_bot_active ? (
//             <Bot size={13} />
//           ) : (
//             <User size={13} />
//           )}
//           {activeConv.is_bot_active ? "Bot Active" : "Manual Mode"}
//           <Power size={11} />
//         </button>
//       </div>

//       {/* Messages */}
//       <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
//         {loadingMessages && (
//           <div className="flex justify-center py-8">
//             <div className="w-5 h-5 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
//           </div>
//         )}

//         {!loadingMessages && convMessages.length === 0 && (
//           <div className="text-center text-[#8696a0] text-sm py-12">
//             No messages yet
//           </div>
//         )}

//         {convMessages.map((msg, i) => {
//           const prev = convMessages[i - 1];
//           const showDate =
//             !prev ||
//             new Date(msg.created_at).toDateString() !==
//               new Date(prev.created_at).toDateString();

//           return (
//             <div key={msg.id}>
//               {showDate && (
//                 <div className="flex justify-center my-3">
//                   <span className="bg-[#1f2c33] text-[#8696a0] text-xs px-3 py-1 rounded-full">
//                     {format(new Date(msg.created_at), "MMMM d, yyyy")}
//                   </span>
//                 </div>
//               )}
//               <MessageBubble msg={msg} />
//             </div>
//           );
//         })}
//         <div ref={bottomRef} />
//       </div>

//       {/* Reply box — sirf manual mode mein */}
//       {!activeConv.is_bot_active ? (
//         <form
//           onSubmit={handleReply}
//           className="flex items-center gap-3 px-4 py-3 bg-[#1f2c33] border-t border-[#2a3942]"
//         >
//           <input
//             value={reply}
//             onChange={(e) => setReply(e.target.value)}
//             placeholder="Type a message..."
//             className="flex-1 bg-[#2a3942] text-white placeholder-[#8696a0] rounded-lg px-4 py-2.5 text-sm outline-none"
//           />
//           <button
//             type="submit"
//             disabled={sending || !reply.trim()}
//             className="w-10 h-10 rounded-full bg-[#00a884] disabled:opacity-40 flex items-center justify-center transition-opacity hover:bg-[#02b48f]"
//           >
//             <Send size={16} className="text-white ml-0.5" />
//           </button>
//         </form>
//       ) : (
//         <div className="px-4 py-3 bg-[#1f2c33] border-t border-[#2a3942]">
//           <p className="text-center text-[#8696a0] text-xs">
//             Bot is handling this conversation - toggle to Manual to reply
//           </p>
//         </div>
//       )}
//     </div>
//   );
// }

// function MessageBubble({ msg }: { msg: Message }) {
//   const isUser = msg.sender_type === "USER";
//   const isBot = msg.sender_type === "BOT";
//   const isAgent = msg.sender_type === "AGENT";

//   return (
//     <div className={`flex ${isUser ? "justify-start" : "justify-end"} mb-1`}>
//       <div
//         className={`max-w-[65%] px-3 py-2 rounded-lg text-sm ${
//           isUser
//             ? "bg-[#1f2c33] text-white rounded-tl-none"
//             : isBot
//             ? "bg-[#005c4b] text-white rounded-tr-none"
//             : "bg-[#2a4a7f] text-white rounded-tr-none"
//         }`}
//       >
//         {/* Sender label for non-user */}
//         {!isUser && (
//           <div className="flex items-center gap-1 mb-0.5">
//             {isBot ? (
//               <Bot size={10} className="text-[#00a884]" />
//             ) : (
//               <User size={10} className="text-blue-400" />
//             )}
//             <span
//               className={`text-[10px] font-medium ${
//                 isBot ? "text-[#00a884]" : "text-blue-400"
//               }`}
//             >
//               {isBot ? "Bot" : "Agent"}
//             </span>
//           </div>
//         )}

//         <p className="leading-relaxed whitespace-pre-wrap break-words">
//           {msg.content}
//         </p>

//         <div className="flex items-center justify-end gap-1 mt-1">
//           <span className="text-[10px] text-white/40">
//             {format(new Date(msg.created_at), "HH:mm")}
//           </span>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Bot, User, Send, Power, Phone, ChevronDown } from "lucide-react";
import { conversationsAPI } from "@/lib/api";
import { useStore, Message } from "@/lib/store";
import { useConversationSocket } from "@/lib/websocket";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({ onBack }: { onBack?: () => void }) {
  const activeConvId = useStore((s) => s.activeConvId);
  const conversations = useStore((s) => s.conversations);
  const messages = useStore((s) => s.messages);
  const setMessages = useStore((s) => s.setMessages);
  const updateConversation = useStore((s) => s.updateConversation);
  const user = useStore((s) => s.user);

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const convMessages = activeConvId ? messages[activeConvId] || [] : [];

  useConversationSocket(activeConvId);

  useEffect(() => {
    if (!activeConvId) return;
    setLoadingMessages(true);
    conversationsAPI
      .messages(activeConvId)
      .then((res) => setMessages(activeConvId, res.data))
      .finally(() => setLoadingMessages(false));
  }, [activeConvId, setMessages]);

  useEffect(() => {
    if (!showScrollBtn) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [convMessages.length]);

  const handleScroll = useCallback(() => {
    if (!chatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 150);
  }, []);

  const handleToggleBot = async () => {
    if (!activeConvId || toggling) return;
    setToggling(true);
    try {
      const res = await conversationsAPI.toggleBot(activeConvId);
      updateConversation(activeConvId, { is_bot_active: res.data.is_bot_active });
    } finally {
      setToggling(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId || !reply.trim() || sending) return;
    setSending(true);
    const text = reply.trim();
    setReply("");
    try {
      await conversationsAPI.reply(activeConvId, text);
    } finally {
      setSending(false);
    }
  };

  // Empty state
  if (!activeConvId || !activeConv) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0b1418] h-full">
        <div className="w-16 h-16 rounded-2xl bg-[#1f2c33] flex items-center justify-center mb-4">
          <Phone size={28} className="text-[#8696a0]" />
        </div>
        <p className="text-[#8696a0] text-sm">Select a conversation to start</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0b1418] overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 bg-[#1f2c33] border-b border-[#2a3942] flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Back button — mobile */}
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden text-[#8696a0] hover:text-white flex-shrink-0 p-1 -ml-1"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
          )}

          <div className="w-9 h-9 rounded-full bg-[#2a3942] flex items-center justify-center text-[#8696a0] text-sm font-medium flex-shrink-0">
            {(activeConv.contact_name || activeConv.contact_wa_id).slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {activeConv.contact_name || activeConv.contact_wa_id}
            </p>
            <p className="text-[#8696a0] text-xs truncate">
              +{activeConv.contact_wa_id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {user?.role === "SUPER_ADMIN" && (
            <button
              onClick={() => window.location.href = "/admin"}
              className="hidden sm:flex items-center gap-1.5 text-xs text-[#8696a0] hover:text-white border border-[#2a3942] px-2 py-1.5 rounded-lg transition-colors"
            >
              ← Admin
            </button>
          )}
          <button
            onClick={handleToggleBot}
            disabled={toggling}
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeConv.is_bot_active
                ? "bg-[#00a884]/20 text-[#00a884] hover:bg-[#00a884]/30"
                : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
            }`}
          >
            {activeConv.is_bot_active ? <Bot size={13} /> : <User size={13} />}
            <span className="hidden sm:inline">
              {activeConv.is_bot_active ? "Bot Active" : "Manual"}
            </span>
            <Power size={11} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #1f2c3308 1px, transparent 0)",
          backgroundSize: "24px 24px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {loadingMessages && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loadingMessages && convMessages.length === 0 && (
          <div className="text-center text-[#8696a0] text-sm py-12">No messages yet</div>
        )}

        {convMessages.map((msg, i) => {
          const prev = convMessages[i - 1];
          const showDate =
            !prev ||
            new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();
          return (
            <div key={msg.id}>
              {showDate && <DateSeparator date={new Date(msg.created_at)} />}
              <MessageBubble msg={msg} />
            </div>
          );
        })}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Scroll to bottom */}
      {showScrollBtn && (
        <div className="absolute bottom-20 right-4 sm:right-6">
          <button
            onClick={() => {
              bottomRef.current?.scrollIntoView({ behavior: "smooth" });
              setShowScrollBtn(false);
            }}
            className="w-10 h-10 bg-[#1f2c33] border border-[#2a3942] rounded-full flex items-center justify-center shadow-lg hover:bg-[#2a3942] transition-colors"
          >
            <ChevronDown size={18} className="text-[#8696a0]" />
          </button>
        </div>
      )}

      {/* Reply box */}
      {!activeConv.is_bot_active ? (
        <form
          onSubmit={handleReply}
          className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 bg-[#1f2c33] border-t border-[#2a3942] flex-shrink-0"
        >
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-[#2a3942] text-white placeholder-[#8696a0] rounded-lg px-3 sm:px-4 py-2.5 text-sm outline-none"
            style={{ fontSize: "16px" }} // Prevents iOS zoom on focus
          />
          <button
            type="submit"
            disabled={sending || !reply.trim()}
            className="w-10 h-10 rounded-full bg-[#00a884] disabled:opacity-40 flex items-center justify-center hover:bg-[#02b48f] transition-all active:scale-95 flex-shrink-0"
          >
            <Send size={16} className="text-white ml-0.5" />
          </button>
        </form>
      ) : (
        <div className="px-4 py-3 bg-[#1f2c33] border-t border-[#2a3942] flex-shrink-0">
          <p className="text-center text-[#8696a0] text-xs">
            Bot is active — toggle to Manual mode to reply
          </p>
        </div>
      )}
    </div>
  );
}

function DateSeparator({ date }: { date: Date }) {
  let label = format(date, "MMMM d, yyyy");
  if (isToday(date)) label = "Today";
  else if (isYesterday(date)) label = "Yesterday";
  return (
    <div className="flex justify-center my-4">
      <span className="bg-[#1f2c33] text-[#8696a0] text-xs px-3 py-1 rounded-full border border-[#2a3942]">
        {label}
      </span>
    </div>
  );
}