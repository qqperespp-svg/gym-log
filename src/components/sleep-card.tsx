"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BedDouble, CheckCircle2, LoaderCircle, Moon, RefreshCw, XCircle } from "lucide-react";
import { syncGoogleFitNowAction } from "@/actions/integrations";
import type { SleepLog } from "@/db/schema";

const DAY_MS = 86400000;
const SYNC_KEY = "gymrat:steps-last-sync"; // wspólny klucz z kartą Kroki — żeby nie dublować syncu
const AUTO_SYNC_MIN = 15;

function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function fmtHM(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

function fmtDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
}

/** Ocena jakości snu na podstawie efektywności (sen / (sen + czuwanie)). */
function quality(eff: number): { label: string; color: string } {
  if (eff >= 0.85) return { label: "Wysoka jakość", color: "text-emerald-300" };
  if (eff >= 0.75) return { label: "Dobra jakość", color: "text-lime-300" };
  return { label: "Do poprawy", color: "text-amber-300" };
}

/** Ocena jakości snu na podstawie długości snu (minuty). */
function durationQuality(min: number): { label: string; color: string } {
  if (min < 360) return { label: "Niska (poniżej 6h)", color: "text-rose-300" };
  if (min < 420) return { label: "Średnia (6–7h)", color: "text-amber-300" };
  return { label: "Wysoka (powyżej 7h)", color: "text-emerald-300" };
}

const STAGES = [
  { key: "deep", label: "Głęboki", color: "bg-indigo-400", text: "text-indigo-300" },
  { key: "rem", label: "REM", color: "bg-violet-400", text: "text-violet-300" },
  { key: "light", label: "Płytki", color: "bg-sky-400", text: "text-sky-300" },
  { key: "awake", label: "Czuwanie", color: "bg-slate-500", text: "text-slate-400" },
];

