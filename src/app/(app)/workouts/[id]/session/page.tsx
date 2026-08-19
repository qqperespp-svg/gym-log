import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft, CalendarDays, Edit3 } from "lucide-react";
import { notFound } from "next/navigation";
import { saveWorkoutSessionAction } from "@/actions/workouts";
import { WorkoutSession } from "@/components/workout-session";
import { db } from "@/db";
import { exercises, exerciseSets, workouts } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function WorkoutSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, user.id)))
    .limit(1);
  if (!workout) notFound();
  const rows = await db
    .select({
      exerciseId: exercises.id,
      name: exercises.name,
      restSeconds: exercises.restSeconds,
      grp: exercises.grp,
      position: exercises.position,
      setId: exerciseSets.id,
      setNumber: exerciseSets.setNumber,
      reps: exerciseSets.reps,
      weight: exerciseSets.weight,
      rir: exerciseSets.rir,
      note: exerciseSets.note,
      completed: exerciseSets.completed,
    })
    .from(exercises)
    .innerJoin(exerciseSets, eq(exerciseSets.exerciseId, exercises.id))
    .where(eq(exercises.workoutId, id))
    .orderBy(asc(exercises.position), asc(exerciseSets.setNumber));
  const items = Array.from(
    rows
      .reduce((map, row) => {
        const current = map.get(row.exerciseId) ?? {
          id: row.exerciseId,
          name: row.name,
          restSeconds: row.restSeconds,
          grp: row.grp ?? null,
          position: row.position,
          sets: [] as Array<{
            id: number;
            setNumber: number;
            reps: number;
            weight: number;
            rir: number | null;
            note: string | null;
            completed: boolean;
          }>,
        };
        current.sets.push({
          id: row.setId,
          setNumber: row.setNumber,
          reps: row.reps,
          weight: row.weight,
          rir: row.rir,
          note: row.note,
          completed: row.completed === 1,
        });
        map.set(row.exerciseId, current);
        return map;
      }, new Map<number, { id: number; name: string; restSeconds: number; grp: string | null; position: number; sets: Array<{ id: number; setNumber: number; reps: number; weight: number; rir: number | null; note: string | null; completed: boolean }> }>())
      .values(),
  ).sort((a, b) => a.position - b.position);
  return (
    <div className="space-y-7">
      <header>
        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white"
        >
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Tryb treningu</p>
            <h1 className="page-title">{workout.title}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays size={15} />{" "}
              {workout.date.toLocaleDateString("pl-PL", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <Link href={`/workouts/${id}/edit`} className="button-secondary self-start">
            <Edit3 size={17} /> Edytuj plan
          </Link>
        </div>
      </header>
      {workout.notes && (
        <p className="rounded-xl border border-white/[.06] bg-white/[.025] px-5 py-4 text-sm italic text-slate-400">
          „{workout.notes}”
        </p>
      )}
      <WorkoutSession action={saveWorkoutSessionAction.bind(null, id)} initial={items} />
    </div>
  );
}
