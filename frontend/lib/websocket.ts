"use client";

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "./store";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000";

export function useSidebarSocket() {
  const token = useStore((s) => s.token);
  const updateConversation = useStore((s) => s.updateConversation);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}/ws/sidebar?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Sidebar WS connected");
      const ping = setInterval(() => ws.send("ping"), 30000);
      ws.onclose = () => clearInterval(ping);
    };

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "conversation_updated") {
          updateConversation(event.conversation_id, {
            last_message_preview: event.last_message,
            last_message_at: event.last_message_at,
          });
        }
      } catch {}
    };

    ws.onclose = () => {
      reconnectRef.current = setTimeout(connect, 3000);
    };
  }, [token, updateConversation]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);
}

export function useConversationSocket(conversationId: string | null) {
  const token = useStore((s) => s.token);
  const appendMessage = useStore((s) => s.appendMessage);
  const updateConversation = useStore((s) => s.updateConversation);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!token || !conversationId) return;

    const ws = new WebSocket(
      `${WS_URL}/ws/conversations/${conversationId}?token=${token}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`Conv WS connected: ${conversationId}`);
      const ping = setInterval(() => ws.send("ping"), 30000);
      ws.onclose = () => clearInterval(ping);
    };

    ws.onmessage = (e) => {
      if (e.data === "pong") return;
      try {
        const event = JSON.parse(e.data);
        if (event.type === "new_message") {
          appendMessage(event.conversation_id, event.message);
        }
        if (event.type === "bot_toggled") {
          updateConversation(event.conversation_id, {
            is_bot_active: event.is_bot_active,
          });
        }
      } catch {}
    };

    ws.onclose = () => {
      reconnectRef.current = setTimeout(connect, 3000);
    };
  }, [token, conversationId, appendMessage, updateConversation]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);
}