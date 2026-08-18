import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, CalendarDays, CheckCircle2, UtensilsCrossed } from "lucide-react";
import { db } from "@/db";
import { dietGoals, dietLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { WEEKDAYS, startOfWeek, weekdayOf } from "@/lib/diet";
import { logDietKcalAction } from "@/actions/diet";
import { DietGoalsForm } from "@/components/diet-goals-form";
import { DeleteDietLogButton } from "@/components/delete-diet-log-button";

export const dynamic = "force-dynamic";

export default async function MichaPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [goals, logs] = await Promise.all([
    db.select().from(dietGoals).where(eq(dietGoals.userId, user.id)),
    db.select().from(dietLogs).where(eq(dietLogs.userId, user.id)).orderBy(desc(dietLogs.date), desc(dietLogs.id)),
  ]);
  const goalByWeekday = new Map(goals.map((goal) => [goal.weekday, goal]));
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

  // Spożycie w bieżącym tygodniu (pon.–niedz.) pogrupowane wg dnia tygodnia.
  const consumedByWeekday = new Map<number, number>();
  for (const log of logs) {
    if (log.date >= weekStart && log.date < weekEnd) {
      const wd = weekdayOf(log.date);
      consumedByWeekday.set(wd, (consumedByWeekday.get(wd) ?? 0) + (log.kcal ?? 0));
    }
  }
  const thisWeekTotal = logs
    .filter((log) => log.date >= weekStart && log.date < weekEnd)
    .reduce((sum, log) => sum + (log.kcal ?? 0), 0);
  const thisWeekGoal = WEEKDAYS.reduce(
    (sum, { n }) => sum + (goalByWeekday.get(n)?.kcalGoal ?? 0),
    0,
  );

  return (
    <div className="space-y-7">
      <header>
        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white"
        >
          <ArrowLeft size={16} /> Wróć do dashboardu
        </Link>
        <p className="eyebrow">Dieta i spożycie</p>
        <h1 className="page-title flex items-center gap-3">
          <UtensilsCrossed size={32} className="text-lime-400" /> Micha
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Ustaw dzienne cele kcal liczone z białka, tłuszczy i węglowodanów oraz zapisuj, ile kcal
          spożywasz każdego dnia.
        </p>
      </header>

      {params.saved === "1" && (
        <div className="flex items-center gap-3 rounded-xl border border-lime-400/20 bg-lime-400/[.08] px-4 py-3 text-sm font-bold text-lime-200">
          <CheckCircle2 size={18} /> Zapisano. ✅
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="stat-card">
          <span className="stat-icon stat-lime">
            <UtensilsCrossed size={21} />
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-500">Spożyte w tym tygodniu</p>
            <strong className="mt-1 block text-2xl font-black tracking-tight text-white">
              {thisWeekTotal.toLocaleString("pl-PL")} kcal
            </strong>
            <p className="mt-1 text-[11px] text-slate-600">Poniedziałek – niedziela</p>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon stat-blue">
            <CalendarDays size={21} />
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-500">Cel tygodniowy</p>
            <strong className="mt-1 block text-2xl font-black tracking-tight text-white">
              {thisWeekGoal > 0 ? `${thisWeekGoal.toLocaleString("pl-PL")} kcal` : "—"}
            </strong>
            <p className="mt-1 text-[11px] text-slate-600">
              {thisWeekGoal > 0
                ? `Jeszcze ${Math.max(0, thisWeekGoal - thisWeekTotal).toLocaleString("pl-PL")} kcal`
                : "Ustaw cele poniżej"}
            </p>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon stat-amber">
            <CalendarDays size={21} />
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-500">Średnia dzienna</p>
            <strong className="mt-1 block text-2xl font-black tracking-tight text-white">
              {Math.round(thisWeekTotal / Math.max(1, weekdayOf(new Date()))).toLocaleString("pl-PL")} kcal
            </strong>
            <p className="mt-1 text-[11px] text-slate-600">Od poniedziałku do dzisiaj</p>
          </div>
        </article>
      </section>

      <section className="panel p-5 sm:p-7">
        <h2 className="font-extrabold text-white mb-1">Cele na dni tygodnia</h2>
        <p className="mb-5 text-sm text-slate-500">
          kcal = białko × 4 + węglowodany × 4 + tłuszcze × 9 (na gram)
        </p>
        <DietGoalsForm goals={goals} />
      </section>

      <section className="panel p-5 sm:p-7">
        <h2 className="font-extrabold text-white mb-1">Dziennik spożycia</h2>
        <p className="mb-5 text-sm text-slate-500">
          Dodaj, ile kcal spożyłeś w danym dniu — podsumowanie tygodnia zobaczysz na dashboardzie.
        </p>
        <form action={logDietKcalAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="field-label">
            Data
            <input
              type="date"
              name="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="input"
              required
            />
          </label>
          <label className="field-label">
            Spożyte kcal
            <input
              className="input"
              name="kcal"
              type="number"
              min="0"
              max="20000"
              step="1"
              placeholder="np. 2400"
              required
            />
          </label>
          <label className="field-label sm:col-span-2 lg:col-span-2">
            Notatka (opcjonalnie)
            <input
              className="input"
              name="note"
              type="text"
              maxLength={200}
              placeholder="np. śniadanie, trening, cheat day…"
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" className="button-primary">
              Dodaj wpis
            </button>
          </div>
        </form>

        <div className="mt-8">
          <h3 className="mb-3 text-sm font-extrabold text-white">Ostatnie wpisy</h3>
          {logs.length ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Dzień</th>
                    <th>kcal</th>
                    <th>Cel dnia</th>
                    <th>Notatka</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 30).map((log) => {
                    const goal = goalByWeekday.get(weekdayOf(log.date))?.kcalGoal ?? null;
                    return (
                      <tr key={log.id}>
                        <td className="font-bold text-white">
                          {log.date.toLocaleDateString("pl-PL")}
                        </td>
                        <td>{WEEKDAYS[weekdayOf(log.date) - 1]?.short}</td>
                        <td>{log.kcal.toLocaleString("pl-PL")}</td>
                        <td>{goal ? `${goal.toLocaleString("pl-PL")} kcal` : "—"}</td>
                        <td className="text-slate-400">{log.note ?? "—"}</td>
                        <td className="flex gap-1">
                          <DeleteDietLogButton id={log.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[.07] bg-black/15 p-6 text-center">
              <p className="text-sm text-slate-500">Brak wpisów. Dodaj pierwsze kcal!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
