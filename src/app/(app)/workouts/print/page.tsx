import Link from "next/link";
import { desc, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { dietVacations, exercises, exerciseSets, workouts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isVacationDay, vacationsOverlapping } from "@/lib/diet";
import { PrintButton } from "@/components/print-button";
import { PrintVacationSection } from "@/components/print-vacation";

export const dynamic = "force-dynamic";

export default async function WorkoutPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await requireUser();
  const q = await searchParams;
  const from = q.from ? new Date(`${q.from}T00:00:00`) : null;
  const to = q.to ? new Date(`${q.to}T23:59:59`) : null;
  const [rows, vacationRows] = await Promise.all([
    db
      .select({
        id: workouts.id,
        title: workouts.title,
        date: workouts.date,
        status: workouts.status,
        exercise: exercises.name,
        setNumber: exerciseSets.setNumber,
        reps: exerciseSets.reps,
        weight: exerciseSets.weight,
        completed: exerciseSets.completed,
      })
      .from(workouts)
      .leftJoin(exercises, eq(exercises.workoutId, workouts.id))
      .leftJoin(exerciseSets, eq(exerciseSets.exerciseId, exercises.id))
      .where(eq(workouts.userId, user.id))
      .orderBy(desc(workouts.date), asc(exercises.position), asc(exerciseSets.setNumber)),
    db.select().from(dietVacations).where(eq(dietVacations.userId, user.id)),
  ]);
  const inPeriod = (date: Date) => (!from || date >= from) && (!to || date <= to);
  const completed = rows.filter((r) => r.status === "completed" && inPeriod(r.date));
  const counted = completed.filter((r) => !isVacationDay(r.date, vacationRows));
  const onVacation = completed.filter((r) => isVacationDay(r.date, vacationRows));
  const reportFrom = from;
  const reportTo = to ?? new Date();
  const reportVacations = vacationsOverlapping(vacationRows, reportFrom, reportTo);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="print-hide flex items-center justify-between">
        <Link href="/workouts" className="text-sm text-slate-500">
          ← Wróć
        </Link>
        <PrintButton />
      </div>
      <div className="panel p-6">
        <p className="eyebrow">Raport treningów</p>
        <h1 className="text-2xl font-black text-white">Historia ukończonych treningów</h1>
        <p className="mt-2 text-xs text-slate-500">
          {from ? from.toLocaleDateString("pl-PL") : "Początek"} – {to ? to.toLocaleDateString("pl-PL") : "Dzisiaj"} ·
          GYMRAT · bez dni urlopu
        </p>
        <form className="print-hide mt-4 flex flex-wrap gap-2">
          <input className="input" type="date" name="from" defaultValue={q.from} />
          <input className="input" type="date" name="to" defaultValue={q.to} />
          <button className="button-secondary" type="submit">
            Filtruj okres
          </button>
        </form>
      </div>

      <PrintVacationSection vacations={reportVacations} />

      <WorkoutTable
        rows={counted}
        empty="Brak ukończonych treningów w wybranym okresie (poza urlopem)."
      />

      {onVacation.length > 0 && (
        <div className="space-y-3">
          <div className="panel p-4">
            <h2 className="font-extrabold text-amber-200">Treningi w urlopie</h2>
            <p className="mt-1 text-xs text-slate-500">Zapisane, ale nie wliczane do podsumowania raportu.</p>
          </div>
          <WorkoutTable rows={onVacation} empty="" />
        </div>
      )}
    </div>
  );
}

function WorkoutTable({
  rows,
  empty,
}: {
  rows: Array<{
    id: number;
    title: string;
    date: Date;
    exercise: string | null;
    setNumber: number | null;
    reps: number | null;
    weight: number | null;
  }>;
  empty: string;
}) {
  return (
    <div className="panel overflow-x-auto p-6">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/[.08] text-xs text-slate-500">
            <th className="py-2">Data</th>
            <th>Trening</th>
            <th>Ćwiczenie</th>
            <th>Seria</th>
            <th>Powtórzenia</th>
            <th>Ciężar</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.id}-${r.setNumber}-${i}`} className="border-b border-white/[.04]">
              <td className="py-2">{r.date.toLocaleDateString("pl-PL")}</td>
              <td>{r.title}</td>
              <td>{r.exercise ?? "—"}</td>
              <td>{r.setNumber ?? "—"}</td>
              <td>{r.reps ?? "—"}</td>
              <td>{r.weight ?? "—"} kg</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && empty ? <p className="py-6 text-sm text-slate-500">{empty}</p> : null}
    </div>
  );
}