export function SleepCard({ logs }: { logs: SleepLog[] }) {
  const [syncing, startSync] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        router.refresh();
      } else if (!auto) {
        setMsg({ ok: false, text: res.message });
      }
      if (!auto) {
        if (msgTimer.current) clearTimeout(msgTimer.current);
        msgTimer.current = setTimeout(() => setMsg(null), 9000);
      }
    });
  }

  // Auto-sync po powrocie do aplikacji (np. po otwarciu Mi Fitness).
  const hasLogs = logs.length > 0;
  useEffect(() => {
    if (!hasLogs) return;
    const maybeAutoSync = () => {
      if (document.visibilityState !== "visible") return;
      try {
        const last = Number(localStorage.getItem(SYNC_KEY) ?? 0);
        if (Date.now() - last > AUTO_SYNC_MIN * 60000) doSync(true);
      } catch {
        /* ignore */
      }
    };
    maybeAutoSync();
    document.addEventListener("visibilitychange", maybeAutoSync);
    window.addEventListener("focus", maybeAutoSync);
    return () => {
      document.removeEventListener("visibilitychange", maybeAutoSync);
      window.removeEventListener("focus", maybeAutoSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLogs]);

  const byDate = useMemo(() => {
    const map = new Map<string, SleepLog>();
    for (const l of logs) {
      const key = localKey(startOfDay(new Date(l.date)));
      map.set(key, l);
    }
    return map;
  }, [logs]);

  // Ostatnia noc z danymi + 7 dni do mini-wykresu.
  const nights = useMemo(() => {
    const out: Array<{ key: string; date: Date; log: SleepLog | null }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfDay(new Date()).getTime() - i * DAY_MS);
      const k = localKey(d);
      out.push({ key: k, date: d, log: byDate.get(k) ?? null });
    }
    return out;
  }, [byDate]);

  const latestNight = useMemo(
    () => nights.filter((n) => n.log && n.log.totalMinutes > 0).reverse()[0] ?? null,
    [nights],
  );
  const log = latestNight?.log ?? null;

  const total = log ? log.totalMinutes : 0;
  const sleepMin = log
    ? log.lightMinutes + log.deepMinutes + log.remMinutes + log.asleepMinutes
    : 0;
  const eff = total > 0 ? sleepMin / total : 0;
  const q = quality(eff);

  const weekTotal = nights.reduce((s, n) => s + (n.log?.totalMinutes ?? 0), 0);

  return (
    <div className="panel p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-extrabold text-white">
          <Moon size={19} className="text-violet-400" /> Sen
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => doSync()}
            disabled={syncing}
            className="icon-button text-violet-400 hover:bg-violet-400/10 disabled:opacity-40"
            title="Synchronizuj sen z Google Fit"
            aria-label="Synchronizuj sen z Google Fit"
          >
            {syncing ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
          <span className="rounded-full bg-violet-400/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-300">
            {log ? "Ostatnia noc" : "Sen"}
          </span>
        </div>
      </div>

      {!log && (
        <div className="rounded-xl border border-violet-400/15 bg-violet-400/[.05] p-4 text-center">
          <BedDouble size={22} className="mx-auto mb-2 text-violet-300" />
          <p className="text-sm font-bold text-white">Brak danych o śnie</p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-400">
            Aby śledzić sen, rozłącz i połącz ponownie Google Fit — nowy zakres uprawnień
            (fitness.sleep.read) odblokuje dane o śnie z Twojej opaski.
          </p>
          <Link
            href="/settings"
            className="button-primary mt-3 inline-flex px-4 py-2 text-sm"
          >
            Ustawienia → Integracje
          </Link>
        </div>
      )}

      {log && (
        <>
          {/* Główna liczba: czas snu + jakość */}
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-500">
                {latestNight.date.toLocaleDateString("pl-PL", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <p className="mt-1 text-3xl font-black tracking-tight text-white">
                {fmtDur(total)}
                <span className="ml-2 text-sm font-black text-violet-300">{q.label}</span>
                <span className={`ml-2 text-sm font-black ${durationQuality(total).color}`}>
                  · {durationQuality(total).label}
                </span>
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {fmtHM(log.startAt)} – {fmtHM(log.endAt)} · efektywność{" "}
                {Math.round(eff * 100)}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                Tydzień
              </p>
              <p className="mt-0.5 text-xl font-black text-white">
                {weekTotal > 0 ? fmtDur(weekTotal) : "—"}
              </p>
            </div>
          </div>

          {/* Pasek faz — głęboki / REM / płytki / czuwanie */}
          <div className="mt-4 flex h-3.5 w-full overflow-hidden rounded-full bg-white/[.05]">
            {[
              { min: log.deepMinutes, color: "bg-indigo-400" },
              { min: log.remMinutes, color: "bg-violet-400" },
              { min: log.lightMinutes, color: "bg-sky-400" },
              { min: log.awakeMinutes, color: "bg-slate-500" },
            ].map((seg, i) =>
              seg.min > 0 ? (
                <div
                  key={i}
                  className={`${seg.color} transition-all`}
                  style={{ width: `${Math.max(1, (seg.min / total) * 100)}%` }}
                  title={`${Math.round((seg.min / total) * 100)}%`}
                />
              ) : null,
            )}
          </div>

          {/* Legenda faz */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STAGES.map((s) => {
              const min =
                s.key === "deep"
                  ? log.deepMinutes
                  : s.key === "rem"
                    ? log.remMinutes
                    : s.key === "light"
                      ? log.lightMinutes
                      : log.awakeMinutes;
              const pct = total > 0 ? Math.round((min / total) * 100) : 0;
              return (
                <div key={s.key} className="rounded-xl bg-white/[.03] px-3 py-2">
                  <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <span className={`size-2 rounded-full ${s.color}`} /> {s.label}
                  </p>
                  <p className={`mt-0.5 text-sm font-extrabold ${s.text}`}>
                    {fmtDur(min)} <span className="text-[10px] font-bold text-slate-500">· {pct}%</span>
                  </p>
                </div>
              );
            })}
          </div>

          {/* Mini-wykres 7 nocy — słupki faz */}
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-600">
              Ostatnie 7 nocy
            </p>
            <div className="flex h-24 items-end gap-1.5">
              {nights.map((n) => {
                const l = n.log;
                const totalN = l?.totalMinutes ?? 0;
                const seg = (min: number) =>
                  totalN > 0 ? `${Math.max(1, (min / Math.max(totalN, 300)) * 96)}%` : "0%";
                return (
                  <div key={n.key} className="group flex flex-1 flex-col items-center gap-1">
                    <div
                      className="flex w-full max-w-7 flex-col justify-end overflow-hidden rounded-md bg-white/[.04] transition group-hover:bg-white/[.07]"
                      style={{ height: "100%" }}
                      title={
                        l
                          ? `${n.date.toLocaleDateString("pl-PL", { weekday: "short", day: "numeric" })}: ${fmtDur(totalN)} (głęboki ${fmtDur(l.deepMinutes)}, REM ${fmtDur(l.remMinutes)}, płytki ${fmtDur(l.lightMinutes)})`
                          : `${n.date.toLocaleDateString("pl-PL", { weekday: "short", day: "numeric" })}: brak danych`
                      }
                    >
                      {l && totalN > 0 ? (
                        <>
                          <div className="w-full bg-indigo-400/80" style={{ height: seg(l.deepMinutes) }} />
                          <div className="w-full bg-violet-400/80" style={{ height: seg(l.remMinutes) }} />
                          <div className="w-full bg-sky-400/80" style={{ height: seg(l.lightMinutes) }} />
                          <div className="w-full bg-slate-500/70" style={{ height: seg(l.awakeMinutes) }} />
                        </>
                      ) : (
                        <div className="w-full rounded-md bg-white/[.04]" style={{ height: "12%" }} />
                      )}
                    </div>
                    <span className={`text-[9px] font-bold ${l ? "text-slate-400" : "text-slate-600"}`}>
                      {n.date.toLocaleDateString("pl-PL", { weekday: "short" }).slice(0, 2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {msg && (
        <p
          className={`mt-4 flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-bold ${
            msg.ok
              ? "border border-violet-400/20 bg-violet-400/[.07] text-violet-200"
              : "border border-rose-400/20 bg-rose-400/10 text-rose-300"
          }`}
        >
          {msg.ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <XCircle size={14} className="mt-0.5 shrink-0" />}
          <span>{msg.text}</span>
        </p>
      )}

      {hasLogs && (
        <p className="mt-4 border-t border-white/[.05] pt-3 text-[11px] leading-4 text-slate-500">
          Dane snu pochodzą z Google Fit (opaska Mi Fitness). Głęboki / REM / płytki / czuwanie —
          podział faz wg rejestracji Google.
        </p>
      )}
    </div>
  );
}
