"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function WeeklyVolumeChart({ data }: { data: { week: string; volume: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Weekly Volume</h3>
        <div className="text-center py-12 text-slate-500">
          <p className="text-sm">No workout volume data yet.</p>
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: `W${d.week.split("-W")[1]}`,
    volume: Math.round(d.volume),
  }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Weekly Volume</h3>
        <span className="text-xs text-slate-500">Total weight lifted per week (lbs)</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
              labelStyle={{ color: "#f1f5f9" }}
              formatter={(v: any) => [`${Number(v).toLocaleString()} lbs`, "Volume"]}
            />
            <Bar dataKey="volume" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
