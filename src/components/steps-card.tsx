"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Footprints, LoaderCircle, RefreshCw, XCircle } from "lucide-react";
import { syncGoogleFitNowAction } from "@/actions/integrations";
import type { FitnessLog } from "@/db/schema";

const DAY_MS = 86400000;
const STEP_GOAL = 10000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function fmtDay(d: Date): string {
  return d.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" });
}

export function StepsCard({ logs }: { logs: FitnessLog[] }) {
  const [day, setDay] = useState<Date>(() => startOfDay(new Date()));
  const [syncing, startSync] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function doSync() {
    setMsg(null);
    startSync(async () => {
      const res = await syncGoogleFitNowAction();
      setMsg({ ok: res.ok, text: res.message });
      if (res.ok) router.refresh(); // odśwież dane kafelka po synchronizacji
      if (msgTimer.current) clearTimeout(msgTimer.current);
      msgTimer.current = setTimeout(() => setMsg(null), 8000);
    });
  }

  // Mapa kroków po dacie (klucz YYYY-MM-DD).
  const byDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of logs) {
      const d = startOfDay(new Date(l.date));
      const key = d.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + (l.steps ?? 0));
    }
    return map;
  }, [logs]);

  const key = day.toISOString().slice(0, 10);
  const steps = byDate.get(key) ?? 0;
  const pct = Math.min(100, Math.round((steps / STEP_GOAL) * 100));
  const remaining = Math.max(0, STEP_GOAL - steps);
  const isToday = key === startOfDay(new Date()).toISOString().slice(0, 10);

  // 7 dni do szybkiego podglądu (od najbliższego poniedziałku? prościej: ostatnie 7 dni wstecz)
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(day.getTime() - (6 - i) * DAY_MS);
        return { date: d, key: d.toISOString().slice(0, 10), steps: byDate.get(d.toISOString().slice(0, 10)) ?? 0 };
      }),
    [day, byDate],
  );

  return (
    <div className="panel p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-extrabold text-white">
          <Footprints size={19} className="text-lime-400" /> Kroki
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={doSync}
            disabled={syncing}
            className="icon-button text-lime-400 hover:bg-lime-400/10 disabled:opacity-40"
            title="Synchronizuj kroki z Google Fit"
            aria-label="Synchronizuj kroki z Google Fit"
          >
            {syncing ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
          <LinkText isToday={isToday} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setDay((d) => new Date(d.getTime() - DAY_MS))}
          className="icon-button"
          aria-label="Poprzedni dzień"
          title="Poprzedni dzień"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-xs font-bold text-slate-500">{fmtDay(day)}</p>
          <p className="mt-1 text-3xl font-black tracking-tight text-white">
            {steps.toLocaleString("pl-PL")}
            <span className="ml-1 text-sm font-bold text-slate-500">kroków</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            {steps >= STEP_GOAL
              ? "Cel osiągnięty 🎉"
              : `do celu ${remaining.toLocaleString("pl-PL")}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDay((d) => new Date(d.getTime() + DAY_MS))}
          disabled={isToday}
          className="icon-button disabled:opacity-20"
          aria-label="Następny dzień"
          title="Następny dzień"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/[.05]">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-gradient-to-r from-lime-500 to-lime-300" : "bg-gradient-to-r from-sky-500 to-sky-300"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {msg && (
        <p
          className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-bold ${
            msg.ok
              ? "border border-lime-400/20 bg-lime-400/[.07] text-lime-300"
              : "border border-rose-400/20 bg-rose-400/10 text-rose-300"
          }`}
        >
          {msg.ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <XCircle size={14} className="mt-0.5 shrink-0" />}
          <span>{msg.text}</span>
        </p>
      )}

      {/* miniatura 7 dni */}
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {week.map((w) => {
          const active = w.key === key;
          const p = Math.min(100, Math.round((w.steps / STEP_GOAL) * 100));
          return (
            <button
              key={w.key}
              type="button"
              onClick={() => setDay(w.date)}
              className={`rounded-lg px-1 py-1.5 text-center transition ${
                active ? "bg-lime-400/15 ring-1 ring-lime-400/40" : "bg-white/[.03] hover:bg-white/[.07]"
              }`}
              title={`${w.date.toLocaleDateString("pl-PL")}: ${w.steps.toLocaleString("pl-PL")} kroków`}
            >
              <span className={`block text-[9px] font-black uppercase tracking-wide ${active ? "text-lime-300" : "text-slate-500"}`}>
                {w.date.toLocaleDateString("pl-PL", { weekday: "short" })}
              </span>
              <span className={`block text-xs font-bold ${active ? "text-white" : "text-slate-400"}`}>
                {(w.steps / 1000).toLocaleString("pl-PL", { maximumFractionDigits: 1 })}k
              </span>
              <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/[.06]">
                <span className={`block h-full rounded-full ${p >= 100 ? "bg-lime-400" : "bg-sky-400"}`} style={{ width: `${Math.max(3, p)}%` }} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LinkText({ isToday }: { isToday: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${isToday ? "bg-lime-400/15 text-lime-300" : "bg-white/[.04] text-slate-500"}`}>
      {isToday ? "Dzisiaj" : "Historia"}
    </span>
  );
}
