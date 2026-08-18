import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, CheckCircle2, Dumbbell, Sofa, UtensilsCrossed } from "lucide-react";
import { db } from "@/db";
import { dietGoals, dietLogs, type DietLog } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { WEEKDAYS, startOfWeek, weekdayOf } from "@/lib/diet";
import { DietGoalsForm } from "@/components/diet-goals-form";
import { DietLogForm } from "@/components/diet-log-form";
import { DeleteDietLogButton } from "@/components/delete-diet-log-button";
import { MacroBar } from "@/components/macro-bar";
import { BarcodeScanner } from "@/components/barcode-scanner";

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

  // ----- Sumy makro -----
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrow = new Date(todayStart.getTime() + 86400000);
  const inRange = (log: DietLog, from: Date, to: Date) => log.date >= from && log.date < to;

  const sum = (items: DietLog[]) =>
    items.reduce(
      (acc, log) => ({
        protein: acc.protein + (log.protein ?? 0),
        fat: acc.fat + (log.fat ?? 0),
        carbs: acc.carbs + (log.carbs ?? 0),
        kcal: acc.kcal + (log.kcal ?? 0),
      }),
      { protein: 0, fat: 0, carbs: 0, kcal: 0 },
    );

  const todayLogs = logs.filter((log) => inRange(log, todayStart, tomorrow));
  const weekLogs = logs.filter((log) => inRange(log, weekStart, weekEnd));
  const todaySum = sum(todayLogs);
  const weekSum = sum(weekLogs);

  // ----- Cele -----
  const todayWeekday = weekdayOf(today);
  const todayGoal = goalByWeekday.get(todayWeekday);
  const weekGoal = WEEKDAYS.reduce(
    (acc, { n }) => {
      const g = goalByWeekday.get(n);
      return {
        protein: acc.protein + (g?.protein ?? 0),
        fat: acc.fat + (g?.fat ?? 0),
        carbs: acc.carbs + (g?.carbs ?? 0),
        kcal: acc.kcal + (g?.kcalGoal ?? 0),
      };
    },
    { protein: 0, fat: 0, carbs: 0, kcal: 0 },
  );
  const isTrainingDay = todayGoal?.trainingDay === 1;

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
          Wpisz białko, tłuszcze i węglowodany — kcal liczą się automatycznie. Sprawdzaj, ile
          jeszcze zostało do zjedzenia w ciągu dnia i tygodnia.
        </p>
      </header>

      {params.saved === "1" && (
        <div className="flex items-center gap-3 rounded-xl border border-lime-400/20 bg-lime-400/[.08] px-4 py-3 text-sm font-bold text-lime-200">
          <CheckCircle2 size={18} /> Zapisano. ✅
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-2">
        {/* DZIŚ */}
        <div className="panel p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-extrabold text-white">
                Dzisiaj · {WEEKDAYS[todayWeekday - 1]?.label}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">Spożycie vs cel dzienny</p>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${
                isTrainingDay
                  ? "bg-lime-400/15 text-lime-300 ring-lime-400/40"
                  : "bg-white/[.04] text-slate-400 ring-white/10"
              }`}
            >
              {isTrainingDay ? <Dumbbell size={13} /> : <Sofa size={13} />}
              {isTrainingDay ? "Dzień treningowy" : "Dzień wolny"}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MacroBar
              label="Kalorie"
              consumed={todaySum.kcal}
              target={todayGoal?.kcalGoal ?? 0}
              unit="kcal"
              barClass="bg-lime-400"
            />
            <MacroBar
              label="Białko"
              consumed={todaySum.protein}
              target={todayGoal?.protein ?? 0}
              unit="g"
              barClass="bg-sky-400"
            />
            <MacroBar
              label="Tłuszcze"
              consumed={todaySum.fat}
              target={todayGoal?.fat ?? 0}
              unit="g"
              barClass="bg-amber-400"
            />
            <MacroBar
              label="Węglowodany"
              consumed={todaySum.carbs}
              target={todayGoal?.carbs ?? 0}
              unit="g"
              barClass="bg-rose-400"
            />
          </div>
        </div>

        {/* TYDZIEŃ */}
        <div className="panel p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-extrabold text-white">Ten tydzień</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Poniedziałek – niedziela · spożycie vs cele tygodniowe
              </p>
            </div>
            <span className="rounded-full bg-white/[.04] px-3 py-1.5 text-xs font-bold text-slate-400 ring-1 ring-white/10">
              {weekSum.kcal.toLocaleString("pl-PL")} /{" "}
              {weekGoal.kcal.toLocaleString("pl-PL")} kcal
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MacroBar
              label="Kalorie"
              consumed={weekSum.kcal}
              target={weekGoal.kcal}
              unit="kcal"
              barClass="bg-lime-400"
            />
            <MacroBar
              label="Białko"
              consumed={weekSum.protein}
              target={weekGoal.protein}
              unit="g"
              barClass="bg-sky-400"
            />
            <MacroBar
              label="Tłuszcze"
              consumed={weekSum.fat}
              target={weekGoal.fat}
              unit="g"
              barClass="bg-amber-400"
            />
            <MacroBar
              label="Węglowodany"
              consumed={weekSum.carbs}
              target={weekGoal.carbs}
              unit="g"
              barClass="bg-rose-400"
            />
          </div>
        </div>
      </section>

      <section className="panel p-5 sm:p-7">
        <h2 className="font-extrabold text-white mb-1">Cele na dni tygodnia</h2>
        <p className="mb-5 text-sm text-slate-500">
          kcal = białko × 4 + węglowodany × 4 + tłuszcze × 9 (na gram). Oznacz, czy dany dzień jest
          treningowy czy wolny.
        </p>
        <DietGoalsForm goals={goals} />
      </section>

      <section className="panel p-5 sm:p-7">
        <h2 className="font-extrabold text-white mb-1">Skanuj kod kreskowy</h2>
        <p className="mb-5 text-sm text-slate-500">
          Jak w Fitatu — zeskanuj kod produktu, a makro i kcal podstawią się automatycznie z bazy
          Open Food Facts. Wpisz gramaturę i dodaj do dziennika.
        </p>
        <BarcodeScanner />
      </section>

      <section className="panel p-5 sm:p-7">
        <h2 className="font-extrabold text-white mb-1">Dziennik spożycia</h2>
        <p className="mb-5 text-sm text-slate-500">
          Dodaj posiłek — podaj białko, tłuszcze i węglowodany, a kcal policzą się same.
        </p>
        <DietLogForm />

        <div className="mt-8">
          <h3 className="mb-3 text-sm font-extrabold text-white">Ostatnie wpisy</h3>
          {logs.length ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Dzień</th>
                    <th>Białko</th>
                    <th>Tłuszcze</th>
                    <th>Węgl.</th>
                    <th>kcal</th>
                    <th>Cel dnia</th>
                    <th>Notatka</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 30).map((log) => {
                    const goal = goalByWeekday.get(weekdayOf(log.date));
                    return (
                      <tr key={log.id}>
                        <td className="font-bold text-white">
                          {log.date.toLocaleDateString("pl-PL")}
                        </td>
                        <td>{WEEKDAYS[weekdayOf(log.date) - 1]?.short}</td>
                        <td>{log.protein ?? 0} g</td>
                        <td>{log.fat ?? 0} g</td>
                        <td>{log.carbs ?? 0} g</td>
                        <td className="font-bold text-lime-300">{log.kcal.toLocaleString("pl-PL")}</td>
                        <td>{goal ? `${goal.kcalGoal.toLocaleString("pl-PL")} kcal` : "—"}</td>
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
              <p className="text-sm text-slate-500">Brak wpisów. Dodaj pierwszy posiłek!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
