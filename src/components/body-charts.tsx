"use client";

import { useMemo, useState } from "react";

type Point = { date: Date; value: number };

const METRICS = [
  { key: "weightKg", label: "Waga (kg)", color: "#a3e635" },
  { key: "chestCm", label: "Klatka (cm)", color: "#38bdf8" },
  { key: "waistCm", label: "Talia (cm)", color: "#fbbf24" },
  { key: "hipCm", label: "Biodra (cm)", color: "#fb7185" },
  { key: "thighCm", label: "Udo (cm)", color: "#a78bfa" },
  { key: "bicepsCm", label: "Biceps (cm)", color: "#f472b6" },
  { key: "calfCm", label: "Łydka (cm)", color: "#34d399" },
] as const;

export function BodyCharts({ rows }: { rows: Record<string, unknown>[] }) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("weightKg");
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);

  function showPoint(index: number) {
    setSelectedPoint(index);
    window.setTimeout(() => setSelectedPoint((current) => (current === index ? null : current)), 5000);
  }

  const data: Point[] = useMemo(() => {
    return [...rows]
      .reverse()
      .map((r) => ({ date: r.date as Date, value: r[metric] as number | null }))
      .filter((p) => p.value != null && Number.isFinite(p.value))
      .map((p) => ({ date: p.date, value: p.value as number }));
  }, [rows, metric]);

  const { polyline, min, max } = useMemo(() => {
    if (data.length < 2) return { polyline: "", min: 0, max: 0 };
    const vals = data.map((d) => d.value);
    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    const range = mx - mn || 1;
    const w = 520;
    const h = 160;
    const pts = data.map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((d.value - mn) / range) * (h - 20) - 10;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return { polyline: pts.join(" "), min: mn, max: mx };
  }, [data]);

  const meta = METRICS.find((m) => m.key === metric)!;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              metric === m.key ? "bg-white/10 text-white ring-1 ring-white/20" : "bg-white/[.03] text-slate-500 hover:text-slate-300"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {data.length >= 2 ? (
        <div>
          <div className="relative overflow-hidden rounded-xl border border-white/[.07] bg-black/20 p-2 sm:p-4">
          <svg viewBox="0 0 520 190" className="h-64 w-full sm:h-72" role="img" aria-label={`Wykres ${meta.label}`}>
            {[20, 60, 100, 140, 180].map((y) => <line key={y} x1="0" x2="520" y1={y} y2={y} stroke="#334155" strokeOpacity=".45" strokeDasharray="3 4" />)}
            <polyline points={polyline} fill="none" stroke={meta.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {data.map((d, i) => {
              const pts = polyline.split(" ");
              const [x, y] = pts[i].split(",").map(Number);
              return <g key={i}>
                <circle cx={x} cy={y} r="10" fill="transparent" className="cursor-pointer" onClick={() => showPoint(i)} />
                <circle cx={x} cy={y} r={selectedPoint === i ? 5 : 3.5} fill={meta.color} stroke={selectedPoint === i ? "#fff" : "none"} strokeWidth="1.5" />
                {selectedPoint === i && <g>
                  <rect x={Math.max(2, Math.min(430, x - 45))} y={Math.max(2, y - 34)} width="90" height="25" rx="5" fill="#0f172a" stroke={meta.color} />
                  <text x={Math.max(47, Math.min(475, x))} y={Math.max(18, y - 18)} fill="#fff" fontSize="11" textAnchor="middle" fontWeight="bold">{d.value.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} {meta.key === "weightKg" ? "kg" : "cm"}</text>
                </g>}
              </g>;
            })}
          </svg>
          </div>
          <div className="mt-3 flex justify-between text-[10px] text-slate-500">
            <span>{data[0].date.toLocaleDateString("pl-PL")}</span>
            <span>{min.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} – {max.toLocaleString("pl-PL", { maximumFractionDigits: 1 })}</span>
            <span>{data[data.length - 1].date.toLocaleDateString("pl-PL")}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Potrzebne co najmniej 2 pomiary tej metryki.</p>
      )}
    </div>
  );
}
