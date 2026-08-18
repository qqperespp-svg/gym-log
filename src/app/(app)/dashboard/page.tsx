import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Dumbbell,
  Flame,
  Play,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { db } from "@/db";
import { bodyMeasurements, exercises, exerciseSets, workouts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { WeeklyGoalCard } from "@/components/weekly-goal-card";

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
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const weekly = completedSessions.filter((item) => item.date >= weekAgo);
  const weeklyVolume = weekly.reduce((sum, item) => sum + item.volume, 0);
  const active = sessions
    .filter((item) => item.status !== "completed")
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  const recent = completedSessions.slice(0, 4);
  const firstName = user.name.split(" ")[0];

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
            meta: `${weekly.length} w ostatnich 7 dniach`,
            color: "lime",
          },
          {
            icon: Target,
            label: "Objętość tygodnia",
            value: `${weeklyVolume.toLocaleString("pl-PL")} kg`,
            meta: "Tylko wykonane serie",
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
            value: `${weekly.length} sesje`,
            meta: "Aktywność w tym tygodniu",
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

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="panel p-5 sm:p-6">
          <h2 className="font-extrabold text-white mb-4">Objętość tygodniowa</h2>
          {weekly.length > 0 ? (
            <div className="flex h-48 items-end gap-3">
              {weekly.map((item, i) => {
                const pct = Math.max(
                  10,
                  Math.round(
                    (item.volume / Math.max(...weekly.map((w) => w.volume), 1)) * 100,
                  ),
                );
                return (
                  <div key={i} className="group relative flex flex-1 flex-col justify-end">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-lime-600 to-lime-300 transition hover:brightness-110"
                      style={{ height: `${pct}%` }}
                    />
                    <span className="mt-1 truncate text-center text-[10px] text-slate-500">
                      {new Date(item.date).toLocaleDateString("pl-PL", { weekday: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Brak danych z tego tygodnia.</p>
          )}
        </div>
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
              Zapisuj wagę, wzrost i obwody w zakładce <b>Ciało</b>. Porównuj pierwszy i najnowszy
              wpis.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.55fr_.85fr]">
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
                    <b className="text-sm text-white">{item.volume.toLocaleString("pl-PL")} kg</b>
                    <p className="text-[10px] uppercase tracking-wider text-slate-600">objętość</p>
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
        <div className="space-y-5">
          <WeeklyGoalCard goal={user.weeklyGoal} weeklyCount={weekly.length} />
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
      </section>
    </div>
  );
}
