import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { ArrowLeft, CheckCircle2, ChevronRight, Dumbbell, FileDown, Plus, Scale, Sofa, TrendingDown, TrendingUp, UtensilsCrossed } from "lucide-react";
import { db } from "@/db";
import { bodyMeasurements, dietGoals, dietLogs, foodProducts, recipes, userFavorites, type DietLog } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { WEEKDAYS, formatMacro, parseMealNames, startOfWeek, weekdayOf } from "@/lib/diet";
import { addFoodProductAction, addRecipeAction, deleteRecipeAction, logRecipeAction } from "@/actions/diet";
import { DietGoalsForm } from "@/components/diet-goals-form";
import { DietLogForm } from "@/components/diet-log-form";
import { DeleteDietLogButton } from "@/components/delete-diet-log-button";
import { EditDietLogButton } from "@/components/edit-diet-log-button";
import { MacroBar } from "@/components/macro-bar";
import { CodeScanInput } from "@/components/code-scan-input";
import { FoodCatalogSearch } from "@/components/food-catalog-search";
import { MichaTabs } from "@/components/micha-tabs";
import { TdeeCalculator } from "@/components/tdee-calculator";
import { MealEstimate } from "@/components/meal-estimate";
import { RecipeForm, RecipeItem } from "@/components/recipe-form";

export const dynamic = "force-dynamic";

