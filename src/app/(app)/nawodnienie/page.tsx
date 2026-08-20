import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, CheckCircle2, Droplets, GlassWater, Trash2 } from "lucide-react";
import { db } from "@/db";
import { userSettings, waterLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { deleteWaterLogAction, logWaterAction } from "@/actions/water";
import { WaterOffline } from "@/components/water-offline";

export const dynamic = "force-dynamic";

export default async function HydrationPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [settings, logs] = await Promise.all([
    db.select().from(userSettings).where(eq(userSettings.userId, user.id)).limit(1),
    db.select().from(waterLogs).where(eq(waterLogs.userId, user.id)).orderBy(desc(waterLogs.date), desc(waterLogs.id)),
  ]);
  const goal = settings?.[0]?.waterGoal ?? 2.5;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrow = new Date(todayStart.getTime() + 86400000);
  const todayLogs = logs.filter((l) => l.date >= todayStart && l.date < tomorrow);
  const todayLiters = todayLogs.reduce((s, l) => s + (l.liters ?? 0), 0);
  const pct = Math.min(100, Math.round((todayLiters / goal) * 100));

  return (
    <div className="space-y-7">
      <header>
        <Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white">
          <ArrowLeft size={16} /> Wróć do dashboardu
        </Link>
        <p className="eyebrow">Nawodnienie</p>
        <h1 className="page-title flex items-center gap-3">
          <Droplets size={32} className="text-sky-400" /> Nawodnienie
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Loguj wypitą wodę — cel dzienny i pasek postępu (cel ustawisz w Ustawieniach).
        </p>
      </header>

      {params.saved === "1" && (
        <div className="flex items-center gap-3 rounded-xl border border-lime-400/20 bg-lime-400/[.08] px-4 py-3 text-sm font-bold text-lime-200">
          <CheckCircle2 size={18} /> Zapisano. ✅
        </div>
      )}

      <section className="panel p-5 sm:p-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-white">Dzisiaj</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {todayLiters.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} l / {goal.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} l
            </p>
          </div>
          <b className="text-3xl font-black text-sky-300">{pct}%</b>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/[.05]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-300 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <WaterOffline />

        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[0.25, 0.33, 0.5, 1].map((liters) => (
            <form key={liters} action={logWaterAction} className="contents">
              <input type="hidden" name="date" value={today.toISOString().slice(0, 10)} />
              <input type="hidden" name="liters" value={liters} />
              <button type="submit" className="flex items-center justify-center gap-2 rounded-xl border border-sky-400/20 bg-sky-400/[.06] px-4 py-3 text-sm font-bold text-sky-200 transition hover:bg-sky-400/15">
                <GlassWater size={16} /> +{liters.toLocaleString("pl-PL")} l
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="panel p-5 sm:p-7">
        <h2 className="mb-4 font-extrabold text-white">Ostatnie wpisy</h2>
        {logs.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Ilość</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 30).map((l) => (
                  <tr key={l.id}>
                    <td className="font-bold text-white">{l.date.toLocaleDateString("pl-PL")}</td>
                    <td className="font-bold text-sky-300">{l.liters.toLocaleString("pl-PL")} l</td>
                    <td>
                      <form action={deleteWaterLogAction.bind(null, l.id)}>
                        <button type="submit" className="button-secondary px-2 py-1 text-xs text-rose-300 hover:text-rose-200">
                          <Trash2 size={13} /> Usuń
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Brak wpisów — dodaj pierwszą szklankę.</p>
        )}
      </section>
    </div>
  );
}
