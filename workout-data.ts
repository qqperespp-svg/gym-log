import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { exercises, exerciseSets, workouts } from "@/db/schema";

export type PreviousSet = { reps: number; weight: number; rir: number | null };

export async function getLastPerformance(userId: number) {
  const rows = await db.select({
    workoutId: workouts.id,
    definitionId: exercises.exerciseDefinitionId,
    setNumber: exerciseSets.setNumber,
    reps: exerciseSets.reps,
    weight: exerciseSets.weight,
    rir: exerciseSets.rir,
  }).from(workouts)
    .innerJoin(exercises, eq(exercises.workoutId, workouts.id))
    .innerJoin(exerciseSets, eq(exerciseSets.exerciseId, exercises.id))
    .where(and(eq(workouts.userId, userId), eq(workouts.status, "completed")))
    .orderBy(desc(workouts.date), asc(exerciseSets.setNumber));

  const chosenWorkout = new Map<number, number>();
  const result: Record<number, PreviousSet[]> = {};
  for (const row of rows) {
    if (!row.definitionId) continue;
    if (!chosenWorkout.has(row.definitionId)) chosenWorkout.set(row.definitionId, row.workoutId);
    if (chosenWorkout.get(row.definitionId) !== row.workoutId) continue;
    result[row.definitionId] ??= [];
    result[row.definitionId].push({ reps: row.reps, weight: row.weight, rir: row.rir });
  }
  return result;
}
