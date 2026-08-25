import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { ArrowUpRight, BarChart3, CalendarDays, Dumbbell, Medal } from "lucide-react";
import { ExerciseProgressChart, type ExerciseHistoryItem } from "@/components/exercise-progress-chart";
import { db } from "@/db";
import { exercises, exerciseSets, workouts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { startOfWeek } from "@/lib/diet";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await requireUser();
  const rows = await db
    .select({
      id: workouts.id,
      title: workouts.title,
      date: workouts.date,
      duration: workouts.durationMinutes,
      status: workouts.status,
      exerciseId: exercises.id,
      exerciseName: exercises.name,
      exerciseSetCount: exercises.sets,
      exerciseReps: exercises.reps,
      exerciseWeight: exercises.weight,
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
      volume: number;
      best: number;
    }
  >();
  const exerciseHistoryByName = new Map<
    string,
    {
      key: string;
      name: string;
      sessions: Map<
        number,
        {
          workoutId: number;
          title: string;
          date: Date;
          volume: number;
          maxWeight: number;
          sets: number;
          fallbackVolume: number;
          fallbackMaxWeight: number;
          fallbackSets: number;
        }
      >;
    }
  >();
  for (const row of rows) {
    const item = grouped.get(row.id) ?? {
      id: row.id,
      title: row.title,
      date: row.date,
      duration: row.duration,
      status: row.status,
      exerciseIds: new Set<number>(),
      sets: 0,
      volume: 0,
      best: 0,
    };
    if (row.exerciseId) item.exerciseIds.add(row.exerciseId);
    if (row.setId && row.completed === 1) {
      item.sets += 1;
      item.volume += (row.reps ?? 0) * (row.weight ?? 0);
      item.best = Math.max(item.best, row.weight ?? 0);
    }
    grouped.set(row.id, item);

    // Historia ćwiczenia obejmuje ćwiczenia z ukończonych treningów. Jeśli
    // starszy zapis nie ma flagi `completed`, ale ma wpisane wartości, także
    // go zachowujemy. Gdy cały trening został zakończony bez zaznaczania serii,
    // używamy liczby zapisanych w nim serii jako bezpiecznego fallbacku — nigdy
    // nie pokazujemy wtedy wykonanego ćwiczenia jako „0 serii”.
    const exerciseName = row.exerciseName?.trim();
    if (row.status !== "completed" || !exerciseName) continue;
    const exerciseKey = exerciseName.toLocaleLowerCase("pl-PL");
    const historyItem = exerciseHistoryByName.get(exerciseKey) ?? {
      key: exerciseKey,
      name: exerciseName,
      sessions: new Map(),
    };
    const session = historyItem.sessions.get(row.id) ?? {
      workoutId: row.id,
      title: row.title,
      date: row.date,
      volume: 0,
      maxWeight: 0,
      sets: 0,
      fallbackVolume: 0,
      fallbackMaxWeight: 0,
      fallbackSets: 0,
    };
    const setCount = row.setId ? 1 : Math.max(row.exerciseSetCount ?? 0, 1);
    const reps = row.setId ? row.reps ?? 0 : row.exerciseReps ?? 0;
    const weight = row.setId ? row.weight ?? 0 : row.exerciseWeight ?? 0;
    const setVolume = reps * weight;
    const hasRecordedSet =
      !row.setId || row.completed === 1 || (row.reps ?? 0) > 0 || (row.weight ?? 0) > 0;
    session.fallbackSets += setCount;
    session.fallbackVolume += setCount * setVolume;
    session.fallbackMaxWeight = Math.max(session.fallbackMaxWeight, weight);
    if (hasRecordedSet) {
      session.sets += setCount;
      session.volume += setCount * setVolume;
      session.maxWeight = Math.max(session.maxWeight, weight);
    }
    historyItem.sessions.set(row.id, session);
    exerciseHistoryByName.set(exerciseKey, historyItem);
  }
  const exerciseHistory: ExerciseHistoryItem[] = Array.from(exerciseHistoryByName.values())
    .map((item) => ({
      key: item.key,
      name: item.name,
      sessions: Array.from(item.sessions.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((session) => ({
          workoutId: session.workoutId,
          title: session.title,
          date: session.date.toISOString(),
          volume: session.sets > 0 ? session.volume : session.fallbackVolume,
          maxWeight: session.sets > 0 ? session.maxWeight : session.fallbackMaxWeight,
          sets: session.sets > 0 ? session.sets : session.fallbackSets,
        })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pl-PL"));
  const sessions = Array.from(grouped.values()).filter((item) => item.status === "completed");
  const chartData = sessions.slice(0, 8).reverse();
  const maxVolume = Math.max(...chartData.map((item) => item.volume), 1);
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const weeklySessions = sessions.filter((item) => item.date >= weekStart && item.date < weekEnd);
  const weeklyVolume = weeklySessions.reduce((sum, item) => sum + item.volume, 0);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index);
    const next = new Date(date.getTime() + 86400000);
    const volume = sessions
      .filter((item) => item.date >= date && item.date < next)
      .reduce((sum, item) => sum + item.volume, 0);
    const today = new Date();
    return {
      date,
      label: date.toLocaleDateString("pl-PL", { weekday: "short" }),
      volume,
      isToday:
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear(),
    };
  });
  const maxDayVolume = Math.max(...weekDays.map((day) => day.volume), 1);
  const totalVolume = sessions.reduce((sum, item) => sum + item.volume, 0);
  const totalMinutes = sessions.reduce((sum, item) => sum + item.duration, 0);
  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">Liczby nie kłamią</p>
        <h1 className="page-title">Historia i progres</h1>
        <p className="mt-2 text-sm text-slate-500">Wyniki liczone z każdej wykonanej serii.</p>
      </header>
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Dumbbell, label: "Ukończone sesje", value: sessions.length.toString() },
          { icon: BarChart3, label: "Łączna objętość", value: `${totalVolume.toLocaleString("pl-PL")} kg` },
          { icon: Medal, label: "Czas pod sztangą", value: `${Math.round(totalMinutes / 60)} godz.` },
        ].map(({ icon: Icon, label, value }) => (
          <article key={label} className="stat-card">
            <span className="stat-icon stat-lime">
              <Icon size={21} />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500">{label}</p>
              <strong className="mt-1 block text-xl font-black text-white">{value}</strong>
            </div>
          </article>
        ))}
      </section>
      <section className="panel p-5 sm:p-7">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-white">Objętość tygodniowa</h2>
            <p className="mt-1 text-xs text-slate-500">
              Wykonana objętość od poniedziałku do niedzieli · {weeklySessions.length} sesji
            </p>
          </div>
          <span className="rounded-lg bg-lime-400/10 px-2.5 py-1 text-xs font-black text-lime-300">
            {weeklyVolume.toLocaleString("pl-PL")} kg
          </span>
        </div>
        <div className="flex h-52 items-end gap-2 sm:gap-3">
          {weekDays.map((day) => {
            const pct = day.volume > 0 ? Math.max(8, Math.round((day.volume / maxDayVolume) * 100)) : 4;
            const empty = day.volume <= 0;
            return (
              <div
                key={day.date.toISOString()}
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
            Brak wykonanych treningów w tym tygodniu — słupki wypełnią się po zakończeniu pierwszej sesji.
          </p>
        )}
        <p className="mt-3 text-[11px] text-slate-600">
          Suma: powtórzenia × ciężar w wykonanych seriach. Tydzień resetuje się w poniedziałek.
        </p>
      </section>
      <section className="panel p-5 sm:p-7">
        <div className="mb-7">
          <h2 className="font-extrabold text-white">Objętość ostatnich sesji</h2>
          <p className="mt-1 text-xs text-slate-500">
            Suma: powtórzenia × ciężar w wykonanych seriach
          </p>
        </div>
        {chartData.length ? (
          <div className="flex h-52 items-end gap-2 sm:gap-4">
            {chartData.map((item) => (
              <div key={item.id} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
                <div
                  className="relative mx-auto w-full max-w-16 rounded-t-lg bg-gradient-to-t from-lime-600 to-lime-300"
                  style={{ height: `${Math.max(8, Math.round((item.volume / maxVolume) * 100))}%` }}
                >
                  <span className="absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-white group-hover:block">
                    {item.volume.toLocaleString("pl-PL")} kg
                  </span>
                </div>
                <p className="mt-3 truncate text-center text-[10px] text-slate-600">
                  {item.date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state border-0">
            <h3>Brak danych</h3>
            <p>Ukończ pierwszy trening.</p>
          </div>
        )}
      </section>
      <section className="panel p-5 sm:p-7">
        <div className="mb-6">
          <h2 className="font-extrabold text-white">Progres ćwiczeń</h2>
          <p className="mt-1 text-xs text-slate-500">
            Wybierz ćwiczenie z zapisanych treningów, aby porównać objętość jednostka po jednostce.
          </p>
        </div>
        <ExerciseProgressChart exercises={exerciseHistory} />
      </section>
      <section className="panel overflow-hidden">
        <div className="border-b border-white/[.06] p-5 sm:px-6">
          <h2 className="font-extrabold text-white">Dziennik sesji</h2>
        </div>
        {sessions.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trening</th>
                  <th>Data</th>
                  <th>Ćwiczenia</th>
                  <th>Serie</th>
                  <th>Objętość</th>
                  <th>Top ciężar</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <b className="text-white">{item.title}</b>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays size={14} />
                        {item.date.toLocaleDateString("pl-PL")}
                      </span>
                    </td>
                    <td>{item.exerciseIds.size}</td>
                    <td>{item.sets}</td>
                    <td>
                      <b className="text-slate-300">{item.volume.toLocaleString("pl-PL")} kg</b>
                    </td>
                    <td>{item.best} kg</td>
                    <td>
                      <Link href={`/workouts/${item.id}/session`} className="icon-button">
                        <ArrowUpRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state border-0">
            <h3>Historia jest pusta</h3>
            <p>Ukończone treningi pojawią się tutaj.</p>
          </div>
        )}
      </section>
    </div>
  );
}
