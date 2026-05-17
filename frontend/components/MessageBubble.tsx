"use client";

import { format } from "date-fns";
import { Bot, User, FileText, Download, MapPin, Mic, PlayCircle } from "lucide-react";
import { Message } from "@/lib/store";

// ------------------------------------------------------------------ //
//  Tick SVGs                                                           //
// ------------------------------------------------------------------ //
function MessageTick({ status }: { status: string }) {
  if (status === "SENT") return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
      <polyline points="1,5 4,8 9,2" stroke="#8696a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (status === "DELIVERED") return (
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
      <polyline points="1,5 4,8 9,2" stroke="#8696a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="5,5 8,8 13,2" stroke="#8696a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (status === "READ") return (
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
      <polyline points="1,5 4,8 9,2" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="5,5 8,8 13,2" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (status === "FAILED") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
  return null;
}

// ------------------------------------------------------------------ //
//  Link detection — handles URLs with or without https://             //
// ------------------------------------------------------------------ //
function detectLinks(text: string) {
  // Matches http(s):// URLs and also bare domains like chatsetgo.tech
  const urlRegex = /(https?:\/\/[^\s]+|(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      const href = part.startsWith("http") ? part : `https://${part}`;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#53bdeb] underline hover:text-blue-300 break-all"
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ------------------------------------------------------------------ //
//  Image                                                               //
// ------------------------------------------------------------------ //
function ImageMessage({ content, caption }: { content: string; caption?: string }) {
  const isUrl = content.startsWith("http");

  if (isUrl) {
    return (
      <div className="mb-1">
        <img
          src={content}
          alt="Image"
          className="rounded-lg max-w-[220px] w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.open(content, "_blank")}
          onError={(e) => {
            // If image fails (Meta auth required), show placeholder
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            const placeholder = target.nextSibling as HTMLElement;
            if (placeholder) placeholder.style.display = "flex";
          }}
        />
        {/* Fallback for auth-required Meta images */}
        <div
          className="hidden items-center gap-2 bg-white/10 rounded-lg px-3 py-3 cursor-pointer hover:bg-white/20"
          onClick={() => window.open(content, "_blank")}
        >
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <div>
            <div className="text-sm text-white">📷 Photo</div>
            <div className="text-xs text-white/50">Tap to view</div>
          </div>
        </div>
        {caption && <p className="text-sm text-white mt-1">{detectLinks(caption)}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-3 mb-1">
      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>
      <div>
        <div className="text-sm text-white">📷 Photo</div>
        {content && <div className="text-xs text-white/60 mt-0.5">{content}</div>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Audio / Voice Note                                                  //
// ------------------------------------------------------------------ //
function AudioMessage({ content }: { content: string }) {
  // Meta audio URLs require auth — show WhatsApp-style waveform UI
  return (
    <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-3 py-2.5 min-w-[200px] mb-1">
      <div className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center flex-shrink-0">
        <Mic size={16} className="text-white" />
      </div>
      <div className="flex-1">
        {/* Waveform visualization */}
        <div className="flex gap-0.5 items-center h-6">
          {Array.from({ length: 28 }).map((_, i) => {
            const heights = [3,5,8,12,7,10,15,8,5,9,13,7,11,6,9,14,8,6,10,13,7,5,9,12,8,6,4,3];
            return (
              <div
                key={i}
                className="w-0.5 bg-[#00a884] rounded-full opacity-70"
                style={{ height: `${heights[i] || 4}px` }}
              />
            );
          })}
        </div>
        <div className="text-[10px] text-white/40 mt-0.5">Voice message</div>
      </div>
      {/* Play button — opens in new tab if URL available */}
      {content.startsWith("http") && (
        <button
          onClick={() => window.open(content, "_blank")}
          className="text-white/60 hover:text-white transition-colors"
          title="Open audio"
        >
          <PlayCircle size={20} />
        </button>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Video                                                               //
// ------------------------------------------------------------------ //
function VideoMessage({ content, caption }: { content: string; caption?: string }) {
  const isUrl = content.startsWith("http");

  return (
    <div className="mb-1">
      <div
        className="relative bg-black rounded-lg overflow-hidden cursor-pointer group"
        style={{ maxWidth: "220px", minHeight: "120px" }}
        onClick={() => isUrl && window.open(content, "_blank")}
      >
        <div className="flex items-center justify-center h-32 bg-[#1a1a1a] rounded-lg">
          {/* Play button overlay */}
          <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center group-hover:bg-black/80 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          </div>
        </div>
        <div className="absolute bottom-2 left-2 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
          <span className="text-white text-[10px]">Video</span>
        </div>
      </div>
      {caption && <p className="text-sm text-white mt-1">{detectLinks(caption)}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Document                                                            //
// ------------------------------------------------------------------ //
function DocumentMessage({ content, filename }: { content: string; filename?: string }) {
  const isUrl = content.startsWith("http");
  const displayName = filename || (isUrl ? decodeURIComponent(content.split("/").pop()?.split("?")[0] || "Document") : content);
  const ext = displayName.split(".").pop()?.toUpperCase() || "FILE";

  const extColors: Record<string, string> = {
    PDF: "bg-red-500/30 text-red-300",
    DOC: "bg-blue-500/30 text-blue-300",
    DOCX: "bg-blue-500/30 text-blue-300",
    XLS: "bg-green-500/30 text-green-300",
    XLSX: "bg-green-500/30 text-green-300",
    ZIP: "bg-yellow-500/30 text-yellow-300",
    PNG: "bg-purple-500/30 text-purple-300",
    JPG: "bg-purple-500/30 text-purple-300",
  };
  const colorClass = extColors[ext] || "bg-white/20 text-white/80";

  return (
    <div
      className={`flex items-center gap-3 bg-white/10 rounded-xl px-3 py-3 mb-1 min-w-[200px] ${isUrl ? "cursor-pointer hover:bg-white/20 active:bg-white/30" : ""} transition-colors`}
      onClick={() => isUrl && window.open(content, "_blank")}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        <FileText size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate font-medium">{displayName}</div>
        <div className="text-xs text-white/50 mt-0.5">{ext} Document</div>
      </div>
      {isUrl && (
        <Download size={16} className="text-white/50 flex-shrink-0" />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Sticker                                                             //
// ------------------------------------------------------------------ //
function StickerMessage({ content }: { content: string }) {
  if (content.startsWith("http")) {
    return (
      <img
        src={content}
        alt="Sticker"
        className="w-28 h-28 object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  // Emoji sticker
  return <span className="text-5xl leading-tight">{content}</span>;
}

// ------------------------------------------------------------------ //
//  Location                                                            //
// ------------------------------------------------------------------ //
function LocationMessage({ content }: { content: string }) {
  // content formats:
  // "lat,lng" → "24.8607,67.0011"
  // "lat,lng,name" → "24.8607,67.0011,Karachi"
  // plain text description

  let lat: string | null = null;
  let lng: string | null = null;
  let name: string | null = null;

  const parts = content.split(",");
  if (parts.length >= 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
    lat = parts[0].trim();
    lng = parts[1].trim();
    name = parts[2]?.trim() || null;
  }

  const mapsUrl = lat && lng
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : `https://www.google.com/maps/search/${encodeURIComponent(content)}`;

  const staticMapUrl = lat && lng
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=200x120&markers=${lat},${lng}&key=AIzaSyD-PLACEHOLDER`
    : null;

  return (
    <div
      className="mb-1 cursor-pointer rounded-xl overflow-hidden hover:opacity-90 transition-opacity active:opacity-75"
      style={{ maxWidth: "220px" }}
      onClick={() => window.open(mapsUrl, "_blank")}
    >
      {/* Map preview */}
      <div className="bg-[#2a4a3a] h-24 flex items-center justify-center relative">
        {/* Grid lines to simulate map */}
        <div className="absolute inset-0 opacity-20">
          {[20,40,60,80].map(p => (
            <div key={p}>
              <div className="absolute border-t border-white/30" style={{top:`${p}%`,width:'100%'}}/>
              <div className="absolute border-l border-white/30" style={{left:`${p}%`,height:'100%'}}/>
            </div>
          ))}
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
            <MapPin size={16} className="text-white" />
          </div>
          <div className="w-2 h-2 bg-red-500/50 rounded-full mt-0.5" />
        </div>
      </div>
      {/* Location info */}
      <div className="bg-white/10 px-3 py-2 flex items-center gap-2">
        <MapPin size={14} className="text-red-400 flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-sm text-white font-medium truncate">
            {name || "Location"}
          </div>
          {lat && lng && (
            <div className="text-[10px] text-white/50">
              {parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Contacts shared via WhatsApp                                        //
// ------------------------------------------------------------------ //
function ContactMessage({ content }: { content: string }) {
  return (
    <div className="flex items-center gap-3 bg-white/10 rounded-xl px-3 py-3 mb-1 min-w-[180px]">
      <div className="w-10 h-10 rounded-full bg-[#00a884]/30 flex items-center justify-center flex-shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00a884" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <div>
        <div className="text-sm text-white font-medium">{content || "Contact"}</div>
        <div className="text-xs text-white/50">Contact card</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Main export                                                         //
// ------------------------------------------------------------------ //
export default function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.sender_type === "USER";
  const isBot = msg.sender_type === "BOT";

  const renderContent = () => {
    const type = (msg.message_type || "text").toLowerCase();
    const content = msg.content || "";

    switch (type) {
      case "image":
        return <ImageMessage content={content} />;
      case "audio":
      case "voice":
        return <AudioMessage content={content} />;
      case "video":
        return <VideoMessage content={content} />;
      case "document":
        return <DocumentMessage content={content} />;
      case "sticker":
        return <StickerMessage content={content} />;
      case "location":
        return <LocationMessage content={content} />;
      case "contacts":
      case "contact":
        return <ContactMessage content={content} />;
      case "text":
      default:
        return (
          <p className="leading-relaxed whitespace-pre-wrap break-words text-sm">
            {detectLinks(content)}
          </p>
        );
    }
  };

  return (
    <div className={`flex ${isUser ? "justify-start" : "justify-end"} mb-1`}>
      <div
        className={`max-w-[75%] sm:max-w-[65%] px-3 py-2 rounded-lg shadow-sm ${
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
            {isBot
              ? <Bot size={10} className="text-[#00a884]" />
              : <User size={10} className="text-blue-400" />
            }
            <span className={`text-[10px] font-medium ${isBot ? "text-[#00a884]" : "text-blue-400"}`}>
              {isBot ? "Bot" : "Agent"}
            </span>
          </div>
        )}

        {renderContent()}

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