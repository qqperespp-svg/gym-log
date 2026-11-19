"use server";

import { db } from "@/db";
import { exerciseDefinitions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** Znajduje ćwiczenie w katalogu użytkownika albo dodaje je (partia/sprzęt: domyślne). */
export async function ensureExerciseDefinition(userId: number, rawName: string): Promise<number | null> {
  const name = rawName.trim().slice(0, 120);
  if (name.length < 2) return null;
  const [existing] = await db
    .select({ id: exerciseDefinitions.id })
    .from(exerciseDefinitions)
    .where(and(eq(exerciseDefinitions.userId, userId), sql`lower(${exerciseDefinitions.name}) = ${name.toLowerCase()}`))
    .limit(1);
  if (existing) return existing.id;
  try {
    const [created] = await db
      .insert(exerciseDefinitions)
      .values({
        userId,
        name,
        muscleGroup: "Całe ciało",
        equipment: "Inne",
        isCustom: 1,
      })
      .onConflictDoNothing()
      .returning({ id: exerciseDefinitions.id });
    if (created) {
      revalidatePath("/exercises");
      return created.id;
    }
  } catch {
    // wyścig na unique (user_id, name) — odczytaj istniejące
  }
  const [again] = await db
    .select({ id: exerciseDefinitions.id })
    .from(exerciseDefinitions)
    .where(and(eq(exerciseDefinitions.userId, userId), sql`lower(${exerciseDefinitions.name}) = ${name.toLowerCase()}`))
    .limit(1);
  return again?.id ?? null;
}

export type ExerciseFormState = { error?: string } | undefined;

export async function createExerciseAction(
  _: ExerciseFormState,
  formData: FormData,
): Promise<ExerciseFormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const muscleGroup = String(formData.get("muscleGroup") ?? "").trim();
  if (name.length < 2) return { error: "Podaj nazwę ćwiczenia." };
  if (!muscleGroup) return { error: "Wybierz partię mięśniową." };
  await db
    .insert(exerciseDefinitions)
    .values({
      userId: user.id,
      name,
      muscleGroup,
      equipment: String(formData.get("equipment") ?? "Sztanga") || "Sztanga",
      isCustom: 1,
    })
    .onConflictDoNothing();
  revalidatePath("/exercises");
  redirect("/exercises");
}

export async function updateExerciseAction(
  exerciseId: number,
  _: ExerciseFormState,
  formData: FormData,
): Promise<ExerciseFormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Podaj nazwę ćwiczenia." };
  await db
    .update(exerciseDefinitions)
    .set({
      name,
      muscleGroup: String(formData.get("muscleGroup") ?? "Inne") || "Inne",
      equipment: String(formData.get("equipment") ?? "Inne") || "Inne",
    })
    .where(and(eq(exerciseDefinitions.id, exerciseId), eq(exerciseDefinitions.userId, user.id)));
  revalidatePath("/exercises");
  redirect("/exercises");
}

export async function deleteExerciseAction(id: number): Promise<void> {
  const user = await requireUser();
  await db
    .delete(exerciseDefinitions)
    .where(and(eq(exerciseDefinitions.id, id), eq(exerciseDefinitions.userId, user.id)));
  revalidatePath("/exercises");
  redirect("/exercises");
}
