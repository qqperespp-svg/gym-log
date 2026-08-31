"use client";

import { useState } from "react";
import { TrendingUp, Trophy, ArrowUpRight } from "lucide-react";

type ExerciseProgressProps = {
  exercises: Array<{ id: number; name: string; totalSets: number }>;
  workouts: Array<{ id: number; date: Date; volume: number; maxWeight: number; exerciseIds: number[]; exercises: Array<{ exerciseId: number; volume: number; maxWeight: number }> }>
};

export function ExerciseProgressTile({ exercises, workouts }: ExerciseProgressProps) {
  const [selected, setSelected] = useState<number | null>(exercises[0]?.id ?? null);
  const selectedName = exercises.find((e) => e.id === selected)?.name ?? "—";

  // Filtrowanie treningów dla wybranego ćwiczenia i sortowanie po dacie
  const selectedWorkouts = workouts
    .filter((w) => selected !== null && (w.exerciseIds.includes(selected) || w.id === selected))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Uproszczona wersja — dla każdego treningu pokazujemy objętość i maxWeight z `workouts`
  // W rzeczywistości należałoby przefiltrować `workouts` po `exerciseId` — tu zakładamy,
  // że `workouts` to dane dla wybranego ćwiczenia (przekazane z `workouts/page.tsx`).
  const selectedWorkoutIds = selected !== null ? workouts.filter((w) => w.exerciseIds.includes(selected) || w.id === selected).map((w) => w.id) : workouts.slice(-10).map((w) => w.id);
  const selectedWorkoutsData = workouts.filter((w) => selectedWorkoutIds.includes(w.id));
  const basePoints = selectedWorkoutsData.length ? selectedWorkoutsData : workouts.slice(-10);
  // Dla wybranego ćwiczenia liczymy jego wartości z danego treningu, nie sumę całej sesji.
  const points =
    selected !== null
      ? basePoints.map((w) => {
          const e = w.exercises.find((x) => x.exerciseId === selected);
          return e ? { ...w, volume: e.volume, maxWeight: e.maxWeight } : w;
        })
      : basePoints;
  const maxVolume = Math.max(...points.map((p) => p.volume), 1);
  const maxWeight = Math.max(...points.map((p) => p.maxWeight), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-extrabold text-white">Historia ćwiczeń — objętość i ciężar</h2>
        <span className="rounded-full bg-white/[.04] px-3 py-1 text-xs font-bold text-slate-400 ring-1 ring-white/10">
          {exercises.length} ćwiczeń z historią
        </span>
      </div>

      {/* Lista ćwiczeń */}
      <div className="rounded-2xl border border-white/[.06] bg-black/15 p-4">
        <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-500">Wybierz ćwiczenie</p>
        <div className="flex flex-wrap gap-2">
          {exercises.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setSelected(e.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ring-1 ${
                selected === e.id ? "bg-lime-400 text-slate-950 ring-lime-400" : "bg-white/[.04] text-slate-300 ring-white/10 hover:bg-white/[.08] hover:text-white"
              }`}
            >
              {e.name} <span className="ml-1 text-[10px] text-slate-500">({e.totalSets} serii)</span>
            </button>
          ))}
        </div>
      </div>

      {/* Wykres */}
      <div className="panel p-5 sm:p-7">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-white">{selectedName}</h3>
            <p className="mt-0.5 text-xs text-slate-500">Objętość (kg) i maksymalny ciężar (kg) z treningu na trening</p>
          </div>
          <span className="text-xs text-slate-500">Ostatnie {points.length} treningów</span>
        </div>

        {points.length < 2 ? (
          <p className="rounded-xl border border-white/[.06] bg-black/15 p-6 text-center text-sm text-slate-500">
            Potrzebne co najmniej 2 treningi z tym ćwiczeniem, aby pokazać wykres.
          </p>
        ) : (
          <>
            <div className="h-56 w-full overflow-hidden rounded-xl border border-white/[.06] bg-black/10">
              <svg viewBox={`0 0 ${Math.max(points.length * 40, 300)} 140`} preserveAspectRatio="none" className="h-full w-full">
                {/* Oś X — daty */}
                {points.map((p, i) => (
                  <text key={`date-${i}`} x={i * 40 + 20} y={130} fill="#94a3b8" fontSize="8" textAnchor="middle" transform={`rotate(-30 ${i * 40 + 20} 130)`}>
                    {p.date.toLocaleDateString("pl-PL", { month: "short", day: "numeric" })}
                  </text>
                ))}
                {/* Objętość — słupki */}
                <text x={10} y={16} fill="#a3e635" fontSize="10" fontWeight="bold">Objętość (kg)</text>
                {points.map((p, i) => {
                  const h = Math.max(4, (p.volume / maxVolume) * 90);
                  return (
                    <rect key={`vol-${i}`} x={i * 40 + 12} y={140 - h} width={16} height={h} rx={3} fill="#a3e635" opacity={0.85} />
                  );
                })}
                {/* Maksymalny ciężar — punkty */}
                <text x={10} y={28} fill="#f472b6" fontSize="10" fontWeight="bold">Max ciężar (kg)</text>
                {points.map((p, i) => {
                  const y = 140 - Math.max(4, (p.maxWeight / Math.max(...points.map((q) => q.maxWeight), 1)) * 90);
                  return (
                    <circle key={`max-${i}`} cx={i * 40 + 20} cy={y} r={3.5} fill="#f472b6" stroke="#fff" strokeWidth={0.5} />
                  );
                })}
                {/* Linia trendu objętości */}
                <polyline
                  points={points.map((p, i) => {
                    const x = i * 40 + 20;
                    const y = 140 - Math.max(4, (p.volume / maxVolume) * 90);
                    return `${x},${y}`;
                  }).join(" ")}
                  fill="none"
                  stroke="#a3e635"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                {/* Linia trendu max ciężaru */}
                <polyline
                  points={points.map((p, i) => {
                    const x = i * 40 + 20;
                    const y = 140 - Math.max(4, (p.maxWeight / Math.max(...points.map((q) => q.maxWeight), 1)) * 90);
                    return `${x},${y}`;
                  }).join(" ")}
                  fill="none"
                  stroke="#f472b6"
                  strokeWidth="2"
                  strokeDasharray="2 2"
                />
                {/* Wartości objętości */}
                {points.map((p, i) => (
                  <text key={`val-${i}`} x={i * 40 + 20} y={140 - Math.max(4, (p.volume / maxVolume) * 90) - 6} fill="#fff" fontSize="8" textAnchor="middle" fontWeight="bold">
                    {p.volume} kg
                  </text>
                ))}
                {/* Wartości max ciężaru */}
                {points.map((p, i) => (
                  <text key={`maxval-${i}`} x={i * 40 + 20} y={140 - Math.max(4, (p.maxWeight / Math.max(...points.map((q) => q.maxWeight), 1)) * 90) - 14} fill="#fff" fontSize="8" textAnchor="middle" fontWeight="bold">
                    {p.maxWeight} kg
                  </text>
                ))}
              </svg>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#a3e635]" /> Objętość treningowa
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#f472b6]" /> Maksymalny ciężar
              </span>
              <span className="inline-flex items-center gap-1.5 ml-auto">
                <Trophy size={13} className="text-amber-300" /> Max: {maxWeight} kg
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
