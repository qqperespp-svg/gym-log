"use server";

import { db } from "@/db";
import { programExercises, workoutPrograms } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ProgramFormState = { error?: string } | undefined;

type SerializedProgramRow = {
  definitionId: number | null;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  restSeconds: number;
};
type SerializedProgram = {
  name: string;
  description: string;
  exercises: SerializedProgramRow[];
};

function clamp(value: number, min: number, max: number): number {
  const n = Number.isFinite(value) ? value : min;
  return Math.min(Math.max(Math.round(n), min), max);
}

function parseProgramData(formData: FormData): SerializedProgram | null {
  try {
    return JSON.parse(String(formData.get("programData") ?? "{}")) as SerializedProgram;
  } catch {
    return null;
  }
}

async function saveProgramRows(programId: number, data: SerializedProgram) {
  const rows = data.exercises.filter((row) => row && (row.definitionId || row.name.trim()));
  if (!rows.length) return;
  await db.insert(programExercises).values(
    rows.slice(0, 30).map((row, position) => ({
      programId,
      exerciseDefinitionId: row.definitionId ?? null,
      name: row.name.trim() || "Ćwiczenie",
      position,
      targetSets: clamp(row.targetSets, 1, 12),
      targetReps: clamp(row.targetReps, 1, 100),
      targetWeight: clamp(row.targetWeight, 0, 999),
      restSeconds: clamp(row.restSeconds, 0, 600),
    })),
  );
}

export async function createProgramAction(
  _: ProgramFormState,
  formData: FormData,
): Promise<ProgramFormState> {
  const user = await requireUser();
  const data = parseProgramData(formData);
  if (!data || data.name.trim().length < 2) {
    return { error: "Podaj nazwę programu." };
  }
  const [program] = await db
    .insert(workoutPrograms)
    .values({
      userId: user.id,
      name: data.name.trim(),
      description: data.description.trim() || null,
    })
    .returning();
  await saveProgramRows(program.id, data);
  revalidatePath("/programs");
  redirect("/programs");
}

export async function updateProgramAction(
  programId: number,
  _: ProgramFormState,
  formData: FormData,
): Promise<ProgramFormState> {
  const user = await requireUser();
  const [program] = await db
    .select()
    .from(workoutPrograms)
    .where(and(eq(workoutPrograms.id, programId), eq(workoutPrograms.userId, user.id)))
    .limit(1);
  if (!program) redirect("/programs");
  const data = parseProgramData(formData);
  if (!data || data.name.trim().length < 2) {
    return { error: "Podaj nazwę programu." };
  }
  await db
    .update(workoutPrograms)
    .set({ name: data.name.trim(), description: data.description.trim() || null, updatedAt: new Date() })
    .where(eq(workoutPrograms.id, programId));
  await db.delete(programExercises).where(eq(programExercises.programId, programId));
  await saveProgramRows(programId, data);
  revalidatePath("/programs");
  revalidatePath(`/programs/${programId}/edit`);
  redirect("/programs");
}

export async function deleteProgramAction(programId: number): Promise<void> {
  const user = await requireUser();
  await db
    .delete(workoutPrograms)
    .where(and(eq(workoutPrograms.id, programId), eq(workoutPrograms.userId, user.id)));
  revalidatePath("/programs");
  redirect("/programs");
}
