"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { exerciseDefinitions } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export type ExerciseFormState = { error?: string } | undefined;

function parseExercise(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const muscleGroup = String(formData.get("muscleGroup") ?? "").trim();
  const equipment = String(formData.get("equipment") ?? "").trim();
  if (name.length < 2) return { error: "Podaj nazwę ćwiczenia." } as const;
  if (!muscleGroup) return { error: "Wybierz partię mięśniową." } as const;
  if (!equipment) return { error: "Wybierz sprzęt." } as const;
  return { name, muscleGroup, equipment };
}

export async function createExerciseAction(_: ExerciseFormState, formData: FormData): Promise<ExerciseFormState> {
  const user = await requireUser();
  const data = parseExercise(formData);
  if ("error" in data) return { error: data.error };
  const [duplicate] = await db.select({ id: exerciseDefinitions.id }).from(exerciseDefinitions).where(and(eq(exerciseDefinitions.userId, user.id), eq(exerciseDefinitions.name, data.name))).limit(1);
  if (duplicate) return { error: "Ćwiczenie o tej nazwie jest już w bibliotece." };
  await db.insert(exerciseDefinitions).values({ userId: user.id, ...data, isCustom: 1 });
  revalidatePath("/exercises");
  revalidatePath("/workouts/new");
  revalidatePath("/programs/new");
  return undefined;
}

export async function updateExerciseAction(id: number, _: ExerciseFormState, formData: FormData): Promise<ExerciseFormState> {
  const user = await requireUser();
  const data = parseExercise(formData);
  if ("error" in data) return { error: data.error };
  const [duplicate] = await db.select({ id: exerciseDefinitions.id }).from(exerciseDefinitions).where(and(eq(exerciseDefinitions.userId, user.id), eq(exerciseDefinitions.name, data.name))).limit(1);
  if (duplicate && duplicate.id !== id) return { error: "Ćwiczenie o tej nazwie jest już w bibliotece." };
  await db.update(exerciseDefinitions).set(data).where(and(eq(exerciseDefinitions.id, id), eq(exerciseDefinitions.userId, user.id), eq(exerciseDefinitions.isCustom, 1)));
  revalidatePath("/exercises");
  redirect("/exercises?saved=1");
}

export async function deleteExerciseAction(id: number) {
  const user = await requireUser();
  await db.delete(exerciseDefinitions).where(and(eq(exerciseDefinitions.id, id), eq(exerciseDefinitions.userId, user.id), eq(exerciseDefinitions.isCustom, 1)));
  revalidatePath("/exercises");
}
