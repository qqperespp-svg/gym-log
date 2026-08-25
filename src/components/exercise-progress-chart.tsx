"use client";

import { useMemo, useState } from "react";
import { BarChart3, Dumbbell, Search } from "lucide-react";

export type ExerciseHistorySession = {
  workoutId: number;
  title: string;
  date: string;
  volume: number;
  maxWeight: number;
  sets: number;
};

export type ExerciseHistoryItem = {
  key: string;
  name: string;
  sessions: ExerciseHistorySession[];
};

const CHART_WIDTH = 760;
const CHART_HEIGHT = 320;
const PLOT_LEFT = 52;
const PLOT_RIGHT = 708;
const PLOT_TOP = 28;
const PLOT_BOTTOM = 238;

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("pl-PL");
}

function formatNumber(value: number) {
  return value.toLocaleString("pl-PL", { maximumFractionDigits: 1 });
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions) {
  return new Date(value).toLocaleDateString("pl-PL", options);
}

function totalSets(item: ExerciseHistoryItem) {
  return item.sessions.reduce((sum, session) => sum + session.sets, 0);
}

export function ExerciseProgressChart({ exercises }: { exercises: ExerciseHistoryItem[] }) {
  const [exerciseQuery, setExerciseQuery] = useState(exercises[0]?.name ?? "");
  const selected = useMemo(() => {
    const query = normalize(exerciseQuery);
    return exercises.find((item) => item.key === query || normalize(item.name) === query) ?? null;
  }, [exerciseQuery, exercises]);
  const sessions = selected?.sessions ?? [];
  const maxVolume = Math.max(...sessions.map((session) => session.volume), 1);
  const maxWeight = Math.max(...sessions.map((session) => session.maxWeight), 1);
  const step = (PLOT_RIGHT - PLOT_LEFT) / Math.max(sessions.length, 1);
  const barWidth = Math.min(44, Math.max(8, step * 0.62));
  const weightPoints = sessions
    .map((session, index) => {
      const x = PLOT_LEFT + step * (index + 0.5);
      const y = PLOT_BOTTOM - (session.maxWeight / maxWeight) * (PLOT_BOTTOM - PLOT_TOP);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const totalVolume = sessions.reduce((sum, session) => sum + session.volume, 0);
  const latest = sessions[sessions.length - 1] ?? null;
  const highestWeight = sessions.reduce(
    (best, session) => (session.maxWeight > best.maxWeight ? session : best),
    sessions[0] ?? { maxWeight: 0 },
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(250px,320px)_1fr] lg:items-start">
        <div className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
          <label htmlFor="exercise-history-select" className="field-label">
            Ćwiczenie z historią
            <span className="input-shell">
              <Search size={17} />
              <input
                id="exercise-history-select"
                type="text"
                list="exercise-history-options"
                value={exerciseQuery}
                onChange={(event) => setExerciseQuery(event.target.value)}
                placeholder={exercises.length ? "Wpisz nazwę ćwiczenia…" : "Brak ćwiczeń z historią"}
                autoComplete="off"
                disabled={!exercises.length}
              />
            </span>
          </label>
          <datalist id="exercise-history-options">
            {exercises.map((item) => (
              <option
                key={item.key}
                value={item.name}
                label={`${item.sessions.length} treningów · ${totalSets(item)} serii`}
              />
            ))}
          </datalist>
          {selected ? (
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {selected.sessions.length} treningów · {totalSets(selected)} zarejestrowanych serii
            </p>
          ) : exercises.length ? (
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Wybierz ćwiczenie z listy, aby zobaczyć jego historię.
            </p>
          ) : null}
        </div>

        {selected ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
              <p className="text-xs font-semibold text-slate-500">Łączna objętość</p>
              <p className="mt-2 text-xl font-black text-white">{formatNumber(totalVolume)} kg</p>
            </div>
            <div className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
              <p className="text-xs font-semibold text-slate-500">Ostatni trening</p>
              <p className="mt-2 text-xl font-black text-white">
                {latest ? formatNumber(latest.volume) : "—"} kg
              </p>
            </div>
            <div className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
              <p className="text-xs font-semibold text-slate-500">Największy ciężar</p>
              <p className="mt-2 text-xl font-black text-lime-300">
                {formatNumber(highestWeight.maxWeight)} kg
              </p>
            </div>
          </div>
        ) : (
          <div className="empty-state min-h-0 border-0 py-10">
            <BarChart3 size={28} className="text-slate-600" />
            <p className="mb-0 mt-3">Wybierz ćwiczenie, aby narysować wykres progresu.</p>
          </div>
        )}
      </div>

      {selected && sessions.length > 0 ? (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-white">Progres: {selected.name}</h3>
              <p className="mt-1 text-xs text-slate-500">
                Słupki pokazują objętość, a wartość pod każdym słupkiem to jej suma. Linia oznacza maksymalny ciężar z każdej jednostki treningowej.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: "var(--accent)" }} /> Objętość (kg)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: "var(--accent-300)" }} /> Max ciężar (kg)
              </span>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/[.06] bg-black/10 p-2 sm:p-4">
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className="min-w-[620px] w-full"
              role="img"
              aria-label={`Wykres progresu objętości i maksymalnego ciężaru dla ${selected.name}`}
            >
              {[PLOT_TOP, (PLOT_TOP + PLOT_BOTTOM) / 2, PLOT_BOTTOM].map((y) => (
                <line
                  key={y}
                  x1={PLOT_LEFT}
                  x2={PLOT_RIGHT}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,.08)"
                  strokeDasharray="4 5"
                />
              ))}
              <text x="8" y={PLOT_TOP + 4} fill="#64748b" fontSize="10">
                {formatNumber(maxVolume)} kg
              </text>
              <text x="28" y={PLOT_BOTTOM + 4} fill="#64748b" fontSize="10">
                0
              </text>
              <text x={PLOT_RIGHT + 7} y={PLOT_TOP + 4} fill="var(--accent-300)" fontSize="10">
                {formatNumber(maxWeight)} kg
              </text>
              <text x={PLOT_RIGHT + 20} y={PLOT_BOTTOM + 4} fill="#64748b" fontSize="10">
                0
              </text>
              {sessions.map((session, index) => {
                const x = PLOT_LEFT + step * (index + 0.5);
                const height = (session.volume / maxVolume) * (PLOT_BOTTOM - PLOT_TOP);
                const y = PLOT_BOTTOM - Math.max(height, 3);
                const showLabel =
                  sessions.length <= 12 ||
                  index === 0 ||
                  index === sessions.length - 1 ||
                  index % Math.ceil(sessions.length / 10) === 0;
                return (
                  <g key={session.workoutId}>
                    <title>
                      {session.title}, {formatDate(session.date, { day: "2-digit", month: "2-digit", year: "numeric" })}: {formatNumber(session.volume)} kg objętości, max {formatNumber(session.maxWeight)} kg
                    </title>
                    <rect
                      x={x - barWidth / 2}
                      y={y}
                      width={barWidth}
                      height={Math.max(height, 3)}
                      rx="4"
                      fill="url(#exercise-volume-gradient)"
                    />
                    <text
                      x={x}
                      y={PLOT_BOTTOM + 14}
                      fill="var(--accent-300)"
                      fontSize="9"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {formatNumber(session.volume)} kg
                    </text>
                    {showLabel && (
                      <text
                        x={x}
                        y={PLOT_BOTTOM + 30}
                        fill="#64748b"
                        fontSize="9"
                        textAnchor="middle"
                      >
                        {formatDate(session.date, { day: "2-digit", month: "2-digit" })}
                      </text>
                    )}
                  </g>
                );
              })}
              <defs>
                <linearGradient id="exercise-volume-gradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-300)" />
                  <stop offset="100%" stopColor="var(--accent)" />
                </linearGradient>
              </defs>
              <polyline
                points={weightPoints}
                fill="none"
                stroke="var(--accent-300)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {sessions.map((session, index) => {
                const x = PLOT_LEFT + step * (index + 0.5);
                const y = PLOT_BOTTOM - (session.maxWeight / maxWeight) * (PLOT_BOTTOM - PLOT_TOP);
                const showWeightLabel = sessions.length <= 10;
                return (
                  <g key={session.workoutId}>
                    <circle cx={x} cy={y} r="4" fill="var(--accent-300)" stroke="var(--accent)" strokeWidth="2">
                      <title>
                        Maksymalny ciężar: {formatNumber(session.maxWeight)} kg · {formatDate(session.date, { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </title>
                    </circle>
                    {showWeightLabel && (
                      <text
                        x={x}
                        y={Math.max(PLOT_TOP + 12, y - 9)}
                        fill="var(--accent-300)"
                        fontSize="9"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {formatNumber(session.maxWeight)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      ) : selected ? (
        <div className="empty-state min-h-0 border-0 py-10">
          <Dumbbell size={28} className="text-slate-600" />
          <p className="mb-0 mt-3">Brak zarejestrowanych serii dla tego ćwiczenia.</p>
        </div>
      ) : null}
    </div>
  );
}
