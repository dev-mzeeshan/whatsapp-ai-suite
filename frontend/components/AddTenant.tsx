"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { tenantsAPI } from "@/lib/api";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTenant({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    business_name: "",
    owner_email: "",
    owner_password: "",
    owner_full_name: "",
    phone_number_id: "",
    whatsapp_number: "",
    meta_access_token: "",
    n8n_webhook_url: "",
    monthly_message_limit: 1000,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await tenantsAPI.create(form);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, val: string | number) =>
    setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111b21] border border-[#2a3942] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a3942]">
          <h2 className="text-white font-semibold text-base">Add New Client</h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
          <p className="text-[#8696a0] text-xs font-medium uppercase tracking-wider">Business Info</p>
          <Input placeholder="Business name" value={form.business_name} onChange={(v) => update("business_name", v)} required />
          <Input placeholder="Owner full name" value={form.owner_full_name} onChange={(v) => update("owner_full_name", v)} required />

          <p className="text-[#8696a0] text-xs font-medium uppercase tracking-wider pt-1">Dashboard Login</p>
          <Input placeholder="Owner email" type="email" value={form.owner_email} onChange={(v) => update("owner_email", v)} required />
          <Input placeholder="Password" type="password" value={form.owner_password} onChange={(v) => update("owner_password", v)} required />

          <p className="text-[#8696a0] text-xs font-medium uppercase tracking-wider pt-1">Meta / WhatsApp</p>
          <Input placeholder="WhatsApp number (e.g. 923001234567)" value={form.whatsapp_number} onChange={(v) => update("whatsapp_number", v)} required />
          <Input placeholder="Meta phone_number_id" value={form.phone_number_id} onChange={(v) => update("phone_number_id", v)} required />
          <Input placeholder="Meta access token" value={form.meta_access_token} onChange={(v) => update("meta_access_token", v)} required />

          <p className="text-[#8696a0] text-xs font-medium uppercase tracking-wider pt-1">n8n Bot (Optional)</p>
          <Input placeholder="n8n webhook URL" value={form.n8n_webhook_url} onChange={(v) => update("n8n_webhook_url", v)} />

          <p className="text-[#8696a0] text-xs font-medium uppercase tracking-wider pt-1">Limits</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={form.monthly_message_limit}
              onChange={(e) => update("monthly_message_limit", parseInt(e.target.value))}
              min={100}
              className="flex-1 bg-[#1f2c33] text-white placeholder-[#8696a0] rounded-lg px-4 py-2.5 text-sm border border-[#2a3942] focus:border-[#00a884] focus:outline-none"
            />
            <span className="text-[#8696a0] text-xs whitespace-nowrap">messages/month</span>
          </div>

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-[#2a3942] text-[#8696a0] hover:text-white py-2.5 rounded-lg text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-[#00a884] hover:bg-[#02b48f] disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
              {loading ? "Creating..." : "Create Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({ placeholder, value, onChange, type = "text", required = false }: {
  placeholder: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <input
      type={type} placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)} required={required}
      className="w-full bg-[#1f2c33] text-white placeholder-[#8696a0] rounded-lg px-4 py-2.5 text-sm border border-[#2a3942] focus:border-[#00a884] focus:outline-none transition-colors"
    />
  );
}