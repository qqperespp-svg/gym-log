"use server";

import { redirect } from "next/navigation";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { workouts, workoutExercises, programExercises, sets } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

// Most recent sets for an exercise across the user's previous workouts.
async function getPreviousSets(userId: number, exerciseId: number, excludeWorkoutId: number) {
  const rows = await db
    .select({ weId: workoutExercises.id })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(eq(workouts.userId, userId), eq(workoutExercises.exerciseId, exerciseId), ne(workouts.id, excludeWorkoutId)))
    .orderBy(desc(workouts.date))
    .limit(1);

  if (!rows.length) return [];
  const list = await db.select().from(sets).where(eq(sets.workoutExerciseId, rows[0].weId)).orderBy(asc(sets.id));
  return list.map((s) => ({ reps: s.reps, weight: s.weight, rir: s.rir }));
}

export async function createWorkout(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const title = String(formData.get("title") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const durationRaw = String(formData.get("duration") || "");
  const programId = Number(formData.get("programId")) || null;

  const [created] = await db.insert(workouts).values({
    userId: user.id,
    title: title || "Workout",
    notes: notes || null,
    durationMinutes: durationRaw ? Number(durationRaw) : null,
  }).returning({ id: workouts.id });

  if (programId) {
    const pes = await db.select().from(programExercises)
      .where(eq(programExercises.programId, programId))
      .orderBy(asc(programExercises.orderIndex));

    for (const pe of pes) {
      const [we] = await db.insert(workoutExercises)
        .values({ workoutId: created.id, exerciseId: pe.exerciseId, orderIndex: pe.orderIndex })
        .returning({ id: workoutExercises.id });

      const prev = await getPreviousSets(user.id, pe.exerciseId, created.id);
      if (prev.length) {
        await db.insert(sets).values(
          prev.map((s) => ({ workoutExerciseId: we.id, reps: s.reps, weight: s.weight, rir: s.rir })),
        );
      }
    }
  }

  redirect(`/workouts/${created.id}`);
}
