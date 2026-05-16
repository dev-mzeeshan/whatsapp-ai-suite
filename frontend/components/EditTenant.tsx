"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { tenantsAPI, api } from "@/lib/api";

interface Tenant {
  id: string;
  business_name: string;
  owner_email: string;
  whatsapp_number: string;
  phone_number_id: string;
  n8n_webhook_url: string | null;
  monthly_message_limit: number;
  status: string;
}

interface Props {
  tenant: Tenant;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditTenant({ tenant, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    business_name: tenant.business_name,
    owner_email: tenant.owner_email,
    whatsapp_number: tenant.whatsapp_number,
    phone_number_id: tenant.phone_number_id,
    meta_access_token: "",
    n8n_webhook_url: tenant.n8n_webhook_url || "",
    monthly_message_limit: tenant.monthly_message_limit,
    status: tenant.status,
  });
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const update = (key: string, val: string | number) =>
    setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Update tenant info
      const updateData: Record<string, string | number | null> = {
        business_name: form.business_name,
        n8n_webhook_url: form.n8n_webhook_url || null,
        monthly_message_limit: form.monthly_message_limit,
        status: form.status,
      };
      if (form.meta_access_token) {
        updateData.meta_access_token = form.meta_access_token;
      }
      await tenantsAPI.update(tenant.id, updateData);

      // Reset password if provided
      if (newPassword) {
        if (newPassword.length < 8) {
          setError("Password must be at least 8 characters");
          setLoading(false);
          return;
        }
        await api.post(`/tenants/${tenant.id}/reset-password`, {
          new_password: newPassword,
        });
      }

      setSuccess("Updated successfully!");
      setTimeout(() => {
        onSuccess();
      }, 800);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111b21] border border-[#2a3942] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a3942]">
          <div>
            <h2 className="text-white font-semibold text-base">Edit Client</h2>
            <p className="text-[#8696a0] text-xs mt-0.5">{tenant.business_name}</p>
          </div>
          <button onClick={onClose} className="text-[#8696a0] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
          {/* Business Info */}
          <p className="text-[#8696a0] text-xs font-medium uppercase tracking-wider">Business Info</p>
          <Input
            label="Business Name"
            value={form.business_name}
            onChange={(v) => update("business_name", v)}
            required
          />

          {/* Meta Settings */}
          <p className="text-[#8696a0] text-xs font-medium uppercase tracking-wider pt-1">Meta / WhatsApp</p>
          <Input
            label="WhatsApp Number"
            value={form.whatsapp_number}
            onChange={(v) => update("whatsapp_number", v)}
            disabled
          />
          <Input
            label="Phone Number ID"
            value={form.phone_number_id}
            onChange={(v) => update("phone_number_id", v)}
            disabled
          />
          <Input
            label="New Meta Access Token (leave blank to keep current)"
            value={form.meta_access_token}
            onChange={(v) => update("meta_access_token", v)}
            placeholder="Paste new token to update..."
          />

          {/* n8n */}
          <p className="text-[#8696a0] text-xs font-medium uppercase tracking-wider pt-1">n8n Bot</p>
          <Input
            label="n8n Webhook URL"
            value={form.n8n_webhook_url}
            onChange={(v) => update("n8n_webhook_url", v)}
            placeholder="https://your-n8n.app/webhook/..."
          />

          {/* Limits & Status */}
          <p className="text-[#8696a0] text-xs font-medium uppercase tracking-wider pt-1">Limits & Status</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[#8696a0] text-xs mb-1 block">Monthly Limit</label>
              <input
                type="number"
                value={form.monthly_message_limit}
                onChange={(e) => update("monthly_message_limit", parseInt(e.target.value))}
                min={100}
                className="w-full bg-[#1f2c33] text-white rounded-lg px-3 py-2.5 text-sm border border-[#2a3942] focus:border-[#00a884] focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-[#8696a0] text-xs mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
                className="w-full bg-[#1f2c33] text-white rounded-lg px-3 py-2.5 text-sm border border-[#2a3942] focus:border-[#00a884] focus:outline-none"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          {/* Password Reset */}
          <p className="text-[#8696a0] text-xs font-medium uppercase tracking-wider pt-1">Reset Password</p>
          <Input
            label="New Password (leave blank to keep current)"
            value={newPassword}
            onChange={setNewPassword}
            type="password"
            placeholder="Min 8 characters..."
          />

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          {success && <p className="text-[#00a884] text-xs text-center">{success}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[#2a3942] text-[#8696a0] hover:text-white py-2.5 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#00a884] hover:bg-[#02b48f] disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({
  label, value, onChange, type = "text",
  required = false, disabled = false, placeholder = "",
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; disabled?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[#8696a0] text-xs mb-1 block">{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        required={required} disabled={disabled}
        className="w-full bg-[#1f2c33] text-white placeholder-[#8696a0] rounded-lg px-4 py-2.5 text-sm border border-[#2a3942] focus:border-[#00a884] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}