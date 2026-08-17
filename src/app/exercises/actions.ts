"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { exercises, workoutExercises } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

export async function createExercise(data: { name: string; category: string; description?: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await db.insert(exercises).values({
    userId: user.id,
    name: data.name,
    category: data.category || "Other",
    description: data.description || null,
  });
  revalidatePath("/exercises");
}

export async function updateExercise(id: number, data: { name: string; category: string; description?: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await db.update(exercises)
    .set({ name: data.name, category: data.category || "Other", description: data.description || null })
    .where(and(eq(exercises.id, id), eq(exercises.userId, user.id)));
  revalidatePath("/exercises");
}

export async function deleteExercise(id: number): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Unauthorized" };
  const inUse = await db.select({ id: workoutExercises.id }).from(workoutExercises).where(eq(workoutExercises.exerciseId, id)).limit(1);
  if (inUse.length) {
    return { ok: false, error: "This exercise is used in a workout and can't be deleted." };
  }
  await db.delete(exercises).where(and(eq(exercises.id, id), eq(exercises.userId, user.id)));
  revalidatePath("/exercises");
  return { ok: true };
}
