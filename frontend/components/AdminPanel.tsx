"use client";

import { useEffect, useState } from "react";
import EditTenant from "./EditTenant";
import ProfileSettings from "./ProfileSettings";

import {
  Users, MessageSquare, Activity, Plus, Power, Eye, Bot,
  ToggleLeft, ToggleRight, LogOut, ChevronRight,
  Wifi, WifiOff,
} from "lucide-react";

import { tenantsAPI, api } from "@/lib/api";
import { useStore } from "@/lib/store";
import AddTenant from "@/components/AddTenant";
import { useRouter } from "next/navigation";

interface Tenant {
  id: string;
  business_name: string;
  owner_email: string;
  whatsapp_number: string;
  phone_number_id: string;
  n8n_webhook_url: string | null;
  monthly_message_limit: number;
  current_month_messages: number;
  status: string;
}

export default function AdminPanel() {
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const router = useRouter();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchTenants = () => {
    setLoading(true);
    tenantsAPI
      .list()
      .then((res) => setTenants(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTenants(); }, []);

  const handleToggleStatus = async (tenant: Tenant) => {
    setToggling(tenant.id);
    try {
      const newStatus = tenant.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await tenantsAPI.update(tenant.id, { status: newStatus });
      setTenants((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, status: newStatus } : t))
      );
    } finally {
      setToggling(null);
    }
  };

  // Stats
  const totalClients = tenants.length;
  const activeClients = tenants.filter((t) => t.status === "ACTIVE").length;
  const totalMessages = tenants.reduce((a, t) => a + t.current_month_messages, 0);
  const totalLimit = tenants.reduce((a, t) => a + t.monthly_message_limit, 0);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Top navbar */}
      <div className="bg-[#111b21] border-b border-[#2a3942] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00a884] flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-base">ChatSetGo</h1>
            <p className="text-[#8696a0] text-xs">Super Admin Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full font-medium">
            {user?.full_name}
          </span>
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-1.5 text-xs text-[#8696a0] hover:text-white border border-[#2a3942] px-3 py-1.5 rounded-lg transition-colors"
          >
            <Users size={12} />
            Profile
          </button>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="text-[#8696a0] hover:text-red-400 transition-colors p-1.5"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Users size={18} />}
            label="Total Clients"
            value={totalClients}
            color="text-[#00a884]"
            bg="bg-[#00a884]/10"
          />
          <StatCard
            icon={<Activity size={18} />}
            label="Active Clients"
            value={activeClients}
            color="text-green-400"
            bg="bg-green-400/10"
          />
          <StatCard
            icon={<MessageSquare size={18} />}
            label="Messages This Month"
            value={totalMessages.toLocaleString()}
            color="text-blue-400"
            bg="bg-blue-400/10"
          />
          <StatCard
            icon={<Activity size={18} />}
            label="Total Capacity"
            value={totalLimit.toLocaleString()}
            color="text-amber-400"
            bg="bg-amber-400/10"
          />
        </div>

        {/* Clients section */}
        <div className="bg-[#111b21] rounded-xl border border-[#2a3942] overflow-hidden">
          {/* Section header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a3942]">
            <h2 className="text-white font-semibold text-sm">
              Clients ({totalClients})
            </h2>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-[#00a884] hover:bg-[#02b48f] text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Plus size={13} />
              Add Client
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-12 text-[#8696a0] text-sm">
              No clients yet — add your first client
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a3942]">
                    {["Business", "WhatsApp", "Messages", "Limit", "n8n Bot", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left text-[#8696a0] text-xs font-medium px-5 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => {
                    const usagePct = Math.min(
                      Math.round((tenant.current_month_messages / tenant.monthly_message_limit) * 100),
                      100
                    );
                    const isActive = tenant.status === "ACTIVE";

                    return (
                      <tr
                        key={tenant.id}
                        className="border-b border-[#2a3942]/50 hover:bg-[#1f2c33] transition-colors"
                      >
                        {/* Business */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#2a3942] flex items-center justify-center text-[#8696a0] text-xs font-medium flex-shrink-0">
                              {tenant.business_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">
                                {tenant.business_name}
                              </p>
                              <p className="text-[#8696a0] text-xs">
                                {tenant.owner_email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* WhatsApp */}
                        <td className="px-5 py-4">
                          <span className="text-[#8696a0] text-xs font-mono">
                            +{tenant.whatsapp_number}
                          </span>
                        </td>

                        {/* Messages with progress */}
                        <td className="px-5 py-4">
                          <div>
                            <p className="text-white text-sm">
                              {tenant.current_month_messages.toLocaleString()}
                            </p>
                            <div className="w-20 h-1 bg-[#2a3942] rounded-full mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  usagePct > 80 ? "bg-red-400" :
                                  usagePct > 60 ? "bg-amber-400" : "bg-[#00a884]"
                                }`}
                                style={{ width: `${usagePct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Limit */}
                        <td className="px-5 py-4">
                          <span className="text-[#8696a0] text-sm">
                            {tenant.monthly_message_limit.toLocaleString()}
                          </span>
                        </td>

                        {/* n8n */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {tenant.n8n_webhook_url ? (
                              <div className="flex items-center gap-1 text-[#00a884]">
                                <Wifi size={12} />
                                <span className="text-xs">Connected</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-amber-400">
                                <WifiOff size={12} />
                                <span className="text-xs">Not configured</span>
                              </div>
                            )}
                            <button
                              onClick={() => {
                                const url = prompt(
                                  "Enter n8n webhook URL:",
                                  tenant.n8n_webhook_url || ""
                                );
                                if (url !== null) {
                                  tenantsAPI
                                    .update(tenant.id, { n8n_webhook_url: url })
                                    .then(() => fetchTenants())
                                    .catch(() => alert("Update failed"));
                                }
                              }}
                              className="text-[#8696a0] hover:text-white transition-colors"
                              title="Edit n8n URL"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isActive
                              ? "bg-green-400/20 text-green-400"
                              : "bg-red-400/20 text-red-400"
                          }`}>
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {/* View conversations */}
                            <button
                            //   onClick={() => router.push("/dashboard")}
                              onClick={() => window.location.href = `/dashboard?admin=true&tenant_id=${tenant.id}`}
                              className="w-7 h-7 rounded-lg bg-[#2a3942] hover:bg-[#3a4952] flex items-center justify-center text-[#8696a0] hover:text-white transition-colors"
                              title="View conversations"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => setEditingTenant(tenant)}
                              className="text-[#8696a0] hover:text-[#00a884] transition-colors"
                              title="Edit client"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>

                            {/* Toggle active/inactive */}
                            <button
                              onClick={() => handleToggleStatus(tenant)}
                              disabled={toggling === tenant.id}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                isActive
                                  ? "bg-red-400/20 hover:bg-red-400/30 text-red-400"
                                  : "bg-green-400/20 hover:bg-green-400/30 text-green-400"
                              }`}
                              title={isActive ? "Deactivate" : "Activate"}
                            >
                              <Power size={13} />
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm(`Delete "${tenant.business_name}"? This cannot be undone.`)) {
                                    tenantsAPI.delete(tenant.id)
                                        .then(() => fetchTenants())
                                        .catch(() => alert("Delete failed"));
                                    }
                                }}
                                className="text-[#8696a0] hover:text-red-400 transition-colors ml-2"
                                title="Delete client"
                                >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6l-1 14H6L5 6"/>
                                    <path d="M10 11v6M14 11v6"/>
                                    <path d="M9 6V4h6v2"/>
                                </svg>
                            </button>
                            <button
                                onClick={() => {
                                  const newPass = prompt("Enter new password for " + tenant.business_name + ":");
                                  if (newPass && newPass.length >= 8) {
                                    api.post(`/tenants/${tenant.id}/reset-password`, { new_password: newPass })
                                      .then(() => alert("Password reset successfully!"))
                                      .catch(() => alert("Failed to reset password"));
                                  } else if (newPass) {
                                    alert("Password must be at least 8 characters");
                                  }
                                }}
                                className="text-[#8696a0] hover:text-blue-400 transition-colors ml-2"
                                title="Reset client password"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                                </svg>
                              </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add tenant modal */}
      {showAdd && (
        // <AddTenant
        //   onClose={() => setShowAdd(false)}
        //   onCreated={fetchTenants}
        // />
        <AddTenant
          onClose={() => setShowAdd(false)}
          onSuccess={fetchTenants}
        />
      )}
      {editingTenant && (
        <EditTenant
          tenant={editingTenant}
          onClose={() => setEditingTenant(null)}
          onSuccess={() => { setEditingTenant(null); fetchTenants(); }}
        />
      )}
      {showProfile && (
        <ProfileSettings onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, color, bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-[#111b21] border border-[#2a3942] rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center ${color} mb-3`}>
        {icon}
      </div>
      <p className="text-[#8696a0] text-xs mb-1">{label}</p>
      <p className="text-white text-xl font-semibold">{value}</p>
    </div>
  );
}