"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { exercises, exerciseSets, workoutPrograms, workouts } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export type WorkoutFormState = { error?: string } | undefined;
export type SessionFormState = { error?: string; success?: string } | undefined;

type SetInput = { reps: number; weight: number; rir: number | null; completed: boolean };
type ExerciseInput = { definitionId: number | null; name: string; restSeconds: number; sets: SetInput[] };

function parseWorkout(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const dateValue = String(formData.get("date") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const durationMinutes = Number(formData.get("durationMinutes"));
  const status = formData.get("status") === "planned" ? "planned" : "completed";
  const programValue = Number(formData.get("programId"));
  const programId = programValue > 0 ? programValue : null;
  let items: ExerciseInput[] = [];
  try {
    items = JSON.parse(String(formData.get("workoutData") ?? "[]")) as ExerciseInput[];
  } catch {
    return { error: "Nie udało się odczytać tabeli serii." } as const;
  }

  if (title.length < 2) return { error: "Nadaj treningowi nazwę." } as const;
  const date = new Date(`${dateValue}T12:00:00`);
  if (!dateValue || Number.isNaN(date.getTime())) return { error: "Wybierz poprawną datę." } as const;
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) return { error: "Czas treningu musi wynosić od 1 do 600 minut." } as const;
  if (!items.length) return { error: "Dodaj co najmniej jedno ćwiczenie." } as const;
  const invalid = items.some((item) => !item.name.trim() || !item.sets.length || item.sets.length > 20 || item.restSeconds < 0 || item.sets.some((set) => set.reps < 0 || set.weight < 0 || (set.rir !== null && (set.rir < 0 || set.rir > 10))));
  if (invalid) return { error: "Sprawdź powtórzenia, ciężar i RIR w tabeli serii." } as const;
  return { title, date, notes, durationMinutes, status, programId, items };
}

async function insertWorkoutExercises(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], workoutId: number, items: ExerciseInput[]) {
  for (const [position, item] of items.entries()) {
    const [exercise] = await tx.insert(exercises).values({
      workoutId,
      exerciseDefinitionId: item.definitionId,
      name: item.name,
      position,
      sets: item.sets.length,
      reps: item.sets[0]?.reps ?? 0,
      weight: item.sets[0]?.weight ?? 0,
      restSeconds: item.restSeconds,
    }).returning();
    await tx.insert(exerciseSets).values(item.sets.map((set, index) => ({
      exerciseId: exercise.id,
      setNumber: index + 1,
      reps: set.reps,
      weight: set.weight,
      rir: set.rir,
      completed: set.completed ? 1 : 0,
    })));
  }
}

export async function createWorkoutAction(_: WorkoutFormState, formData: FormData): Promise<WorkoutFormState> {
  const user = await requireUser();
  const data = parseWorkout(formData);
  if ("error" in data) return { error: data.error };
  if (data.programId) {
    const [ownedProgram] = await db.select({ id: workoutPrograms.id }).from(workoutPrograms).where(and(eq(workoutPrograms.id, data.programId), eq(workoutPrograms.userId, user.id))).limit(1);
    if (!ownedProgram) return { error: "Wybrany program nie istnieje." };
  }
  const workout = await db.transaction(async (tx) => {
    const [created] = await tx.insert(workouts).values({ userId: user.id, programId: data.programId, title: data.title, date: data.date, notes: data.notes, durationMinutes: data.durationMinutes, status: data.status }).returning();
    await insertWorkoutExercises(tx, created.id, data.items);
    return created;
  });
  revalidatePath("/dashboard");
  revalidatePath("/workouts");
  revalidatePath("/history");
  redirect(data.status === "planned" ? `/workouts/${workout.id}/session` : `/workouts/${workout.id}/edit?saved=1`);
}

export async function updateWorkoutAction(workoutId: number, _: WorkoutFormState, formData: FormData): Promise<WorkoutFormState> {
  const user = await requireUser();
  const data = parseWorkout(formData);
  if ("error" in data) return { error: data.error };
  const [owned] = await db.select({ id: workouts.id }).from(workouts).where(and(eq(workouts.id, workoutId), eq(workouts.userId, user.id))).limit(1);
  if (!owned) return { error: "Nie znaleziono treningu." };
  if (data.programId) {
    const [ownedProgram] = await db.select({ id: workoutPrograms.id }).from(workoutPrograms).where(and(eq(workoutPrograms.id, data.programId), eq(workoutPrograms.userId, user.id))).limit(1);
    if (!ownedProgram) return { error: "Wybrany program nie istnieje." };
  }
  await db.transaction(async (tx) => {
    await tx.update(workouts).set({ title: data.title, date: data.date, notes: data.notes, durationMinutes: data.durationMinutes, status: data.status, programId: data.programId, updatedAt: new Date() }).where(eq(workouts.id, workoutId));
    await tx.delete(exercises).where(eq(exercises.workoutId, workoutId));
    await insertWorkoutExercises(tx, workoutId, data.items);
  });
  revalidatePath("/dashboard");
  revalidatePath("/workouts");
  revalidatePath(`/workouts/${workoutId}/edit`);
  revalidatePath(`/workouts/${workoutId}/session`);
  revalidatePath("/history");
  redirect(`/workouts/${workoutId}/edit?saved=1`);
}

export async function saveWorkoutSessionAction(workoutId: number, _: SessionFormState, formData: FormData): Promise<SessionFormState> {
  const user = await requireUser();
  const intent = String(formData.get("intent") ?? "save");
  let sets: Array<{ id: number; reps: number; weight: number; rir: number | null; completed: boolean }> = [];
  try {
    sets = JSON.parse(String(formData.get("sessionData") ?? "[]")) as typeof sets;
  } catch {
    return { error: "Nie udało się odczytać wyników serii." };
  }
  if (sets.some((set) => !Number.isInteger(set.id) || set.reps < 0 || set.weight < 0 || (set.rir !== null && (set.rir < 0 || set.rir > 10)))) return { error: "Sprawdź wartości w tabeli." };
  const [owned] = await db.select({ id: workouts.id }).from(workouts).where(and(eq(workouts.id, workoutId), eq(workouts.userId, user.id))).limit(1);
  if (!owned) return { error: "Nie znaleziono treningu." };
  const allowedRows = await db.select({ id: exerciseSets.id }).from(exerciseSets).innerJoin(exercises, eq(exerciseSets.exerciseId, exercises.id)).where(eq(exercises.workoutId, workoutId));
  const allowedIds = new Set(allowedRows.map((row) => row.id));
  if (sets.some((set) => !allowedIds.has(set.id))) return { error: "Wysłano serię spoza tego treningu." };

  await db.transaction(async (tx) => {
    for (const set of sets) {
      await tx.update(exerciseSets).set({ reps: set.reps, weight: set.weight, rir: set.rir, completed: set.completed ? 1 : 0 }).where(eq(exerciseSets.id, set.id));
    }
    await tx.update(workouts).set({ status: intent === "finish" ? "completed" : "in_progress", updatedAt: new Date() }).where(eq(workouts.id, workoutId));
  });
  revalidatePath("/dashboard");
  revalidatePath("/workouts");
  revalidatePath(`/workouts/${workoutId}/session`);
  revalidatePath("/history");
  if (intent === "finish") redirect("/dashboard?finished=1");
  return { success: "Postęp został zapisany." };
}

export async function deleteWorkoutAction(workoutId: number) {
  const user = await requireUser();
  await db.delete(workouts).where(and(eq(workouts.id, workoutId), eq(workouts.userId, user.id)));
  revalidatePath("/dashboard");
  revalidatePath("/workouts");
  revalidatePath("/history");
}
