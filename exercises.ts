"use server";

import { db } from "@/db";
import { exerciseDefinitions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
