import { useEffect } from "react";
import { useStore } from "./store";

export function useTabTitle() {
  const conversations = useStore((s) => s.conversations);

  useEffect(() => {
    const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
    document.title = totalUnread > 0
      ? `(${totalUnread}) ChatSetGo Dashboard`
      : "ChatSetGo Dashboard";
  }, [conversations]);
}