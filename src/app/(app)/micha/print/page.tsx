import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { bodyMeasurements, dietGoals, dietLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { WEEKDAYS, formatMacro, parseMealNames, startOfWeek, weekdayOf } from "@/lib/diet";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export default async function PrintMichaPage() {
  const user = await requireUser();
  const [goals, logs, measurements] = await Promise.all([
    db.select().from(dietGoals).where(eq(dietGoals.userId, user.id)),
    db
      .select()
      .from(dietLogs)
      .where(eq(dietLogs.userId, user.id))
      .orderBy(desc(dietLogs.date), desc(dietLogs.id)),
    db
      .select()
      .from(bodyMeasurements)
      .where(eq(bodyMeasurements.userId, user.id))
      .orderBy(asc(bodyMeasurements.date)),
  ]);
  const goalByWeekday = new Map(goals.map((g) => [g.weekday, g]));
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const weekLogs = logs.filter((l) => l.date >= weekStart && l.date < weekEnd);
  const sum = (items: typeof logs) =>
    items.reduce(
      (a, l) => ({ protein: a.protein + (l.protein ?? 0), fat: a.fat + (l.fat ?? 0), carbs: a.carbs + (l.carbs ?? 0), kcal: a.kcal + (l.kcal ?? 0) }),
      { protein: 0, fat: 0, carbs: 0, kcal: 0 },
    );
  const weekSum = sum(weekLogs);
  const weekGoal = WEEKDAYS.reduce(
    (a, { n }) => {
      const g = goalByWeekday.get(n);
      return { protein: a.protein + (g?.protein ?? 0), fat: a.fat + (g?.fat ?? 0), carbs: a.carbs + (g?.carbs ?? 0), kcal: a.kcal + (g?.kcalGoal ?? 0) };
    },
    { protein: 0, fat: 0, carbs: 0, kcal: 0 },
  );
  const weights = measurements.filter((m) => m.weightKg != null);
  const w0 = weights[0]?.weightKg ?? null;
  const w1 = weights[weights.length - 1]?.weightKg ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="print-hide flex items-center justify-between">
        <Link href="/micha" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white">
          <ArrowLeft size={16} /> Wróć
        </Link>
        <PrintButton label="Drukuj / Zapisz PDF" />
      </div>

      <div className="panel p-6">
        <p className="eyebrow">Podsumowanie tygodnia</p>
        <h1 className="text-2xl font-black text-white">
          {weekStart.toLocaleDateString("pl-PL")} – {new Date(weekEnd.getTime() - 1).toLocaleDateString("pl-PL")}
        </h1>
        <p className="mt-2 text-xs text-slate-500">Raport diety i pomiarów · GYMRAT</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="panel p-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Kalorie</p>
          <p className="mt-1 text-xl font-black">{weekSum.kcal.toLocaleString("pl-PL")} / {weekGoal.kcal.toLocaleString("pl-PL")} kcal</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Białko / Tłuszcze / Węgl.</p>
          <p className="mt-1 text-xl font-black">
            {formatMacro(weekSum.protein)} / {formatMacro(weekSum.fat)} / {formatMacro(weekSum.carbs)} g
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Waga (pierwsza → ostatnia)</p>
          <p className="mt-1 text-xl font-black">
            {w0 != null ? formatMacro(w0) : "—"} → {w1 != null ? formatMacro(w1) : "—"} kg
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Wpisy w tygodniu</p>
          <p className="mt-1 text-xl font-black">{weekLogs.length}</p>
        </div>
      </div>

      <div className="panel p-6">
        <h2 className="mb-3 font-extrabold text-white">Wpisy</h2>
        {weekLogs.length ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[.06] text-[10px] uppercase tracking-wider text-slate-500">
                <th className="py-2">Data</th>
                <th className="py-2">Posiłek</th>
                <th className="py-2">Gramatura</th>
                <th className="py-2">kcal</th>
                <th className="py-2">B / T / W</th>
                <th className="py-2">Notatka</th>
              </tr>
            </thead>
            <tbody>
              {weekLogs.map((l) => {
                const names = parseMealNames(goalByWeekday.get(weekdayOf(l.date))?.mealNames ?? null, 10);
                const meal = l.mealNumber ? `${l.mealNumber}. ${names[l.mealNumber - 1] ?? ""}`.trim() : "—";
                return (
                  <tr key={l.id} className="border-b border-white/[.03]">
                    <td className="py-2">{l.date.toLocaleDateString("pl-PL")}</td>
                    <td className="py-2">{meal}</td>
                    <td className="py-2">{l.grams != null ? `${formatMacro(l.grams)} g` : "—"}</td>
                    <td className="py-2">{l.kcal.toLocaleString("pl-PL")}</td>
                    <td className="py-2">{formatMacro(l.protein)} / {formatMacro(l.fat)} / {formatMacro(l.carbs)}</td>
                    <td className="py-2 text-slate-500">{l.note ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-500">Brak wpisów w tym tygodniu.</p>
        )}
      </div>
    </div>
  );
}
