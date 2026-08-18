"use server";

import { db } from "@/db";
import { exerciseSets, exercises, workouts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type WorkoutFormState = { error?: string } | undefined;
export type SessionFormState = { error?: string; success?: string } | undefined;

type SerializedSet = {
  id?: number;
  reps: number;
  weight: number;
  rir: number | null;
  note: string | null;
  completed: boolean;
};
type SerializedExercise = {
  definitionId: number | null;
  name: string;
  restSeconds: number;
  sets: SerializedSet[];
};
type SerializedWorkout = {
  title: string;
  date: string;
  durationMinutes: number;
  notes: string;
  status: string;
  exercises: SerializedExercise[];
};

/**
 * Formularz wysyła w polu `workoutData` tablicę ćwiczeń (JSON),
 * a pozostałe dane treningu (tytuł, data, czas, status, notatki)
 * w osobnych polach formularza. Wcześniej serwer oczekiwał całego
 * obiektu w `workoutData` — przez to `data.title` było undefined
 * i zapis treningu kończył się błędem.
 */
function parseWorkoutRows(formData: FormData): SerializedExercise[] {
  try {
    const parsed = JSON.parse(String(formData.get("workoutData") ?? "[]"));
    return Array.isArray(parsed) ? (parsed as SerializedExercise[]) : [];
  } catch {
    return [];
  }
}

function readWorkoutData(formData: FormData): SerializedWorkout {
  return {
    title: String(formData.get("title") ?? ""),
    date: String(formData.get("date") ?? ""),
    durationMinutes: Number(formData.get("durationMinutes")) || 60,
    notes: String(formData.get("notes") ?? ""),
    status: String(formData.get("status") ?? "planned"),
    exercises: parseWorkoutRows(formData),
  };
}

function clamp(value: number, min: number, max: number, decimals = 0): number {
  const n = Number.isFinite(value) ? value : min;
  const factor = 10 ** decimals;
  return Math.min(Math.max(Math.round(n * factor) / factor, min), max);
}

async function ownedWorkout(workoutId: number, userId: number) {
  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .limit(1);
  return workout;
}

async function insertWorkoutExercises(workoutId: number, data: SerializedWorkout) {
  for (const [position, row] of data.exercises.entries()) {
    const name = row.name.trim() || "Nowe ćwiczenie";
    const [exercise] = await db
      .insert(exercises)
      .values({
        workoutId,
        exerciseDefinitionId: row.definitionId ?? null,
        name,
        position,
        sets: row.sets.length,
        reps: row.sets[0]?.reps ?? 0,
        weight: row.sets[0]?.weight ?? 0,
        restSeconds: clamp(row.restSeconds, 0, 600),
      })
      .returning();
    await db.insert(exerciseSets).values(
      row.sets.map((set, index) => ({
        exerciseId: exercise.id,
        setNumber: index + 1,
        reps: clamp(set.reps, 0, 100),
        weight: clamp(set.weight, 0, 999, 1),
        rir: set.rir != null ? clamp(set.rir, 0, 10) : null,
        note: set.note?.trim() || null,
        completed: set.completed ? 1 : 0,
      })),
    );
  }
}

export async function createWorkoutAction(
  _: WorkoutFormState,
  formData: FormData,
): Promise<WorkoutFormState> {
  const user = await requireUser();
  const data = readWorkoutData(formData);
  if (!data.title.trim() || !data.exercises.length) {
    return { error: "Uzupełnij nazwę treningu i dodaj co najmniej jedno ćwiczenie." };
  }
  const programId = Number(formData.get("programId")) || null;
  const [workout] = await db
    .insert(workouts)
    .values({
      userId: user.id,
      programId,
      title: data.title.trim(),
      date: data.date ? new Date(`${data.date}T18:00:00`) : new Date(),
      notes: data.notes.trim() || null,
      durationMinutes: clamp(data.durationMinutes, 5, 600),
      status: data.status === "completed" ? "completed" : "planned",
    })
    .returning();
  await insertWorkoutExercises(workout.id, data);
  revalidatePath("/workouts");
  redirect(`/workouts/${workout.id}/session`);
}

export async function updateWorkoutAction(
  workoutId: number,
  _: WorkoutFormState,
  formData: FormData,
): Promise<WorkoutFormState> {
  const user = await requireUser();
  const workout = await ownedWorkout(workoutId, user.id);
  if (!workout) redirect("/workouts");
  const data = readWorkoutData(formData);
  if (!data.title.trim() || !data.exercises.length) {
    return { error: "Uzupełnij nazwę treningu i dodaj co najmniej jedno ćwiczenie." };
  }
  await db
    .update(workouts)
    .set({
      title: data.title.trim(),
      date: data.date ? new Date(`${data.date}T18:00:00`) : workout.date,
      notes: data.notes.trim() || null,
      durationMinutes: clamp(data.durationMinutes, 5, 600),
      status: data.status === "completed" ? "completed" : "planned",
      updatedAt: new Date(),
    })
    .where(eq(workouts.id, workoutId));
  await db.delete(exercises).where(eq(exercises.workoutId, workoutId));
  await insertWorkoutExercises(workoutId, data);
  revalidatePath("/workouts");
  revalidatePath(`/workouts/${workoutId}/session`);
  redirect(`/workouts/${workoutId}/edit?saved=1`);
}

export async function deleteWorkoutAction(workoutId: number): Promise<void> {
  const user = await requireUser();
  if (!(await ownedWorkout(workoutId, user.id))) redirect("/workouts");
  await db.delete(workouts).where(eq(workouts.id, workoutId));
  revalidatePath("/workouts");
  revalidatePath("/history");
  redirect("/workouts");
}

// ---------- Live session ----------

export async function saveWorkoutSessionAction(
  workoutId: number,
  _: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const user = await requireUser();
  const workout = await ownedWorkout(workoutId, user.id);
  if (!workout) redirect("/workouts");

  let allSets: Array<SerializedSet & { id: number }>;
  try {
    allSets = JSON.parse(String(formData.get("sessionData") ?? "[]"));
  } catch {
    return { error: "Nie udało się zapisać postępu." };
  }

  const intent = String(formData.get("intent") ?? "save");
  const completed = allSets.filter((set) => set.completed).length;

  for (const set of allSets) {
    await db
      .update(exerciseSets)
      .set({
        reps: clamp(set.reps, 0, 100),
        weight: clamp(set.weight, 0, 999, 1),
        rir: set.rir != null ? clamp(set.rir, 0, 10) : null,
        note: set.note?.trim() || null,
        completed: set.completed ? 1 : 0,
      })
      .where(eq(exerciseSets.id, set.id));
  }

  if (intent === "finish") {
    await db
      .update(workouts)
      .set({
        status: "completed",
        date: new Date(),
        updatedAt: new Date(),
        durationMinutes: Math.min(
          Math.max(Math.round(Number(formData.get("durationMinutes")) || workout.durationMinutes), 5),
          600,
        ),
      })
      .where(eq(workouts.id, workoutId));
    revalidatePath("/dashboard");
    revalidatePath("/workouts");
    revalidatePath("/history");
    redirect("/dashboard?finished=1");
  }

  revalidatePath(`/workouts/${workoutId}/session`);
  return { success: `Zapisano postęp (${completed} wykonanych serii).` };
}
