"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { MessageSquare, Bot, User, TrendingUp, Activity } from "lucide-react";

interface AnalyticsData {
  summary: {
    total_messages_30d: number;
    total_conversations: number;
    active_conversations_7d: number;
    bot_rate_percent: number;
  };
  message_breakdown: { user: number; bot: number; agent: number };
  messages_per_day: { date: string; day: string; count: number }[];
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics")
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const maxCount = Math.max(...data.messages_per_day.map((d) => d.count), 1);
  const totalOutbound = data.message_breakdown.bot + data.message_breakdown.agent;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<MessageSquare size={18} className="text-blue-400" />}
          label="Messages (30d)"
          value={data.summary.total_messages_30d.toLocaleString()}
          color="blue"
        />
        <StatCard
          icon={<Activity size={18} className="text-[#00a884]" />}
          label="Conversations"
          value={data.summary.total_conversations.toLocaleString()}
          color="green"
        />
        <StatCard
          icon={<TrendingUp size={18} className="text-amber-400" />}
          label="Active (7d)"
          value={data.summary.active_conversations_7d.toLocaleString()}
          color="amber"
        />
        <StatCard
          icon={<Bot size={18} className="text-purple-400" />}
          label="Bot Rate"
          value={`${data.summary.bot_rate_percent}%`}
          color="purple"
        />
      </div>

      {/* Messages per day chart */}
      <div className="bg-[#111b21] border border-[#2a3942] rounded-xl p-5">
        <h3 className="text-white text-sm font-medium mb-4">Messages Last 7 Days</h3>
        <div className="flex items-end gap-2 h-32">
          {data.messages_per_day.map((day, i) => {
            const height = maxCount > 0 ? Math.max((day.count / maxCount) * 100, 4) : 4;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[#8696a0] text-[10px]">
                  {day.count > 0 ? day.count : ""}
                </span>
                <div className="w-full relative" style={{ height: "80px" }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t-md bg-[#00a884]/80 hover:bg-[#00a884] transition-all"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-[#8696a0] text-[10px]">{day.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bot vs Manual breakdown */}
      <div className="bg-[#111b21] border border-[#2a3942] rounded-xl p-5">
        <h3 className="text-white text-sm font-medium mb-4">Message Breakdown (30d)</h3>
        <div className="space-y-3">
          <BreakdownBar
            label="Inbound (User)"
            count={data.message_breakdown.user}
            total={data.summary.total_messages_30d}
            color="#53bdeb"
            icon={<User size={12} />}
          />
          <BreakdownBar
            label="Bot Replies"
            count={data.message_breakdown.bot}
            total={data.summary.total_messages_30d}
            color="#00a884"
            icon={<Bot size={12} />}
          />
          <BreakdownBar
            label="Agent Replies"
            count={data.message_breakdown.agent}
            total={data.summary.total_messages_30d}
            color="#f59e0b"
            icon={<User size={12} />}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/10 border-blue-500/20",
    green: "bg-[#00a884]/10 border-[#00a884]/20",
    amber: "bg-amber-500/10 border-amber-500/20",
    purple: "bg-purple-500/10 border-purple-500/20",
  };
  return (
    <div className={`${colors[color]} border rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">{icon}
        <span className="text-[#8696a0] text-xs">{label}</span>
      </div>
      <p className="text-white text-xl font-semibold">{value}</p>
    </div>
  );
}

function BreakdownBar({
  label, count, total, color, icon,
}: {
  label: string; count: number; total: number; color: string; icon: React.ReactNode;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5" style={{ color }}>
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <span className="text-[#8696a0] text-xs">{count.toLocaleString()} ({pct}%)</span>
      </div>
      <div className="h-2 bg-[#2a3942] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}