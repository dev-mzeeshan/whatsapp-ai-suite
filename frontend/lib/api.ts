import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Har request mein token add karo
api.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 par login redirect
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ------------------------------------------------------------------ //
//  Auth                                                                //
// ------------------------------------------------------------------ //
export const authAPI = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  me: () => api.get("/auth/me"),
};

// ------------------------------------------------------------------ //
//  Conversations                                                       //
// ------------------------------------------------------------------ //
export const conversationsAPI = {
  list: (page = 1, tenantId?: string) =>
  api.get(`/conversations?page=${page}&limit=30${tenantId ? `&tenant_id=${tenantId}` : ""}`),
  messages: (convId: string, beforeId?: string) =>
    api.get(
      `/conversations/${convId}/messages${beforeId ? `?before_id=${beforeId}` : ""}`
    ),
  toggleBot: (convId: string) => api.patch(`/conversations/${convId}/bot`),
  reply: (convId: string, message: string) =>
    api.post(`/conversations/${convId}/reply`, { message }),
  markRead: (convId: string) => api.patch(`/conversations/${convId}/read`),
};

// ------------------------------------------------------------------ //
//  Tenants (Super Admin)                                               //
// ------------------------------------------------------------------ //
export const tenantsAPI = {
  list: () => api.get("/tenants"),
  create: (data: object) => api.post("/tenants", data),
  update: (id: string, data: object) => api.patch(`/tenants/${id}`, data),
  delete: (id: string) => api.delete(`/tenants/${id}`),
  myTenant: () => api.get("/tenants/me"),
};