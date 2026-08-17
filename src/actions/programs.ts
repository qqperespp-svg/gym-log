"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { programExercises, workoutPrograms } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export type ProgramFormState = { error?: string } | undefined;

type ProgramItem = {
  definitionId: number | null;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  restSeconds: number;
};

function parseProgram(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  let items: ProgramItem[] = [];
  try {
    items = JSON.parse(String(formData.get("programData") ?? "[]")) as ProgramItem[];
  } catch {
    return { error: "Nie udało się odczytać ćwiczeń programu." } as const;
  }
  if (name.length < 2) return { error: "Nadaj programowi nazwę." } as const;
  if (!items.length) return { error: "Dodaj co najmniej jedno ćwiczenie." } as const;
  if (items.some((item) => !item.name.trim() || item.targetSets < 1 || item.targetSets > 20 || item.targetReps < 1 || item.targetWeight < 0 || item.restSeconds < 0)) {
    return { error: "Sprawdź ustawienia ćwiczeń w programie." } as const;
  }
  return { name, description, items };
}

export async function createProgramAction(_: ProgramFormState, formData: FormData): Promise<ProgramFormState> {
  const user = await requireUser();
  const data = parseProgram(formData);
  if ("error" in data) return { error: data.error };
  const program = await db.transaction(async (tx) => {
    const [created] = await tx.insert(workoutPrograms).values({ userId: user.id, name: data.name, description: data.description }).returning();
    await tx.insert(programExercises).values(data.items.map((item, position) => ({
      programId: created.id,
      exerciseDefinitionId: item.definitionId,
      name: item.name,
      position,
      targetSets: item.targetSets,
      targetReps: item.targetReps,
      targetWeight: item.targetWeight,
      restSeconds: item.restSeconds,
    })));
    return created;
  });
  revalidatePath("/programs");
  revalidatePath("/workouts/new");
  redirect(`/programs/${program.id}/edit?saved=1`);
}

export async function updateProgramAction(id: number, _: ProgramFormState, formData: FormData): Promise<ProgramFormState> {
  const user = await requireUser();
  const data = parseProgram(formData);
  if ("error" in data) return { error: data.error };
  const [owned] = await db.select({ id: workoutPrograms.id }).from(workoutPrograms).where(and(eq(workoutPrograms.id, id), eq(workoutPrograms.userId, user.id))).limit(1);
  if (!owned) return { error: "Nie znaleziono programu." };
  await db.transaction(async (tx) => {
    await tx.update(workoutPrograms).set({ name: data.name, description: data.description, updatedAt: new Date() }).where(eq(workoutPrograms.id, id));
    await tx.delete(programExercises).where(eq(programExercises.programId, id));
    await tx.insert(programExercises).values(data.items.map((item, position) => ({
      programId: id,
      exerciseDefinitionId: item.definitionId,
      name: item.name,
      position,
      targetSets: item.targetSets,
      targetReps: item.targetReps,
      targetWeight: item.targetWeight,
      restSeconds: item.restSeconds,
    })));
  });
  revalidatePath("/programs");
  revalidatePath(`/programs/${id}/edit`);
  revalidatePath("/workouts/new");
  redirect(`/programs/${id}/edit?saved=1`);
}

export async function deleteProgramAction(id: number) {
  const user = await requireUser();
  await db.delete(workoutPrograms).where(and(eq(workoutPrograms.id, id), eq(workoutPrograms.userId, user.id)));
  revalidatePath("/programs");
  revalidatePath("/workouts/new");
}
