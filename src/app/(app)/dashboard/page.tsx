import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import {
  ArrowUpRight,
  CalendarDays,
  Dumbbell,
  Flame,
  Play,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  UtensilsCrossed,
} from "lucide-react";
import { db } from "@/db";
import { bodyMeasurements, dietGoals, dietLogs, exercises, exerciseSets, fitnessLogs, sleepLogs, userSettings, waterLogs, workouts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { WEEKDAYS, startOfWeek, weekdayOf } from "@/lib/diet";
import { Droplets } from "lucide-react";
import { WeeklyGoalCard } from "@/components/weekly-goal-card";
import { DashboardTiles } from "@/components/dashboard-tiles";
import { MacroBar } from "@/components/macro-bar";
import { StepsCard } from "@/components/steps-card";
import { SleepCard } from "@/components/sleep-card";
import { TrainingDayToggle } from "@/components/training-day-toggle";

export const dynamic = "force-dynamic";

function MeasurementTrend({
  first,
  latest,
  unit,
}: {
  first: number | null;
  latest: number | null;
  unit: string;
}) {
  if (first == null || latest == null) return <span className="text-slate-600">—</span>;
  const diff = latest - first;
  if (Math.abs(diff) < 0.1) return <span className="text-xs font-extrabold text-slate-400">0</span>;
  const isDown = diff < 0;
  const sign = isDown ? "-" : "+";
  const pct = Math.abs(Math.round((diff / Math.abs(first)) * 100));
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-extrabold ${
        isDown ? "text-emerald-400" : "text-rose-300"
      }`}
    >
      {isDown ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
      {sign}
      {Math.abs(diff).toFixed(1)} {unit} ({sign}
      {pct}%)
    </span>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ finished?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;

  // ---------- Treningi ----------
  const rows = await db
    .select({
      id: workouts.id,
      title: workouts.title,
      date: workouts.date,
      duration: workouts.durationMinutes,
      status: workouts.status,
      exerciseId: exercises.id,
      setId: exerciseSets.id,
      reps: exerciseSets.reps,
      weight: exerciseSets.weight,
      completed: exerciseSets.completed,
    })
    .from(workouts)
    .leftJoin(exercises, eq(exercises.workoutId, workouts.id))
    .leftJoin(exerciseSets, eq(exerciseSets.exerciseId, exercises.id))
    .where(eq(workouts.userId, user.id))
    .orderBy(desc(workouts.date), asc(exercises.position), asc(exerciseSets.setNumber));

  const grouped = new Map<
    number,
    {
      id: number;
      title: string;
      date: Date;
      duration: number;
      status: string;
      exerciseIds: Set<number>;
      sets: number;
      completedSets: number;
      volume: number;
    }
  >();
  let maxWeight = 0;
  for (const row of rows) {
    const item = grouped.get(row.id) ?? {
      id: row.id,
      title: row.title,
      date: row.date,
      duration: row.duration,
      status: row.status,
      exerciseIds: new Set<number>(),
      sets: 0,
      completedSets: 0,
      volume: 0,
    };
    if (row.exerciseId) item.exerciseIds.add(row.exerciseId);
    if (row.setId) {
      item.sets += 1;
      if (row.completed === 1) {
        item.completedSets += 1;
        item.volume += (row.reps ?? 0) * (row.weight ?? 0);
        maxWeight = Math.max(maxWeight, row.weight ?? 0);
      }
    }
    grouped.set(row.id, item);
  }
  const sessions = Array.from(grouped.values());
  const completedSessions = sessions.filter((item) => item.status === "completed");

  // Tydzień liczony od poniedziałku do niedzieli — w poniedziałek licznik startuje od 0.
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const weekly = completedSessions.filter((item) => item.date >= weekStart && item.date < weekEnd);
  const weeklyVolume = weekly.reduce((sum, item) => sum + item.volume, 0);
  const weeklyCount = weekly.length;

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index);
    const next = new Date(day.getTime() + 86400000);
    const volume = completedSessions
      .filter((item) => item.date >= day && item.date < next)
      .reduce((sum, item) => sum + item.volume, 0);
    const today = new Date();
    return {
      label: day.toLocaleDateString("pl-PL", { weekday: "short" }),
      volume,
      isToday:
        day.getDate() === today.getDate() &&
        day.getMonth() === today.getMonth() &&
        day.getFullYear() === today.getFullYear(),
    };
  });
  const maxDayVolume = Math.max(...weekDays.map((d) => d.volume), 1);

  const active = sessions
    .filter((item) => item.status !== "completed")
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  const recent = completedSessions.slice(0, 4);
  const firstName = user.name.split(" ")[0];

  // ---------- Wymiary ciała ----------
  const measurementRows = await db
    .select()
    .from(bodyMeasurements)
    .where(eq(bodyMeasurements.userId, user.id))
    .orderBy(desc(bodyMeasurements.date));
  const firstMeasurement = measurementRows[measurementRows.length - 1] ?? null;
  const latestMeasurement = measurementRows[0] ?? null;
  const bodyMetrics = [
    {
      label: "Waga",
      key: "weightKg",
      first: firstMeasurement?.weightKg ?? null,
      latest: latestMeasurement?.weightKg ?? null,
      unit: "kg",
    },
    {
      label: "Klatka",
      key: "chestCm",
      first: firstMeasurement?.chestCm ?? null,
      latest: latestMeasurement?.chestCm ?? null,
      unit: "cm",
    },
    {
      label: "Talia",
      key: "waistCm",
      first: firstMeasurement?.waistCm ?? null,
      latest: latestMeasurement?.waistCm ?? null,
      unit: "cm",
    },
    {
      label: "Biodra",
      key: "hipCm",
      first: firstMeasurement?.hipCm ?? null,
      latest: latestMeasurement?.hipCm ?? null,
      unit: "cm",
    },
    {
      label: "Udo",
      key: "thighCm",
      first: firstMeasurement?.thighCm ?? null,
      latest: latestMeasurement?.thighCm ?? null,
      unit: "cm",
    },
    {
      label: "Biceps",
      key: "bicepsCm",
      first: firstMeasurement?.bicepsCm ?? null,
      latest: latestMeasurement?.bicepsCm ?? null,
      unit: "cm",
    },
    {
      label: "Łydka",
      key: "calfCm",
      first: firstMeasurement?.calfCm ?? null,
      latest: latestMeasurement?.calfCm ?? null,
      unit: "cm",
    },
  ];
  const hasMeasurements = measurementRows.length > 0;

  // ---------- Micha: cele i spożycie w bieżącym tygodniu ----------
  const [goalRows, dietLogRows, waterRows, settingsRows, fitnessRows, sleepRows] = await Promise.all([
    db.select().from(dietGoals).where(eq(dietGoals.userId, user.id)),
    db.select().from(dietLogs).where(eq(dietLogs.userId, user.id)),
    db.select().from(waterLogs).where(eq(waterLogs.userId, user.id)),
    db.select().from(userSettings).where(eq(userSettings.userId, user.id)).limit(1),
    db.select().from(fitnessLogs).where(eq(fitnessLogs.userId, user.id)).orderBy(desc(fitnessLogs.date)).limit(60),
    db.select().from(sleepLogs).where(eq(sleepLogs.userId, user.id)).orderBy(desc(sleepLogs.date)).limit(60),
  ]);
  const goalByWeekday = new Map(goalRows.map((goal) => [goal.weekday, goal]));
  // Spożycie dzisiejsze (makro + kcal) oraz cel dzienny z flagą treningowy/wolny.
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(todayStart.getTime() + 86400000);
  const todayLogs = dietLogRows.filter((log) => log.date >= todayStart && log.date < tomorrow);
  const todaySum = todayLogs.reduce(
    (acc, log) => ({
      protein: acc.protein + (log.protein ?? 0),
      fat: acc.fat + (log.fat ?? 0),
      carbs: acc.carbs + (log.carbs ?? 0),
      kcal: acc.kcal + (log.kcal ?? 0),
    }),
    { protein: 0, fat: 0, carbs: 0, kcal: 0 },
  );
  const todayWeekday = weekdayOf(now);
  const todayGoal = goalByWeekday.get(todayWeekday) ?? null;
  const waterGoal = settingsRows[0]?.waterGoal ?? 2.5;
  const todayWater = waterRows
    .filter((w) => w.date >= todayStart && w.date < tomorrow)
    .reduce((s, w) => s + (w.liters ?? 0), 0);
  const isTrainingDay = todayGoal?.trainingDay === 1;
  const anyDietData = dietLogRows.length > 0 || goalRows.length > 0;

  return (
    <div className="space-y-7">
      {query.finished === "1" && (
        <div className="flex items-center gap-3 rounded-xl border border-lime-400/20 bg-lime-400/10 px-4 py-3 text-sm font-bold text-lime-200">
          <Trophy size={18} /> Trening zakończony. Dobra robota!
        </div>
      )}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Centrum dowodzenia</p>
          <h1 className="page-title">
            Siema, {firstName}{" "}
            <span className="inline-block origin-bottom-right rotate-12">👋</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">Gotowy dołożyć kolejny kilogram?</p>
        </div>
        <Link href="/workouts/new" className="button-primary self-start sm:self-auto">
          <Plus size={18} /> Zaplanuj trening
        </Link>
      </header>

      {active && (
        <section className="relative overflow-hidden rounded-2xl border border-lime-400/25 bg-gradient-to-r from-lime-400/[.13] via-lime-400/[.05] to-transparent p-5 sm:p-7">
          <div className="absolute -right-10 -top-20 size-60 rounded-full bg-lime-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-lime-400 text-slate-950">
              <Play size={24} fill="currentColor" />
            </span>
            <div className="flex-1">
              <p className="eyebrow">
                {active.status === "in_progress" ? "Trening w trakcie" : "Najbliższy trening"}
              </p>
              <h2 className="text-2xl font-black text-white">{active.title}</h2>
              <p className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} />
                  {active.date.toLocaleDateString("pl-PL")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Dumbbell size={14} />
                  {active.exerciseIds.size} ćwiczeń
                </span>
                <span>
                  {active.completedSets}/{active.sets} serii
                </span>
              </p>
            </div>
            <Link href={`/workouts/${active.id}/session`} className="button-primary justify-center">
              <Play size={17} /> Otwórz trening
            </Link>
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: Dumbbell,
            label: "Treningi łącznie",
            value: completedSessions.length.toString(),
            meta: `${weeklyCount} w tym tygodniu (pon.–niedz.)`,
            color: "lime",
          },
          {
            icon: Target,
            label: "Objętość tygodnia",
            value: `${weeklyVolume.toLocaleString("pl-PL")} kg`,
            meta: "Poniedziałek – niedziela",
            color: "blue",
          },
          {
            icon: Trophy,
            label: "Największy ciężar",
            value: `${maxWeight} kg`,
            meta: "Najlepszy zapisany wynik",
            color: "amber",
          },
          {
            icon: Flame,
            label: "Regularność",
            value: `${weeklyCount} sesje`,
            meta: "Od poniedziałku do dzisiaj",
            color: "orange",
          },
        ].map(({ icon: Icon, label, value, meta, color }) => (
          <article key={label} className="stat-card">
            <span className={`stat-icon stat-${color}`}>
              <Icon size={21} />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500">{label}</p>
              <strong className="mt-1 block text-2xl font-black tracking-tight text-white">
                {value}
              </strong>
              <p className="mt-1 text-[11px] text-slate-600">{meta}</p>
            </div>
          </article>
        ))}
      </section>

      <DashboardTiles
        tiles={[
          {
            id: "volume",
            label: "Objętość tygodniowa",
            node: (
              <div className="panel p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-extrabold text-white">Objętość tygodniowa</h2>
                  <span className="rounded-lg bg-lime-400/10 px-2.5 py-1 text-xs font-black text-lime-300">
                    {weeklyVolume.toLocaleString("pl-PL")} kg
                  </span>
                </div>
                <div className="flex h-48 items-end gap-2 sm:gap-3">
                  {weekDays.map((day, index) => {
                    // Skala jak w Historii: najwyższa objętość = 100% słupka.
                    const pct =
                      day.volume > 0
                        ? Math.max(8, Math.round((day.volume / maxDayVolume) * 100))
                        : 4;
                    const empty = day.volume <= 0;
                    return (
                      <div
                        key={index}
                        className="group flex h-full min-w-0 flex-1 flex-col justify-end"
                        title={`${day.label}: ${day.volume.toLocaleString("pl-PL")} kg`}
                      >
                        <div
                          className={`relative mx-auto w-full max-w-16 rounded-t-lg transition ${
                            empty
                              ? "min-h-2 border-b border-dashed border-white/15 bg-white/[.05]"
                              : day.isToday
                                ? "bg-gradient-to-t from-lime-500 to-lime-200 shadow-[0_0_18px_rgba(163,230,53,.35)]"
                                : "bg-gradient-to-t from-lime-600 to-lime-300"
                          }`}
                          style={{ height: `${pct}%` }}
                        >
                          {day.volume > 0 && (
                            <span className="absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold text-lime-300 group-hover:block">
                              {day.volume.toLocaleString("pl-PL")} kg
                            </span>
                          )}
                        </div>
                        <p
                          className={`mt-2 truncate text-center text-[10px] font-bold ${
                            day.isToday ? "text-lime-300" : "text-slate-500"
                          }`}
                        >
                          {day.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {weeklyVolume === 0 && (
                  <p className="mt-3 rounded-lg bg-white/[.03] px-3 py-2 text-[11px] text-slate-500">
                    Brak wykonanych treningów w tym tygodniu — słupki wypełnią się po zakończeniu
                    pierwszej sesji (pon. – niedz.).
                  </p>
                )}
                <p className="mt-3 text-[11px] text-slate-600">
                  Tydzień liczony od poniedziałku do niedzieli — licznik resetuje się w poniedziałek.
                </p>
              </div>
            ),
          },
          {
            id: "body",
            label: "Wymiary ciała",
            node: (
              <div className="panel p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-extrabold text-white">Wymiary ciała</h2>
                  <Link href="/body" className="text-link">
                    Zobacz pomiary <ArrowUpRight size={15} />
                  </Link>
                </div>
                {hasMeasurements ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {bodyMetrics.map((m) => (
                      <article
                        key={m.key}
                        className="rounded-2xl border border-white/[.07] bg-black/15 p-4"
                      >
                        <p className="text-xs font-semibold text-slate-500">{m.label}</p>
                        <div className="mt-2 flex items-baseline gap-1">
                          <b className="text-xl font-black tracking-tight text-white">
                            {m.latest != null ? m.latest.toFixed(1) : "—"}
                          </b>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {m.latest != null ? m.unit : ""}
                          </span>
                        </div>
                        <div className="mt-2">
                          <MeasurementTrend first={m.first} latest={m.latest} unit={m.unit} />
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Zapisuj wagę, wzrost i obwody w zakładce <b>Ciało</b>. Porównuj pierwszy i
                    najnowszy wpis.
                  </p>
                )}
              </div>
            ),
          },
          {
            id: "diet",
            label: "Micha",
            defaultSize: "l",
            node: (
              <div className="panel p-5 sm:p-6" data-kcal-remaining={Math.max(0, (todayGoal?.kcalGoal ?? 0) - todaySum.kcal)}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed size={19} className="text-lime-400" />
                    <h2 className="font-extrabold text-white">
                      Dzisiaj · {WEEKDAYS[todayWeekday - 1]?.label}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrainingDayToggle trainingDay={isTrainingDay} weekday={todayWeekday} />
                    <Link href="/micha" className="text-link">
                      Otwórz Michę <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </div>
                {anyDietData ? (
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
                ) : (
                  <p className="text-sm text-slate-500">
                    Ustaw dzienne cele (białko, tłuszcze, węglowodany) i loguj spożycie w zakładce{" "}
                    <b>Micha</b>.
                  </p>
                )}
              </div>
            ),
          },
          {
            id: "steps",
            label: "Kroki",
            node: <StepsCard logs={fitnessRows} />,
          },
          {
            id: "sleep",
            label: "Sen",
            defaultSize: "m",
            node: <SleepCard logs={sleepRows} />,
          },
          {
            id: "water",
            label: "Nawodnienie",
            node: (
              <div className="panel p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-extrabold text-white">
                    <Droplets size={19} className="text-sky-400" /> Nawodnienie
                  </h2>
                  <Link href="/nawodnienie" className="text-link">
                    Otwórz <ArrowUpRight size={15} />
                  </Link>
                </div>
                <div className="flex items-end justify-between">
                  <b className="text-2xl font-black text-sky-300">
                    {todayWater.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} l
                  </b>
                  <span className="text-xs text-slate-500">
                    cel {waterGoal.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} l
                  </span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/[.05]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-300 transition-all"
                    style={{ width: `${Math.min(100, Math.round((todayWater / waterGoal) * 100))}%` }}
                  />
                </div>
              </div>
            ),
          },
          {
            id: "workouts",
            label: "Ostatnie treningi",
            node: (
              <div className="panel overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/[.06] p-5 sm:p-6">
                  <div>
                    <h2 className="font-extrabold text-white">Ostatnie treningi</h2>
                    <p className="mt-1 text-xs text-slate-500">Twoja najnowsza aktywność</p>
                  </div>
                  <Link href="/workouts" className="text-link">
                    Zobacz wszystkie <ArrowUpRight size={15} />
                  </Link>
                </div>
                {recent.length ? (
                  <div className="divide-y divide-white/[.05]">
                    {recent.map((item) => (
                      <Link
                        key={item.id}
                        href={`/workouts/${item.id}/session`}
                        className="flex items-center gap-4 p-4 transition hover:bg-white/[.025] sm:px-6"
                      >
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/[.04] text-lime-400">
                          <Dumbbell size={19} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-bold text-white">{item.title}</h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.date.toLocaleDateString("pl-PL", { day: "numeric", month: "short" })} ·{" "}
                            {item.exerciseIds.size} ćw. · {item.sets} serii
                          </p>
                        </div>
                        <div className="hidden text-right sm:block">
                          <b className="text-sm text-white">
                            {item.volume.toLocaleString("pl-PL")} kg
                          </b>
                          <p className="text-[10px] uppercase tracking-wider text-slate-600">
                            objętość
                          </p>
                        </div>
                        <ArrowUpRight size={17} className="text-slate-700" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state border-0">
                    <h3>Brak ukończonych treningów</h3>
                    <p>Czas zacząć pierwszą sesję.</p>
                  </div>
                )}
              </div>
            ),
          },
          {
            id: "side",
            label: "Cel tygodniowy i programy",
            node: (
              <div className="space-y-5">
                <WeeklyGoalCard goal={user.weeklyGoal} weeklyCount={weeklyCount} />
                <article className="panel p-6">
                  <p className="eyebrow">Programowanie</p>
                  <h3 className="text-xl font-black text-white">Zestawy gotowe do użycia</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Zapisz ćwiczenia raz i planuj całe sesje w kilka sekund.
                  </p>
                  <Link href="/programs" className="button-secondary mt-5">
                    Otwórz programy
                  </Link>
                </article>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
