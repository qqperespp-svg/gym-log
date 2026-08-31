import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, ArrowUpRight, Award, BedDouble, Clock, Moon, TrendingUp } from "lucide-react";
import { db } from "@/db";
import { sleepLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { SleepNightRow } from "@/components/sleep-night-row";

export const dynamic = "force-dynamic";

function fmtDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
}

function fmtHM(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });
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

export default async function SleepPage() {
  const user = await requireUser();
  const logs = await db
    .select()
    .from(sleepLogs)
    .where(eq(sleepLogs.userId, user.id))
    .orderBy(desc(sleepLogs.date))
    .limit(60);

  const nights = [...logs].sort((a, b) => a.date.getTime() - b.date.getTime());
  const last7 = nights.slice(-7);
  const last30 = nights.slice(-30);

  const avg = (arr: typeof nights, f: (l: (typeof nights)[number]) => number) => {
    if (!arr.length) return 0;
    return arr.reduce((s, l) => s + f(l), 0) / arr.length;
  };
  const avgTotal7 = avg(last7, (l) => l.totalMinutes);
  const avgTotal30 = avg(last30, (l) => l.totalMinutes);
  const avgDeep7 = avg(last7, (l) => l.deepMinutes);
  const avgRem7 = avg(last7, (l) => l.remMinutes);
  const avgLight7 = avg(last7, (l) => l.lightMinutes);
  const avgAwake7 = avg(last7, (l) => l.awakeMinutes);
  const best = nights.reduce((m, l) => (l.totalMinutes > m.totalMinutes ? l : m), nights[0] ?? null);
  const eff = (l: (typeof nights)[number]) =>
    l.totalMinutes > 0 ? (l.lightMinutes + l.deepMinutes + l.remMinutes + l.asleepMinutes) / l.totalMinutes : 0;

  const maxMinutes = Math.max(...last30.map((l) => l.totalMinutes), 1);
  const today = nights[nights.length - 1] ?? null;

  return (
    <div className="space-y-7">
      <header>
        <Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white">
          <ArrowLeft size={16} /> Wróć do dashboardu
        </Link>
        <p className="eyebrow">Regeneracja</p>
        <h1 className="page-title flex items-center gap-3">
          <Moon size={32} className="text-violet-400" /> Sen
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Statystyki snu z Google Fit — czas, fazy (głęboki / REM / płytki) i czuwanie. Dane z Twojej
          opaski synchronizowane przez Mi Fitness → Google Fit.
        </p>
      </header>

      {!nights.length && (
        <section className="panel p-8 text-center">
          <BedDouble size={28} className="mx-auto mb-3 text-violet-300" />
          <p className="font-extrabold text-white">Brak danych o śnie</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            Połącz Google Fit (Ustawienia → Integracje) z nowym zakresem uprawnień, a dane o śnie
            pojawią się po synchronizacji.
          </p>
        </section>
      )}

      {today && (
        <section className="panel overflow-hidden p-5 sm:p-7">
          <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="eyebrow">Ostatnia noc</p>
              <p className="mt-1 text-4xl font-black tracking-tight text-white">{fmtDur(today.totalMinutes)}</p>
              <p className="mt-1 text-sm text-slate-400">
                {today.date.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })} ·{" "}
                {fmtHM(today.startAt)} – {fmtHM(today.endAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/[.07] bg-black/15 px-4 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Jakość</p>
                <p className={`mt-1 text-sm font-extrabold ${quality(eff(today)).color}`}>{quality(eff(today)).label}</p>
              </div>
              <div className="rounded-2xl border border-white/[.07] bg-black/15 px-4 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Efektywność</p>
                <p className="mt-1 text-sm font-extrabold text-white">{Math.round(eff(today) * 100)}%</p>
              </div>
              <div className="rounded-2xl border border-white/[.07] bg-black/15 px-4 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Jakość długości</p>
                <p className={`mt-1 text-sm font-extrabold ${durationQuality(today.totalMinutes).color}`}>
                  {durationQuality(today.totalMinutes).label}
                </p>
              </div>
              <div className="rounded-2xl border border-white/[.07] bg-black/15 px-4 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Czuwanie</p>
                <p className="mt-1 text-sm font-extrabold text-white">{fmtDur(today.awakeMinutes)}</p>
              </div>
            </div>
          </div>
          {/* Pasek faz */}
          <div className="mt-5 flex h-4 w-full overflow-hidden rounded-full bg-white/[.05]">
            {[
              { min: today.deepMinutes, color: "bg-indigo-400" },
              { min: today.remMinutes, color: "bg-violet-400" },
              { min: today.lightMinutes, color: "bg-sky-400" },
              { min: today.awakeMinutes, color: "bg-slate-500" },
            ].map((seg, i) =>
              seg.min > 0 ? (
                <div key={i} className={seg.color} style={{ width: `${Math.max(1, (seg.min / today.totalMinutes) * 100)}%` }} />
              ) : null,
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Głęboki", min: today.deepMinutes, color: "bg-indigo-400", text: "text-indigo-300" },
              { label: "REM", min: today.remMinutes, color: "bg-violet-400", text: "text-violet-300" },
              { label: "Płytki", min: today.lightMinutes, color: "bg-sky-400", text: "text-sky-300" },
              { label: "Czuwanie", min: today.awakeMinutes, color: "bg-slate-500", text: "text-slate-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/[.03] px-3 py-2">
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <span className={`size-2 rounded-full ${s.color}`} /> {s.label}
                </p>
                <p className={`mt-0.5 text-sm font-extrabold ${s.text}`}>
                  {fmtDur(s.min)}{" "}
                  <span className="text-[10px] font-bold text-slate-500">
                    · {today.totalMinutes > 0 ? Math.round((s.min / today.totalMinutes) * 100) : 0}%
                  </span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Średnie */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Śr. sen (7 dni)", value: fmtDur(avgTotal7), icon: Clock, color: "text-violet-300" },
          { label: "Śr. sen (30 dni)", value: fmtDur(avgTotal30), icon: TrendingUp, color: "text-sky-300" },
          { label: "Śr. głęboki (7 dni)", value: fmtDur(avgDeep7), icon: Moon, color: "text-indigo-300" },
          {
            label: "Najlepsza noc",
            value: best ? fmtDur(best.totalMinutes) : "—",
            icon: Award,
            color: "text-amber-300",
          },
        ].map((c) => (
          <div key={c.label} className="panel p-5">
            <c.icon size={18} className={c.color} />
            <p className="mt-2 text-2xl font-black text-white">{c.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{c.label}</p>
          </div>
        ))}
      </section>

      {/* Wykres 30 nocy */}
      {last30.length > 0 && (
        <section className="panel p-5 sm:p-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-extrabold text-white">30 ostatnich nocy</h2>
            <span className="text-xs text-slate-500">wysokość słupka = czas snu</span>
          </div>
          <div className="flex h-40 items-end gap-1">
            {last30.map((l) => {
              const h = Math.max(3, (l.totalMinutes / maxMinutes) * 100);
              const day = l.date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
              return (
                <div
                  key={l.id}
                  className="group relative flex h-full flex-1 flex-col justify-end"
                  title={`${l.date.toLocaleDateString("pl-PL")}: ${fmtDur(l.totalMinutes)}`}
                >
                  <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-md">
                    <div className="w-full bg-indigo-400/80" style={{ height: `${(l.deepMinutes / maxMinutes) * 100}%` }} />
                    <div className="w-full bg-violet-400/80" style={{ height: `${(l.remMinutes / maxMinutes) * 100}%` }} />
                    <div className="w-full bg-sky-400/80" style={{ height: `${(l.lightMinutes / maxMinutes) * 100}%` }} />
                    <div className="w-full bg-slate-500/70" style={{ height: `${(l.awakeMinutes / maxMinutes) * 100}%` }} />
                  </div>
                  <span className="mt-1 hidden text-[9px] font-bold text-slate-600 group-hover:block">
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-indigo-400" /> Głęboki</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-violet-400" /> REM</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-sky-400" /> Płytki</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-500" /> Czuwanie</span>
          </div>
        </section>
      )}

      {/* Tabela nocy */}
      {nights.length > 0 && (
        <section className="panel p-5 sm:p-7">
          <h2 className="font-extrabold text-white">Historia nocy</h2>
          <p className="mt-1 text-[11px] text-slate-500">Kliknij noc, aby rozwinąć wszystkie parametry.</p>
          <div className="mt-4">
            {nights
              .slice()
              .reverse()
              .slice(0, 30)
              .map((l) => (
                <SleepNightRow key={l.id} log={l} />
              ))}
          </div>
          <p className="mt-3 text-right text-[11px] text-slate-600">
            <ArrowUpRight size={12} className="inline" /> Najlepsza noc:{" "}
            {best ? `${best.date.toLocaleDateString("pl-PL")} · ${fmtDur(best.totalMinutes)}` : "—"}
          </p>
        </section>
      )}

      <Link href="/dashboard" className="text-link inline-flex items-center gap-2">
        <ArrowLeft size={15} /> Wróć do dashboardu
      </Link>
    </div>
  );
}
