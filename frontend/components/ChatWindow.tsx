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
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const convMessages = activeConvId ? messages[activeConvId] || [] : [];

  useConversationSocket(activeConvId);

  // Load messages
  useEffect(() => {
    if (!activeConvId) return;
    setLoadingMessages(true);
    setIsTyping(false);
    conversationsAPI
      .messages(activeConvId)
      .then((res) => setMessages(activeConvId, res.data))
      .finally(() => setLoadingMessages(false));
  }, [activeConvId, setMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!showScrollBtn) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [convMessages.length, isTyping]);

  // Scroll detection
  const handleScroll = useCallback(() => {
    if (!chatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 150);
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBtn(false);
  };

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

  if (!activeConvId || !activeConv) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0b1418]">
        <div className="w-16 h-16 rounded-2xl bg-[#1f2c33] flex items-center justify-center mb-4">
          <Phone size={28} className="text-[#8696a0]" />
        </div>
        <p className="text-[#8696a0] text-sm">Select a conversation to start</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0b1418] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1f2c33] border-b border-[#2a3942] flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="md:hidden text-[#8696a0] hover:text-white mr-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </button>
          )}
          <div className="w-9 h-9 rounded-full bg-[#2a3942] flex items-center justify-center text-[#8696a0] text-sm font-medium">
            {(activeConv.contact_name || activeConv.contact_wa_id).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-medium">
              {activeConv.contact_name || activeConv.contact_wa_id}
            </p>
            <p className="text-[#8696a0] text-xs">
              {isTyping ? (
                <span className="text-[#00a884]">typing...</span>
              ) : (
                `+${activeConv.contact_wa_id}`
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user?.role === "SUPER_ADMIN" && (
            <button
              onClick={() => window.location.href = "/admin"}
              className="flex items-center gap-1.5 text-xs text-[#8696a0] hover:text-white transition-colors border border-[#2a3942] px-3 py-1.5 rounded-lg"
            >
              ← Admin
            </button>
          )}
          <button
            onClick={handleToggleBot}
            disabled={toggling}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeConv.is_bot_active
                ? "bg-[#00a884]/20 text-[#00a884] hover:bg-[#00a884]/30"
                : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
            }`}
          >
            {activeConv.is_bot_active ? <Bot size={13} /> : <User size={13} />}
            {activeConv.is_bot_active ? "Bot Active" : "Manual"}
            <Power size={11} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #1f2c3308 1px, transparent 0)", backgroundSize: "24px 24px" }}
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

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start mb-2">
            <div className="bg-[#1f2c33] rounded-lg rounded-tl-none px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 w-10 h-10 bg-[#1f2c33] border border-[#2a3942] rounded-full flex items-center justify-center shadow-lg hover:bg-[#2a3942] transition-colors"
        >
          <ChevronDown size={18} className="text-[#8696a0]" />
        </button>
      )}

      {/* Reply box */}
      {!activeConv.is_bot_active ? (
        <form
          onSubmit={handleReply}
          className="flex items-center gap-3 px-4 py-3 bg-[#1f2c33] border-t border-[#2a3942] flex-shrink-0"
        >
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-[#2a3942] text-white placeholder-[#8696a0] rounded-lg px-4 py-2.5 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={sending || !reply.trim()}
            className="w-10 h-10 rounded-full bg-[#00a884] disabled:opacity-40 flex items-center justify-center hover:bg-[#02b48f] transition-opacity"
          >
            <Send size={16} className="text-white ml-0.5" />
          </button>
        </form>
      ) : (
        <div className="px-4 py-3 bg-[#1f2c33] border-t border-[#2a3942] flex-shrink-0">
          <p className="text-center text-[#8696a0] text-xs">
            Bot is handling this conversation — toggle to Manual to reply
          </p>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Date Separator                                                       //
// ------------------------------------------------------------------ //
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

// ------------------------------------------------------------------ //
//  Message Bubble                                                       //
// ------------------------------------------------------------------ //
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.sender_type === "USER";
  const isBot = msg.sender_type === "BOT";

  return (
    <div className={`flex ${isUser ? "justify-start" : "justify-end"} mb-1`}>
      <div
        className={`max-w-[65%] px-3 py-2 rounded-lg text-sm shadow-sm ${
          isUser
            ? "bg-[#1f2c33] text-white rounded-tl-none"
            : isBot
            ? "bg-[#005c4b] text-white rounded-tr-none"
            : "bg-[#2a4a7f] text-white rounded-tr-none"
        }`}
      >
        {/* Sender label */}
        {!isUser && (
          <div className="flex items-center gap-1 mb-0.5">
            {isBot ? (
              <Bot size={10} className="text-[#00a884]" />
            ) : (
              <User size={10} className="text-blue-400" />
            )}
            <span className={`text-[10px] font-medium ${isBot ? "text-[#00a884]" : "text-blue-400"}`}>
              {isBot ? "Bot" : "Agent"}
            </span>
          </div>
        )}

        <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>

        {/* Timestamp + ticks */}
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px] text-white/40">
            {format(new Date(msg.created_at), "hh:mm a")}
          </span>
          {!isUser && <MessageTick status={msg.status} />}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Message Ticks                                                        //
// ------------------------------------------------------------------ //
function MessageTick({ status }: { status: string }) {
  if (status === "SENT") {
    // Single grey tick
    return (
      <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
        <polyline points="1,5 4,8 9,2" stroke="#8696a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  if (status === "DELIVERED") {
    // Double grey ticks
    return (
      <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
        <polyline points="1,5 4,8 9,2" stroke="#8696a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="5,5 8,8 13,2" stroke="#8696a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  if (status === "READ") {
    // Double BLUE ticks
    return (
      <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
        <polyline points="1,5 4,8 9,2" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="5,5 8,8 13,2" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  if (status === "FAILED") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    );
  }

  return null;
}