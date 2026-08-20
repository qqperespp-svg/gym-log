"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Footprints, LoaderCircle, RefreshCw, XCircle } from "lucide-react";
import { syncGoogleFitNowAction } from "@/actions/integrations";
import type { FitnessLog } from "@/db/schema";

const DAY_MS = 86400000;
const STEP_GOAL = 10000;
const SYNC_KEY = "gymrat:steps-last-sync";
const AUTO_SYNC_MIN = 15; // minimalny odstęp automatycznej synchronizacji (minuty)

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Klucz daty LOKALNEJ (YYYY-MM-DD) — bez przesunięcia UTC. */
function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDay(d: Date): string {
  return d.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" });
}

function lastSyncAt(): number {
  try {
    const v = Number(localStorage.getItem(SYNC_KEY) ?? 0);
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

export function StepsCard({ logs }: { logs: FitnessLog[] }) {
  const [day, setDay] = useState<Date>(() => startOfDay(new Date()));
  const [syncing, startSync] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-sync: tylko gdy integracja była już używana (są dane) i minął odstęp.
  const hasSyncHistory = logs.length > 0;

  /** `auto` = cicha synchronizacja w tle (bez komunikatu). */
  function doSync(auto = false) {
    if (syncing) return;
    if (!auto) setMsg(null);
    startSync(async () => {
      const res = await syncGoogleFitNowAction(-new Date().getTimezoneOffset());
      if (res.ok) {
        try {
          localStorage.setItem(SYNC_KEY, String(Date.now()));
        } catch {
          /* ignore */
        }
        if (!auto) setMsg({ ok: true, text: res.message });
        router.refresh(); // odśwież dane kafelka po synchronizacji
      } else if (!auto) {
        setMsg({ ok: false, text: res.message });
      }
      if (!auto) {
        if (msgTimer.current) clearTimeout(msgTimer.current);
        msgTimer.current = setTimeout(() => setMsg(null), 8000);
      }
    });
  }

  // Po otwarciu Mi Fitness (który wysyła kroki do Google Fit) i powrocie do
  // aplikacji automatycznie pobieramy najnowsze kroki — bez klikania ⟳.
  useEffect(() => {
    if (!hasSyncHistory) return;
    const maybeAutoSync = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastSyncAt() > AUTO_SYNC_MIN * 60000) doSync(true);
    };
    maybeAutoSync();
    document.addEventListener("visibilitychange", maybeAutoSync);
    window.addEventListener("focus", maybeAutoSync);
    return () => {
      document.removeEventListener("visibilitychange", maybeAutoSync);
      window.removeEventListener("focus", maybeAutoSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSyncHistory]);

  // Mapa kroków po dacie (klucz YYYY-MM-DD).
  // Bierzemy MAKSIMUM, nie sumę: gdyby w bazie znalazły się dwa wiersze tego
  // samego dnia (dawna usterka — sync z Ustawień i z dashboardu zapisywał
  // dzień pod dwoma timestampami), suma podwajała wynik; max daje właściwą
  // wartość (kroki w ciągu dnia tylko rosną, więc max = najnowszy zrzut).
  const byDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of logs) {
      const d = startOfDay(new Date(l.date));
      const key = localKey(d);
      map.set(key, Math.max(map.get(key) ?? 0, l.steps ?? 0));
    }
    return map;
  }, [logs]);

  const key = localKey(day);
  const steps = byDate.get(key) ?? 0;
  const pct = Math.min(100, Math.round((steps / STEP_GOAL) * 100));
  const remaining = Math.max(0, STEP_GOAL - steps);
  const isToday = key === localKey(new Date());

  // 7 dni do szybkiego podglądu (od najbliższego poniedziałku? prościej: ostatnie 7 dni wstecz)
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(day.getTime() - (6 - i) * DAY_MS);
        return { date: d, key: localKey(d), steps: byDate.get(localKey(d)) ?? 0 };
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
            onClick={() => doSync()}
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

      {hasSyncHistory && (
        <p className="mt-4 border-t border-white/[.05] pt-3 text-[11px] leading-4 text-slate-500">
          Opaska wysyła kroki do Google Fit po otwarciu aplikacji Mi Fitness — po powrocie Gymrat
          zsynchronizuje się automatycznie. Źródła nigdy nie są sumowane.
        </p>
      )}
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