function isoWeekOf(date: Date) {
  const value = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((value.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: value.getUTCFullYear(), week };
}

function formatDayMonth(date: Date) {
  return date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
}

function formatMonthYear(date: Date) {
  const label = date.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default async function MichaPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [goals, logs, products, measurements, recipeRows, favRows] = await Promise.all([
    db.select().from(dietGoals).where(eq(dietGoals.userId, user.id)),
    db
      .select()
      .from(dietLogs)
      .where(eq(dietLogs.userId, user.id))
      .orderBy(desc(dietLogs.date), desc(dietLogs.id)),
    db
      .select()
      .from(foodProducts)
      // Wspólny katalog: wszystkie produkty (globalne + dodane przez użytkowników).
      .orderBy(asc(foodProducts.name)),
    db
      .select()
      .from(bodyMeasurements)
      .where(eq(bodyMeasurements.userId, user.id))
      .orderBy(asc(bodyMeasurements.date)),
    db.select().from(recipes).where(eq(recipes.userId, user.id)).orderBy(asc(recipes.name)),
    db.select().from(userFavorites).where(eq(userFavorites.userId, user.id)),
  ]);
  const favoriteIds = new Set(favRows.map((f) => f.productId));
  const goalByWeekday = new Map(goals.map((goal) => [goal.weekday, goal]));
  const todayMeals = Math.max(1, Math.min(goalByWeekday.get(weekdayOf(new Date()))?.meals ?? 3, 10));
  const mealNamesByWeekday = new Map<number, string[]>();
  for (const goal of goals) {
    const count = Math.max(1, Math.min(goal.meals || 3, 10));
    mealNamesByWeekday.set(goal.weekday, parseMealNames(goal.mealNames ?? null, count));
  }
  const todayMealNames = mealNamesByWeekday.get(weekdayOf(new Date())) ?? [];
  const mealNameFor = (date: Date, mealNumber: number | null) => {
    if (!mealNumber) return null;
    const names = mealNamesByWeekday.get(weekdayOf(date));
    return names?.[mealNumber - 1] || `Posiłek ${mealNumber}`;
  };
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

  type HistoryEntry = {
    id: number;
    date: Date;
    mealName: string;
    mealNumber: number | null;
    mealOptions: Array<{ value: number; label: string }>;
    protein: number;
    fat: number;
    carbs: number;
    kcal: number;
    goalKcal: number | null;
    note: string | null;
  };
  type DayGroup = {
    key: string;
    date: Date;
    entries: HistoryEntry[];
    totalKcal: number;
  };
  type WeekGroup = {
    key: string;
    start: Date;
    end: Date;
    label: string;
    days: Map<string, DayGroup>;
    totalLogs: number;
    totalKcal: number;
  };
  type MonthGroup = {
    key: string;
    date: Date;
    weeks: Map<string, WeekGroup>;
    totalLogs: number;
    totalKcal: number;
  };

  const monthGroups = new Map<string, MonthGroup>();
  for (const log of logs) {
    const weekStartDate = startOfWeek(log.date);
    const weekEndDate = new Date(
      weekStartDate.getFullYear(),
      weekStartDate.getMonth(),
      weekStartDate.getDate() + 6,
    );
    const isoWeek = isoWeekOf(log.date);
    const weekKey = `${isoWeek.year}-W${String(isoWeek.week).padStart(2, "0")}`;
    // Tydzień ma jedno miejsce w historii — przypisujemy go do miesiąca,
    // w którym się zaczyna, dzięki czemu dni nie dublują się na granicy miesięcy.
    const monthKey = `${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, "0")}`;
    const month = monthGroups.get(monthKey) ?? {
      key: monthKey,
      date: new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), 1),
      weeks: new Map(),
      totalLogs: 0,
      totalKcal: 0,
    };
    const week = month.weeks.get(weekKey) ?? {
      key: weekKey,
      start: weekStartDate,
      end: weekEndDate,
      label: `CW${String(isoWeek.week).padStart(2, "0")} ${formatDayMonth(weekStartDate)}-${formatDayMonth(weekEndDate)}`,
      days: new Map(),
      totalLogs: 0,
      totalKcal: 0,
    };
    const dayKey = `${log.date.getFullYear()}-${String(log.date.getMonth() + 1).padStart(2, "0")}-${String(log.date.getDate()).padStart(2, "0")}`;
    const day = week.days.get(dayKey) ?? {
      key: dayKey,
      date: new Date(log.date.getFullYear(), log.date.getMonth(), log.date.getDate()),
      entries: [],
      totalKcal: 0,
    };
    const dateGoal = goalByWeekday.get(weekdayOf(log.date));
    const mealCount = Math.max(1, Math.min(dateGoal?.meals ?? 3, 10));
    const dateMealNames = mealNamesByWeekday.get(weekdayOf(log.date)) ?? [];
    const entry: HistoryEntry = {
      id: log.id,
      date: log.date,
      mealName: mealNameFor(log.date, log.mealNumber) ?? "Posiłek",
      mealNumber: log.mealNumber,
      mealOptions: Array.from({ length: mealCount }, (_, index) => ({
        value: index + 1,
        label: dateMealNames[index] || `Posiłek ${index + 1}`,
      })),
      protein: log.protein,
      fat: log.fat,
      carbs: log.carbs,
      kcal: log.kcal,
      goalKcal: dateGoal?.kcalGoal ?? null,
      note: log.note,
    };
    day.entries.push(entry);
    day.totalKcal += entry.kcal;
    week.totalLogs += 1;
    week.totalKcal += entry.kcal;
    month.totalLogs += 1;
    month.totalKcal += entry.kcal;
    week.days.set(dayKey, day);
    month.weeks.set(weekKey, week);
    monthGroups.set(monthKey, month);
  }
  const mealHistory = Array.from(monthGroups.values())
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((month) => ({
      ...month,
      weeks: Array.from(month.weeks.values())
        .sort((a, b) => b.start.getTime() - a.start.getTime())
        .map((week) => ({
          ...week,
          days: Array.from(week.days.values()).sort((a, b) => b.date.getTime() - a.date.getTime()),
        })),
    }));

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

      <MichaTabs
        makro={
          <>
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
                    {weekSum.kcal.toLocaleString("pl-PL")} / {weekGoal.kcal.toLocaleString("pl-PL")} kcal
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
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-extrabold text-white">Wpisy z posiłkami</h2>
                <Link href="/micha/print" className="button-secondary px-3 py-1.5 text-xs">
                  <FileDown size={14} /> Eksport PDF
                </Link>
              </div>
              <p className="mb-5 text-sm text-slate-500">
                Historia wpisów spożycia — z podziałem na posiłki.
              </p>
              {logs.length ? (
                <div className="space-y-3">
                  {mealHistory.map((month) => (
                    <details key={month.key} className="meal-history-details overflow-hidden rounded-2xl border border-white/[.07] bg-black/10">
                      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 hover:bg-white/[.025]">
                        <span className="meal-history-chevron shrink-0 text-lime-400">
                          <ChevronRight size={19} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-extrabold text-white">{formatMonthYear(month.date)}</h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {month.totalLogs} wpisów · {month.weeks.length} {month.weeks.length === 1 ? "tydzień" : "tygodnie"} · {month.totalKcal.toLocaleString("pl-PL")} kcal
                          </p>
                        </div>
                        <span className="hidden rounded-full bg-white/[.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 sm:inline-flex">
                          Miesiąc
                        </span>
                      </summary>
                      <div className="space-y-2 border-t border-white/[.06] p-3 sm:p-4">
                        {month.weeks.map((week) => (
                          <details key={week.key} className="meal-history-details overflow-hidden rounded-xl border border-white/[.07] bg-black/10">
                            <summary className="flex cursor-pointer list-none items-center gap-3 p-3 hover:bg-white/[.025] sm:p-4">
                              <span className="meal-history-chevron shrink-0 text-lime-400">
                                <ChevronRight size={17} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-extrabold text-white">{week.label}</h4>
                                <p className="mt-1 text-xs text-slate-500">
                                  {week.days.length} {week.days.length === 1 ? "dzień" : "dni"} · {week.totalLogs} wpisów · {week.totalKcal.toLocaleString("pl-PL")} kcal
                                </p>
                              </div>
                              <span className="hidden text-[10px] font-black uppercase tracking-wider text-slate-600 sm:inline">
                                Tydzień
                              </span>
                            </summary>
                            <div className="space-y-2 border-t border-white/[.06] p-3">
                              {week.days.map((day) => (
                                <details key={day.key} className="meal-history-details overflow-hidden rounded-xl border border-white/[.07] bg-black/10">
                                  <summary className="flex cursor-pointer list-none items-center gap-3 p-3 hover:bg-white/[.025]">
                                    <span className="meal-history-chevron shrink-0 text-lime-400">
                                      <ChevronRight size={16} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <h5 className="font-bold capitalize text-white">
                                        {day.date.toLocaleDateString("pl-PL", {
                                          weekday: "long",
                                          day: "2-digit",
                                          month: "2-digit",
                                          year: "numeric",
                                        })}
                                      </h5>
                                      <p className="mt-1 text-xs text-slate-500">
                                        {day.entries.length} wpisów · {day.totalKcal.toLocaleString("pl-PL")} kcal
                                      </p>
                                    </div>
                                  </summary>
                                  <div className="divide-y divide-white/[.05] border-t border-white/[.06]">
                                    {day.entries.map((entry) => (
                                      <div key={entry.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-white/[.05] px-2 py-0.5 text-xs font-bold text-lime-300 ring-1 ring-white/10">
                                              <UtensilsCrossed size={11} /> {entry.mealName}
                                            </span>
                                            {entry.note && <span className="truncate text-xs text-slate-500">{entry.note}</span>}
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                                          <span>B: {formatMacro(entry.protein)} g</span>
                                          <span>T: {formatMacro(entry.fat)} g</span>
                                          <span>W: {formatMacro(entry.carbs)} g</span>
                                          <b className="text-lime-300">{entry.kcal.toLocaleString("pl-PL")} kcal</b>
                                          {entry.goalKcal != null && (
                                            <span className="text-slate-600">cel {entry.goalKcal.toLocaleString("pl-PL")} kcal</span>
                                          )}
                                        </div>
                                        <div className="flex shrink-0 gap-1">
                                          <EditDietLogButton
                                            id={entry.id}
                                            initial={{
                                              date: entry.date.toISOString().slice(0, 10),
                                              protein: entry.protein,
                                              fat: entry.fat,
                                              carbs: entry.carbs,
                                              mealNumber: entry.mealNumber,
                                              note: entry.note,
                                              mealOptions: entry.mealOptions,
                                            }}
                                          />
                                          <DeleteDietLogButton id={entry.id} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              ))}
                            </div>
                          </details>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/[.07] bg-black/15 p-6 text-center">
                  <p className="text-sm text-slate-500">Brak wpisów. Dodaj pierwszy posiłek!</p>
                </div>
              )}
            </section>

            {/* Analiza tygodnia */}
            <section className="panel p-5 sm:p-7">
              <h2 className="mb-4 flex items-center gap-2 font-extrabold text-white">
                <TrendingUp size={18} className="text-lime-400" /> Analiza tygodnia
              </h2>
              {(() => {
                const weights = measurements.filter((m) => m.weightKg != null).map((m) => ({ date: m.date, w: m.weightKg as number }));
                const latest = weights[weights.length - 1]?.w ?? null;
                const baseline = weights.find((m) => m.date < weekStart)?.w ?? weights[0]?.w ?? null;
                const wDelta = latest != null && baseline != null ? latest - baseline : null;
                const pctProtein = weekGoal.protein > 0 ? Math.round((weekSum.protein / weekGoal.protein) * 100) : null;
                const pctKcal = weekGoal.kcal > 0 ? Math.round((weekSum.kcal / weekGoal.kcal) * 100) : null;
                return (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/[.06] bg-black/15 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Waga</p>
                      {wDelta == null ? (
                        <p className="mt-1 text-sm text-slate-500">brak danych</p>
                      ) : (
                        <p className={`mt-1 flex items-center gap-1 text-lg font-black ${wDelta <= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                          {wDelta <= 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                          {wDelta > 0 ? "+" : ""}{wDelta.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} kg
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-slate-600">vs sprzed tygodnia</p>
                    </div>
                    <div className="rounded-xl border border-white/[.06] bg-black/15 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Białko</p>
                      <p className="mt-1 text-lg font-black text-sky-300">{pctProtein == null ? "—" : `${pctProtein}%`}</p>
                      <p className="mt-1 text-[10px] text-slate-600">celu tygodnia ({formatMacro(weekSum.protein)}/{formatMacro(weekGoal.protein)} g)</p>
                    </div>
                    <div className="rounded-xl border border-white/[.06] bg-black/15 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Kalorie</p>
                      <p className="mt-1 text-lg font-black text-lime-300">{pctKcal == null ? "—" : `${pctKcal}%`}</p>
                      <p className="mt-1 text-[10px] text-slate-600">celu tygodnia ({weekSum.kcal.toLocaleString("pl-PL")}/{weekGoal.kcal.toLocaleString("pl-PL")} kcal)</p>
                    </div>
                  </div>
                );
              })()}
            </section>

            {/* Trend wagi */}
            <section className="panel p-5 sm:p-7">
              <h2 className="mb-4 flex items-center gap-2 font-extrabold text-white">
                <Scale size={18} className="text-sky-400" /> Trend wagi
              </h2>
              {(() => {
                const pts = measurements.filter((m) => m.weightKg != null).slice(-10);
                if (pts.length < 2)
                  return <p className="text-sm text-slate-500">Potrzebne co najmniej 2 pomiary wagi (zakładka Ciało).</p>;
                const vals = pts.map((m) => m.weightKg as number);
                const min = Math.min(...vals);
                const max = Math.max(...vals);
                const range = max - min || 1;
                const w = 480;
                const h = 120;
                const coords = pts.map((m, i) => {
                  const x = (i / (pts.length - 1)) * w;
                  const y = h - ((m.weightKg as number) - min) / range * (h - 16) - 8;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                });
                return (
                  <div>
                    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
                      <polyline points={coords.join(" ")} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {pts.map((m, i) => {
                        const [x, y] = coords[i].split(",").map(Number);
                        return <circle key={i} cx={x} cy={y} r="3.5" fill="#38bdf8" />;
                      })}
                    </svg>
                    <div className="mt-2 flex justify-between text-[10px] text-slate-500">
                      <span>{pts[0].date.toLocaleDateString("pl-PL")}</span>
                      <span>
                        {min.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} – {max.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} kg
                      </span>
                      <span>{pts[pts.length - 1].date.toLocaleDateString("pl-PL")}</span>
                    </div>
                  </div>
                );
              })()}
            </section>
          </>
        }
        wprowadzanie={
          <>
            <section className="panel p-5 sm:p-7">
              <h2 className="font-extrabold text-white mb-1">Szacuj makro ze zdjęcia (AI)</h2>
              <p className="mb-5 text-sm text-slate-500">
                Zrób zdjęcie talerza, a Google Gemini rozpozna składniki i oszacuje makro oraz kcal.
              </p>
              <MealEstimate meals={todayMeals} mealNames={todayMealNames} />
            </section>

            <section className="panel p-5 sm:p-7">
              <h2 className="font-extrabold text-white mb-1">Dziennik spożycia</h2>
              <p className="mb-5 text-sm text-slate-500">
                Dodaj posiłek — wyszukaj produkt po nazwie w katalogu, zeskanuj kod kreskowy / QR
                (produkt wypełni się automatycznie z Open Food Facts) albo podaj makro ręcznie
                (na 100 g), ustaw gramaturę i wybierz, do którego posiłku dnia go przypisać.
              </p>
              <DietLogForm products={products} meals={todayMeals} mealNames={todayMealNames} favoriteIds={favoriteIds} />
            </section>

            <section className="panel p-5 sm:p-7">
              <h2 className="font-extrabold text-white mb-1">Posiłki złożone (przepisy)</h2>
              <p className="mb-5 text-sm text-slate-500">
                Zbuduj posiłek z produktów katalogu (np. „Obiad = kurczak 150 g + ryż 80 g"), a makro
                zsumuje się automatycznie. Dodajesz go do dziennika jednym kliknięciem.
              </p>
              <div className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
                  <p className="mb-3 text-xs font-black uppercase tracking-wider text-lime-400">Nowy przepis</p>
                  <RecipeForm products={products} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">Twoje przepisy</p>
                  {recipeRows.length ? (
                    recipeRows.map((r) => <RecipeItem key={r.id} recipe={r} />)
                  ) : (
                    <p className="rounded-xl border border-white/[.06] bg-black/15 p-4 text-sm text-slate-500">
                      Brak przepisów — stwórz pierwszy po lewej.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="panel p-5 sm:p-7">
              <h2 className="font-extrabold text-white mb-1">Cele na dni tygodnia</h2>
              <p className="mb-5 text-sm text-slate-500">
                kcal = białko × 4 + węglowodany × 4 + tłuszcze × 9 (na gram). Oznacz, czy dany dzień
                jest treningowy czy wolny, i ustaw liczbę posiłków oraz ich nazwy.
              </p>
              <DietGoalsForm goals={goals} />
            </section>

            <section className="panel p-5 sm:p-7">
              <h2 className="font-extrabold text-white mb-1">Katalog produktów</h2>
              <p className="mb-5 text-sm text-slate-500">
                Baza zawiera <b className="text-lime-300">{products.length.toLocaleString("pl-PL")}</b> produktów
                z makroskładnikami (na 100 g) — polskie produkty z otwartej bazy Open Food Facts (mleko,
                jogurty, pieczywo, mięsa, owoce, warzywa, przekąski i wiele innych) + produkty dodawane
                przez użytkowników (<b>wspólny katalog</b>). Pozycje dodane ręcznie są oznaczone etykietą
                <b className="text-violet-300"> „wpis gymrata"</b>. Wyszukaj po nazwie, zeskanuj kod albo
                dodaj własny produkt.
              </p>
              <div className="grid gap-5 xl:grid-cols-2">
                <div className="min-w-0">
                  <FoodCatalogSearch products={products} userId={user.id} favoriteIds={favoriteIds} />
                </div>
                <div className="min-w-0">
                  <form
                    action={addFoodProductAction}
                    className="rounded-2xl border border-white/[.07] bg-black/15 p-4"
                  >
                    <p className="mb-3 text-xs font-black uppercase tracking-wider text-lime-400">
                      Dodaj własny produkt
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="field-label sm:col-span-2">
                        Nazwa produktu
                        <input
                          className="input"
                          name="name"
                          type="text"
                          placeholder="np. Twaróg półtłusty"
                          required
                          minLength={2}
                        />
                      </label>
                      <label className="field-label">
                        Białko (g/100g)
                        <input className="input" name="protein" type="number" min="0" step="0.1" required />
                      </label>
                      <label className="field-label">
                        Tłuszcze (g/100g)
                        <input className="input" name="fat" type="number" min="0" step="0.1" required />
                      </label>
                      <label className="field-label">
                        Węglowodany (g/100g)
                        <input className="input" name="carbs" type="number" min="0" step="0.1" required />
                      </label>
                      <label className="field-label sm:col-span-2">
                        Kod kreskowy / QR (opcjonalnie)
                        <CodeScanInput name="barcode" placeholder="np. 5902409703887" label="Skanuj kod" />
                      </label>
                    </div>
                    <div className="mt-4">
                      <button type="submit" className="button-primary">
                        <Plus size={17} /> Dodaj do katalogu
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </section>
          </>
        }
        planowanie={
          <section className="panel p-5 sm:p-7">
            <h2 className="font-extrabold text-white mb-1">Planowanie kalorii (TDEE)</h2>
            <p className="mb-5 text-sm text-slate-500">
              Oblicz zapotrzebowanie, ustaw proporcje białko / węglowodany / tłuszcze i dodatek na
              dzień treningowy. Po zapisie każdy dzień oznaczony jako „treningowy" dostanie
              podwyższoną kalorykę, pozostałe — bazową (z proporcjami przeliczonymi na gramy).
            </p>
            <TdeeCalculator />
          </section>
        }
      />
    </div>
  );
}
