"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { SleepLog } from "@/db/schema";

function fmtDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
}

function fmtHM(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

function quality(eff: number): { label: string; color: string } {
  if (eff >= 0.85) return { label: "Wysoka", color: "text-emerald-300" };
  if (eff >= 0.75) return { label: "Dobra", color: "text-lime-300" };
  return { label: "Do poprawy", color: "text-amber-300" };
}

function durationQuality(min: number): { label: string; color: string } {
  if (min < 360) return { label: "Niska (poniżej 6h)", color: "text-rose-300" };
  if (min < 420) return { label: "Średnia (6–7h)", color: "text-amber-300" };
  return { label: "Wysoka (powyżej 7h)", color: "text-emerald-300" };
}

type SleepNightRowProps = {
  log: SleepLog;
};

export function SleepNightRow({ log }: SleepNightRowProps) {
  const [open, setOpen] = useState(false);
  const total = log.totalMinutes;
  const sleepMin = log.lightMinutes + log.deepMinutes + log.remMinutes + log.asleepMinutes;
  const eff = total > 0 ? sleepMin / total : 0;

  return (
    <div className="divide-y divide-white/[.05]">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center gap-4 py-3 text-left transition hover:bg-white/[.02]"
        aria-expanded={open}
      >
        <div className="w-28 shrink-0">
          <p className="text-sm font-bold text-white">
            {log.date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-slate-600">
            {log.date.toLocaleDateString("pl-PL", { weekday: "short" })}
          </p>
        </div>
        <div className="flex h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[.05]">
          <div className="bg-indigo-400" style={{ width: `${(log.deepMinutes / Math.max(total, 1)) * 100}%` }} />
          <div className="bg-violet-400" style={{ width: `${(log.remMinutes / Math.max(total, 1)) * 100}%` }} />
          <div className="bg-sky-400" style={{ width: `${(log.lightMinutes / Math.max(total, 1)) * 100}%` }} />
          <div className="bg-slate-500" style={{ width: `${(log.awakeMinutes / Math.max(total, 1)) * 100}%` }} />
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-extrabold text-white">{fmtDur(total)}</p>
          <div className="flex flex-wrap gap-1 justify-end">
            <span className={`text-[10px] font-bold ${quality(eff).color}`}>{quality(eff).label}</span>
            <span className={`text-[10px] font-bold ${durationQuality(total).color}`}>
              · {durationQuality(total).label}
            </span>
          </div>
        </div>
        <span className="ml-1 shrink-0 text-slate-600">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {open && (
        <div className="bg-white/[.02] px-4 pb-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-white/[.05] bg-black/15 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Całkowity czas</p>
              <p className="text-sm font-extrabold text-white">{fmtDur(total)}</p>
            </div>
            <div className="rounded-xl border border-white/[.05] bg-black/15 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Efektywność</p>
              <p className="text-sm font-extrabold text-white">{Math.round(eff * 100)}%</p>
            </div>
            <div className="rounded-xl border border-white/[.05] bg-black/15 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Jakość (efektywność)</p>
              <p className={`text-sm font-extrabold ${quality(eff).color}`}>{quality(eff).label}</p>
            </div>
            <div className="rounded-xl border border-white/[.05] bg-black/15 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Jakość (długość)</p>
              <p className={`text-sm font-extrabold ${durationQuality(total).color}`}>
                {durationQuality(total).label}
              </p>
            </div>
            <div className="rounded-xl border border-white/[.05] bg-black/15 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Początek snu</p>
              <p className="text-sm font-extrabold text-white">{fmtHM(log.startAt)}</p>
            </div>
            <div className="rounded-xl border border-white/[.05] bg-black/15 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Koniec snu</p>
              <p className="text-sm font-extrabold text-white">{fmtHM(log.endAt)}</p>
            </div>
            <div className="rounded-xl border border-white/[.05] bg-black/15 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Głęboki</p>
              <p className="text-sm font-extrabold text-indigo-300">{fmtDur(log.deepMinutes)}</p>
            </div>
            <div className="rounded-xl border border-white/[.05] bg-black/15 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">REM</p>
              <p className="text-sm font-extrabold text-violet-300">{fmtDur(log.remMinutes)}</p>
            </div>
            <div className="rounded-xl border border-white/[.05] bg-black/15 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Płytki</p>
              <p className="text-sm font-extrabold text-sky-300">{fmtDur(log.lightMinutes)}</p>
            </div>
            <div className="rounded-xl border border-white/[.05] bg-black/15 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Czuwanie</p>
              <p className="text-sm font-extrabold text-slate-300">{fmtDur(log.awakeMinutes)}</p>
            </div>
            <div className="rounded-xl border border-white/[.05] bg-black/15 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Asleep (sen ogólny)</p>
              <p className="text-sm font-extrabold text-violet-300">{fmtDur(log.asleepMinutes)}</p>
            </div>
            <div className="rounded-xl border border-white/[.05] bg-black/15 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Źródło</p>
              <p className="text-sm font-extrabold text-white">{log.source}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
