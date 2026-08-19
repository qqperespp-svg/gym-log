import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft, CheckCircle2, Play } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateWorkoutAction } from "@/actions/workouts";
import { WorkoutForm } from "@/components/workout-form";
import { db } from "@/db";
import { exerciseDefinitions, exercises, exerciseSets, workouts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getLastPerformance } from "@/lib/workout-data";

export const dynamic = "force-dynamic";

export default async function EditWorkoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
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
  const [setRows, library, lastPerformance, query] = await Promise.all([
    db
      .select({
        exerciseId: exercises.id,
        definitionId: exercises.exerciseDefinitionId,
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
      .leftJoin(exerciseSets, eq(exerciseSets.exerciseId, exercises.id))
      .where(eq(exercises.workoutId, id))
      .orderBy(asc(exercises.position), asc(exerciseSets.setNumber)),
    db
      .select({
        id: exerciseDefinitions.id,
        name: exerciseDefinitions.name,
        muscleGroup: exerciseDefinitions.muscleGroup,
        equipment: exerciseDefinitions.equipment,
      })
      .from(exerciseDefinitions)
      .where(eq(exerciseDefinitions.userId, user.id))
      .orderBy(asc(exerciseDefinitions.name)),
    getLastPerformance(user.id),
    searchParams,
  ]);
  const grouped = Array.from(
    setRows
      .reduce((map, row) => {
        const current = map.get(row.exerciseId) ?? {
          definitionId: row.definitionId ?? 0,
          name: row.name,
          restSeconds: row.restSeconds,
          grp: row.grp ?? null,
          position: row.position,
          sets: [] as Array<{ reps: number; weight: number; rir: number | null; note: string; completed: boolean }>,
        };
        if (row.setId)
          current.sets.push({
            reps: row.reps ?? 0,
            weight: row.weight ?? 0,
            rir: row.rir,
            note: row.note ?? "",
            completed: row.completed === 1,
          });
        map.set(row.exerciseId, current);
        return map;
      }, new Map<number, { definitionId: number; name: string; restSeconds: number; grp: string | null; position: number; sets: Array<{ reps: number; weight: number; rir: number | null; note: string; completed: boolean }> }>())
      .values(),
  ).sort((a, b) => a.position - b.position);
  const action = updateWorkoutAction.bind(null, workout.id);
  const initial = {
    title: workout.title,
    date: workout.date.toISOString().slice(0, 10),
    notes: workout.notes ?? "",
    durationMinutes: workout.durationMinutes,
    status: workout.status,
    programId: workout.programId,
    exercises: grouped,
  };
  return (
    <div className="space-y-7">
      {query.saved === "1" && (
        <div className="flex items-center gap-3 rounded-xl border border-lime-400/20 bg-lime-400/[.08] px-4 py-3 text-sm text-lime-200">
          <CheckCircle2 size={18} /> Zmiany zostały zapisane.
        </div>
      )}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/workouts"
            className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white"
          >
            <ArrowLeft size={16} /> Wróć do treningów
          </Link>
          <p className="eyebrow">Edycja sesji #{workout.id}</p>
          <h1 className="page-title">Edytuj trening</h1>
          <p className="mt-2 text-sm text-slate-500">Zmień ćwiczenia lub wartości każdej serii.</p>
        </div>
        <Link href={`/workouts/${id}/session`} className="button-primary self-start">
          <Play size={17} /> Otwórz trening
        </Link>
      </header>
      <WorkoutForm
        action={action}
        library={library}
        programs={[]}
        lastPerformance={lastPerformance}
        initial={initial}
        mode="edit"
      />
    </div>
  );
}
