"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { workouts, workoutExercises, sets } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

function requireUser() {
  return getCurrentUser().then((u) => {
    if (!u) throw new Error("Unauthorized");
    return u;
  });
}

function revalidate(workoutId?: number) {
  revalidatePath("/workouts");
  revalidatePath("/dashboard");
  if (workoutId) revalidatePath(`/workouts/${workoutId}`);
}

export async function updateWorkout(id: number, data: { title: string; notes: string; durationMinutes: number | null }) {
  const user = await requireUser();
  await db.update(workouts)
    .set({ title: data.title, notes: data.notes || null, durationMinutes: data.durationMinutes })
    .where(and(eq(workouts.id, id), eq(workouts.userId, user.id)));
  revalidate(id);
}

export async function deleteWorkout(id: number) {
  const user = await requireUser();
  await db.delete(workouts).where(and(eq(workouts.id, id), eq(workouts.userId, user.id)));
  revalidate();
}

export async function addExerciseToWorkout(workoutId: number, exerciseId: number) {
  await requireUser();
  const [max] = await db
    .select({ m: sql<number>`coalesce(max(${workoutExercises.orderIndex}), -1)::int` })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId));
  const [we] = await db.insert(workoutExercises)
    .values({ workoutId, exerciseId, orderIndex: max.m + 1 })
    .returning({ id: workoutExercises.id });
  revalidate(workoutId);
  return we.id;
}

export async function removeExercise(workoutExerciseId: number) {
  await requireUser();
  await db.delete(workoutExercises).where(eq(workoutExercises.id, workoutExerciseId));
  revalidate();
}

export async function addSet(workoutExerciseId: number, reps: number, weight: number, rir: number | null) {
  await requireUser();
  const [s] = await db.insert(sets)
    .values({ workoutExerciseId, reps, weight, rir, completed: true })
    .returning({ id: sets.id });
  revalidate();
  return s.id;
}

export async function removeSet(setId: number) {
  await requireUser();
  await db.delete(sets).where(eq(sets.id, setId));
  revalidate();
}
