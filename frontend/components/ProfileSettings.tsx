"use client";

import { useState } from "react";
import { X, User } from "lucide-react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";

interface Props {
  onClose: () => void;
}

export default function ProfileSettings({ onClose }: Props) {
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);

  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const update = (key: string, val: string) =>
    setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (form.new_password && form.new_password !== form.confirm_password) {
      setError("New passwords do not match");
      return;
    }
    if (form.new_password && form.new_password.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (form.new_password && !form.current_password) {
      setError("Current password is required to set a new password");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, string> = {};
      if (form.full_name !== user?.full_name) payload.full_name = form.full_name;
      if (form.new_password) {
        payload.current_password = form.current_password;
        payload.new_password = form.new_password;
      }

      if (Object.keys(payload).length === 0) {
        setError("No changes to save");
        setLoading(false);
        return;
      }

      await api.patch("/auth/profile", payload);

      // Update Zustand store
      if (form.full_name !== user?.full_name && user) {
        setUser({ ...user, full_name: form.full_name });
      }

      setSuccess("Profile updated successfully!");
      setForm((p) => ({ ...p, current_password: "", new_password: "", confirm_password: "" }));
    } catch (err: any) {
      setError(err.response?.data?.detail || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111b21] border border-[#2a3942] rounded-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a3942]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#2a3942] flex items-center justify-center">
              <User size={16} className="text-[#8696a0]" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Profile Settings</h2>
              <p className="text-[#8696a0] text-xs">{user?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8696a0] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
          {/* Personal Info */}
          <p className="text-[#8696a0] text-xs font-medium uppercase tracking-wider">Personal Info</p>

          <div>
            <label className="text-[#8696a0] text-xs mb-1 block">Full Name</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              className="w-full bg-[#1f2c33] text-white rounded-lg px-4 py-2.5 text-sm border border-[#2a3942] focus:border-[#00a884] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[#8696a0] text-xs mb-1 block">Email</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full bg-[#1f2c33] text-white rounded-lg px-4 py-2.5 text-sm border border-[#2a3942] opacity-50 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-[#8696a0] text-xs mb-1 block">Role</label>
            <input
              value={user?.role === "SUPER_ADMIN" ? "Super Admin" : "Operator"}
              disabled
              className="w-full bg-[#1f2c33] text-white rounded-lg px-4 py-2.5 text-sm border border-[#2a3942] opacity-50 cursor-not-allowed"
            />
          </div>

          {/* Change Password */}
          <p className="text-[#8696a0] text-xs font-medium uppercase tracking-wider pt-1">Change Password</p>

          <div>
            <label className="text-[#8696a0] text-xs mb-1 block">Current Password</label>
            <input
              type="password"
              value={form.current_password}
              onChange={(e) => update("current_password", e.target.value)}
              placeholder="Enter current password"
              className="w-full bg-[#1f2c33] text-white placeholder-[#8696a0] rounded-lg px-4 py-2.5 text-sm border border-[#2a3942] focus:border-[#00a884] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[#8696a0] text-xs mb-1 block">New Password</label>
            <input
              type="password"
              value={form.new_password}
              onChange={(e) => update("new_password", e.target.value)}
              placeholder="Min 8 characters"
              className="w-full bg-[#1f2c33] text-white placeholder-[#8696a0] rounded-lg px-4 py-2.5 text-sm border border-[#2a3942] focus:border-[#00a884] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[#8696a0] text-xs mb-1 block">Confirm New Password</label>
            <input
              type="password"
              value={form.confirm_password}
              onChange={(e) => update("confirm_password", e.target.value)}
              placeholder="Repeat new password"
              className="w-full bg-[#1f2c33] text-white placeholder-[#8696a0] rounded-lg px-4 py-2.5 text-sm border border-[#2a3942] focus:border-[#00a884] focus:outline-none"
            />
          </div>

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