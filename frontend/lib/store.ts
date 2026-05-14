import { create } from "zustand";

// ------------------------------------------------------------------ //
//  Types                                                               //
// ------------------------------------------------------------------ //

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "SUPER_ADMIN" | "TENANT_ADMIN";
  tenant_id: string | null;
}

export interface Conversation {
  id: string;
  contact_name: string | null;
  contact_wa_id: string;
  is_bot_active: boolean;
  status: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface Message {
  id: string;
  content: string;
  sender_type: "USER" | "BOT" | "AGENT";
  message_type: string;
  status: string;
  created_at: string;
  meta_message_id: string | null;
}

// ------------------------------------------------------------------ //
//  Store                                                               //
// ------------------------------------------------------------------ //

interface AppStore {
  // Auth
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;

  // Conversations
  conversations: Conversation[];
  setConversations: (convs: Conversation[]) => void;
  updateConversation: (id: string, data: Partial<Conversation>) => void;
  appendConversation: (conv: Conversation) => void;

  // Active conversation
  activeConvId: string | null;
  setActiveConvId: (id: string | null) => void;

  // Messages
  messages: Record<string, Message[]>; // conv_id -> messages
  setMessages: (convId: string, msgs: Message[]) => void;
  appendMessage: (convId: string, msg: Message) => void;

  // UI
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useStore = create<AppStore>((set) => ({
  // Auth
  user: null,
  token: null,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
    set({ token });
  },
  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null, conversations: [], messages: {} });
  },

  // Conversations
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  updateConversation: (id, data) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
    })),
  appendConversation: (conv) =>
    set((state) => ({
      conversations: [conv, ...state.conversations],
    })),

  // Active conversation
  activeConvId: null,
  setActiveConvId: (id) => set({ activeConvId: id }),

  // Messages
  messages: {},
  setMessages: (convId, msgs) =>
    set((state) => ({
      messages: { ...state.messages, [convId]: msgs },
    })),
  appendMessage: (convId, msg) =>
    set((state) => {
      const existing = state.messages[convId] || [];
      // Duplicate check
      if (existing.find((m) => m.id === msg.id)) return state;
      return {
        messages: { ...state.messages, [convId]: [...existing, msg] },
      };
    }),

  // UI
  isSidebarOpen: true,
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));