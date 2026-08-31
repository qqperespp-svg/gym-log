"use server";

import { db } from "@/db";
import { exerciseSets, exercises, workouts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, asc, eq, sql } from "drizzle-orm";
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
  grp?: string | null;
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
        grp: row.grp ? String(row.grp).slice(0, 8) : null,
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
  const completed = await persistSessionSets(workoutId, allSets);

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

// ---------- Serie dodawane w trakcie treningu ----------

export type SessionSet = {
  id: number;
  setNumber: number;
  reps: number;
  weight: number;
  rir: number | null;
  note: string | null;
  completed: boolean;
  isExtra: boolean;
};
export type AddSetResult = { error: string } | { set: SessionSet; savedAt: number };
export type RemoveSetResult = { error: string } | { removedId: number; savedAt: number };
export type AutosaveResult = { error: string } | { savedAt: number };

/**
 * Sprawdza, czy ćwiczenie należy do treningu zalogowanego użytkownika.
 */
async function ownedExercise(exerciseId: number, workoutId: number, userId: number) {
  const [row] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .innerJoin(workouts, eq(workouts.id, exercises.workoutId))
    .where(
      and(
        eq(exercises.id, exerciseId),
        eq(exercises.workoutId, workoutId),
        eq(workouts.userId, userId),
      ),
    )
    .limit(1);
  return row;
}

/**
 * Zapisuje wartości serii należących do wskazanego treningu.
 * Zwraca liczbę wykonanych serii (spośród przesłanych).
 */
async function persistSessionSets(
  workoutId: number,
  rows: Array<SerializedSet & { id: number }>,
): Promise<number> {
  const owned = await db
    .select({ id: exerciseSets.id })
    .from(exerciseSets)
    .innerJoin(exercises, eq(exercises.id, exerciseSets.exerciseId))
    .where(eq(exercises.workoutId, workoutId));
  const allowed = new Set(owned.map((row) => row.id));
  let completed = 0;
  for (const set of rows) {
    if (!allowed.has(Number(set.id))) continue;
    if (set.completed) completed += 1;
    await db
      .update(exerciseSets)
      .set({
        reps: clamp(set.reps, 0, 100),
        weight: clamp(set.weight, 0, 999, 1),
        rir: set.rir != null ? clamp(set.rir, 0, 10) : null,
        note: set.note?.trim() || null,
        completed: set.completed ? 1 : 0,
      })
      .where(eq(exerciseSets.id, Number(set.id)));
  }
  return completed;
}

/**
 * Dodaje dodatkową serię do ćwiczenia w trakcie treningu.
 *
 * Świadomie NIE modyfikuje planu treningowego: kolumna `exercises.sets`
 * (założona liczba serii) ani program pozostają bez zmian — nowy wiersz
 * trafia wyłącznie do `exercise_sets` z flagą `is_extra = 1`.
 */
export async function addSessionSetAction(
  workoutId: number,
  exerciseId: number,
): Promise<AddSetResult> {
  const user = await requireUser();
  if (!(await ownedExercise(exerciseId, workoutId, user.id))) {
    return { error: "Nie znaleziono ćwiczenia w tym treningu." };
  }
  const existing = await db
    .select({
      setNumber: exerciseSets.setNumber,
      reps: exerciseSets.reps,
      weight: exerciseSets.weight,
      rir: exerciseSets.rir,
    })
    .from(exerciseSets)
    .where(eq(exerciseSets.exerciseId, exerciseId))
    .orderBy(asc(exerciseSets.setNumber));
  const last = existing.at(-1);
  const nextNumber = (last?.setNumber ?? 0) + 1;
  const [created] = await db
    .insert(exerciseSets)
    .values({
      exerciseId,
      setNumber: nextNumber,
      reps: clamp(last?.reps ?? 0, 0, 100),
      weight: clamp(last?.weight ?? 0, 0, 999, 1),
      rir: last?.rir != null ? clamp(last.rir, 0, 10) : null,
      note: null,
      completed: 0,
      isExtra: 1,
    })
    .returning();
  revalidatePath(`/workouts/${workoutId}/session`);
  return {
    savedAt: Date.now(),
    set: {
      id: created.id,
      setNumber: created.setNumber,
      reps: created.reps,
      weight: created.weight,
      rir: created.rir,
      note: created.note,
      completed: created.completed === 1,
      isExtra: true,
    },
  };
}

/**
 * Usuwa serię dodaną w trakcie treningu. Serie z planu są nietykalne.
 */
export async function removeSessionSetAction(
  workoutId: number,
  setId: number,
): Promise<RemoveSetResult> {
  const user = await requireUser();
  const [row] = await db
    .select({ id: exerciseSets.id, exerciseId: exerciseSets.exerciseId, isExtra: exerciseSets.isExtra })
    .from(exerciseSets)
    .innerJoin(exercises, eq(exercises.id, exerciseSets.exerciseId))
    .innerJoin(workouts, eq(workouts.id, exercises.workoutId))
    .where(
      and(
        eq(exerciseSets.id, setId),
        eq(exercises.workoutId, workoutId),
        eq(workouts.userId, user.id),
      ),
    )
    .limit(1);
  if (!row) return { error: "Nie znaleziono serii." };
  if (row.isExtra !== 1) return { error: "Serii z planu nie można usunąć w trybie treningu." };
  await db.delete(exerciseSets).where(eq(exerciseSets.id, setId));
  // Domknij numerację (unikalny indeks exercise_id + set_number) — najpierw
  // przesuń numery poza zakres, potem ponumeruj od 1.
  await db
    .update(exerciseSets)
    .set({ setNumber: sql`${exerciseSets.setNumber} + 1000` })
    .where(eq(exerciseSets.exerciseId, row.exerciseId));
  const rest = await db
    .select({ id: exerciseSets.id })
    .from(exerciseSets)
    .where(eq(exerciseSets.exerciseId, row.exerciseId))
    .orderBy(asc(exerciseSets.setNumber));
  for (const [index, item] of rest.entries()) {
    await db
      .update(exerciseSets)
      .set({ setNumber: index + 1 })
      .where(eq(exerciseSets.id, item.id));
  }
  revalidatePath(`/workouts/${workoutId}/session`);
  return { removedId: setId, savedAt: Date.now() };
}

/**
 * Autozapis postępu treningu (wywoływany m.in. po oznaczeniu serii
 * jako wykonanej). Nie zmienia statusu treningu ani planu.
 */
export async function autosaveSessionAction(
  workoutId: number,
  rows: Array<SerializedSet & { id: number }>,
): Promise<AutosaveResult> {
  const user = await requireUser();
  if (!(await ownedWorkout(workoutId, user.id))) return { error: "Brak dostępu do treningu." };
  if (!Array.isArray(rows)) return { error: "Nie udało się zapisać postępu." };
  try {
    await persistSessionSets(workoutId, rows);
  } catch {
    return { error: "Nie udało się zapisać postępu." };
  }
  return { savedAt: Date.now() };
}
