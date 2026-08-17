import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { workouts, workoutExercises, exercises, sets, programs, programExercises } from "@/db/schema";
import { eq, and, inArray, asc, isNull, or } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import WorkoutDetailClient from "./WorkoutDetailClient";

export default async function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;

  const [workout] = await db.select().from(workouts)
    .where(and(eq(workouts.id, Number(id)), eq(workouts.userId, user.id)))
    .limit(1);

  if (!workout) {
    return (
      <div className="space-y-4">
        <Link href="/workouts" className="inline-flex text-sm text-slate-400 hover:text-white items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back</Link>
        <p className="text-slate-400 text-lg">Workout not found.</p>
      </div>
    );
  }

  const wes = await db.select().from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workout.id))
    .orderBy(asc(workoutExercises.orderIndex));

  const exerciseIds = wes.map((we) => we.exerciseId);
  const exerciseList = exerciseIds.length
    ? await db.select().from(exercises).where(inArray(exercises.id, exerciseIds))
    : [];

  const allExercises = await db.select().from(exercises)
    .where(or(eq(exercises.userId, user.id), isNull(exercises.userId)))
    .orderBy(asc(exercises.name));

  const setList = wes.length
    ? await db.select().from(sets).where(inArray(sets.workoutExerciseId, wes.map((we) => we.id))).orderBy(asc(sets.id))
    : [];

  const exerciseMap = new Map(exerciseList.map((e) => [e.id, e]));
  const weRows = wes.map((we) => ({
    id: we.id,
    exerciseId: we.exerciseId,
    exerciseName: exerciseMap.get(we.exerciseId)?.name ?? "Unknown",
    sets: setList.filter((s) => s.workoutExerciseId === we.id).map((s) => ({ id: s.id, reps: s.reps, weight: s.weight, rir: s.rir })),
  }));

  // Programs (templates) available to load into this workout
  const userPrograms = await db.select().from(programs).where(eq(programs.userId, user.id)).orderBy(asc(programs.name));
  const pes = userPrograms.length
    ? await db.select().from(programExercises).where(inArray(programExercises.programId, userPrograms.map((p) => p.id))).orderBy(asc(programExercises.orderIndex))
    : [];
  const programOptions = userPrograms.map((p) => ({
    id: p.id,
    name: p.name,
    exercises: pes
      .filter((pe) => pe.programId === p.id)
      .map((pe) => {
        const ex = allExercises.find((e) => e.id === pe.exerciseId);
        return ex ? { id: ex.id, name: ex.name, category: ex.category } : { id: pe.exerciseId, name: "Unknown", category: "Other" };
      }),
  }));

  return (
    <div className="space-y-8">
      <Link href="/workouts" className="inline-flex text-sm text-slate-400 hover:text-white items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back to workouts</Link>
      <WorkoutDetailClient
        workout={{ id: workout.id, title: workout.title, notes: workout.notes, durationMinutes: workout.durationMinutes, date: workout.date.toISOString() }}
        exercises={allExercises}
        weRows={weRows}
        programs={programOptions}
      />
    </div>
  );
}
