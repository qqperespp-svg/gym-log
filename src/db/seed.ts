import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { EXERCISE_CATALOG } from "@/db/exercise-catalog";
import {
  exerciseDefinitions,
  exercises,
  exerciseSets,
  programExercises,
  users,
  workoutPrograms,
  workouts,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";

export async function ensureExerciseCatalog(userId: number) {
  const existing = await db
    .select({ name: exerciseDefinitions.name })
    .from(exerciseDefinitions)
    .where(eq(exerciseDefinitions.userId, userId));
  const names = new Set(existing.map((item) => item.name.toLocaleLowerCase("pl")));
  const missing = EXERCISE_CATALOG.filter((item) => {
    const key = item.name.toLocaleLowerCase("pl");
    if (names.has(key)) return false;
    names.add(key);
    return true;
  });
  if (missing.length) {
    await db
      .insert(exerciseDefinitions)
      .values(missing.map((item) => ({ userId, ...item, isCustom: 0 })))
      .onConflictDoNothing();
  }
  return db
    .select()
    .from(exerciseDefinitions)
    .where(eq(exerciseDefinitions.userId, userId))
    .orderBy(asc(exerciseDefinitions.name));
}

export async function seedStarterData(userId: number) {
  const library = await ensureExerciseCatalog(userId);
  const byName = new Map(library.map((item) => [item.name, item]));

  const pick = (name: string) => byName.get(name);
  const bench = pick("Wyciskanie sztangi na ławce płaskiej");
  const squat = pick("Przysiad ze sztangą high bar");
  const deadlift = pick("Martwy ciąg klasyczny");
  const pullup = pick("Podciąganie nachwytem");
  const ohp = pick("Wyciskanie żołnierskie");
  const curl = pick("Uginanie ramion z hantlami");
  if (!bench || !squat || !deadlift || !pullup || !ohp || !curl) return;

  const [program] = await db
    .insert(workoutPrograms)
    .values({
      userId,
      name: "Upper Body — siła",
      description: "Bazowy zestaw góry ciała z naciskiem na progres siłowy.",
    })
    .returning();

  await db.insert(programExercises).values([
    {
      programId: program.id,
      exerciseDefinitionId: bench.id,
      name: bench.name,
      position: 0,
      targetSets: 5,
      targetReps: 5,
      targetWeight: 100,
      restSeconds: 180,
    },
    {
      programId: program.id,
      exerciseDefinitionId: pullup.id,
      name: pullup.name,
      position: 1,
      targetSets: 4,
      targetReps: 8,
      targetWeight: 0,
      restSeconds: 120,
    },
    {
      programId: program.id,
      exerciseDefinitionId: ohp.id,
      name: ohp.name,
      position: 2,
      targetSets: 4,
      targetReps: 8,
      targetWeight: 50,
      restSeconds: 120,
    },
    {
      programId: program.id,
      exerciseDefinitionId: curl.id,
      name: curl.name,
      position: 3,
      targetSets: 3,
      targetReps: 12,
      targetWeight: 16,
      restSeconds: 75,
    },
  ]);

  const now = new Date();
  const workoutRows = await db
    .insert(workouts)
    .values([
      {
        userId,
        title: "Push — siła",
        date: new Date(now.getTime() - 2 * 86400000),
        notes: "Dobra energia, progres na ławce.",
        durationMinutes: 68,
        status: "completed",
      },
      {
        userId,
        title: "Pull — objętość",
        date: new Date(now.getTime() - 5 * 86400000),
        notes: "Kontrolowane tempo w każdym powtórzeniu.",
        durationMinutes: 74,
        status: "completed",
      },
      {
        userId,
        title: "Nogi — ciężko",
        date: new Date(now.getTime() - 8 * 86400000),
        notes: "Nowy rekord serii w przysiadzie.",
        durationMinutes: 82,
        status: "completed",
      },
      {
        userId,
        programId: program.id,
        title: "Upper Body — siła",
        date: new Date(now.getTime() + 2 * 86400000),
        notes: "Plan na kolejny trening.",
        durationMinutes: 60,
        status: "planned",
      },
    ])
    .returning();

  async function addExercise(
    workoutId: number,
    definitionId: number,
    name: string,
    position: number,
    setValues: Array<{ reps: number; weight: number; rir: number; completed?: number }>,
    restSeconds: number,
  ) {
    const [exercise] = await db
      .insert(exercises)
      .values({
        workoutId,
        exerciseDefinitionId: definitionId,
        name,
        position,
        sets: setValues.length,
        reps: setValues[0]?.reps ?? 0,
        weight: setValues[0]?.weight ?? 0,
        restSeconds,
      })
      .returning();
    await db.insert(exerciseSets).values(
      setValues.map((set, index) => ({
        exerciseId: exercise.id,
        setNumber: index + 1,
        reps: set.reps,
        weight: set.weight,
        rir: set.rir,
        completed: set.completed ?? 1,
      })),
    );
  }

  await addExercise(workoutRows[0].id, bench.id, bench.name, 0, [
    { reps: 5, weight: 95, rir: 3 },
    { reps: 5, weight: 100, rir: 2 },
    { reps: 5, weight: 100, rir: 2 },
    { reps: 5, weight: 100, rir: 1 },
    { reps: 4, weight: 100, rir: 0 },
  ], 180);
  await addExercise(workoutRows[0].id, ohp.id, ohp.name, 1, [
    { reps: 8, weight: 50, rir: 2 },
    { reps: 8, weight: 50, rir: 2 },
    { reps: 7, weight: 50, rir: 1 },
    { reps: 7, weight: 50, rir: 0 },
  ], 120);

  await addExercise(workoutRows[1].id, deadlift.id, deadlift.name, 0, [
    { reps: 6, weight: 130, rir: 3 },
    { reps: 6, weight: 140, rir: 2 },
    { reps: 6, weight: 140, rir: 1 },
    { reps: 5, weight: 140, rir: 0 },
  ], 180);
  await addExercise(workoutRows[1].id, pullup.id, pullup.name, 1, [
    { reps: 10, weight: 0, rir: 2 },
    { reps: 9, weight: 0, rir: 1 },
    { reps: 8, weight: 0, rir: 1 },
    { reps: 7, weight: 0, rir: 0 },
  ], 120);
  await addExercise(workoutRows[1].id, curl.id, curl.name, 2, [
    { reps: 12, weight: 16, rir: 2 },
    { reps: 11, weight: 16, rir: 1 },
    { reps: 10, weight: 16, rir: 0 },
  ], 75);

  await addExercise(workoutRows[2].id, squat.id, squat.name, 0, [
    { reps: 5, weight: 115, rir: 3 },
    { reps: 5, weight: 125, rir: 2 },
    { reps: 5, weight: 125, rir: 2 },
    { reps: 5, weight: 125, rir: 1 },
    { reps: 4, weight: 125, rir: 0 },
  ], 210);
  await addExercise(workoutRows[2].id, deadlift.id, deadlift.name, 1, [
    { reps: 8, weight: 105, rir: 3 },
    { reps: 8, weight: 110, rir: 2 },
    { reps: 8, weight: 110, rir: 1 },
  ], 150);

  await addExercise(workoutRows[3].id, bench.id, bench.name, 0,
    Array.from({ length: 5 }, () => ({ reps: 5, weight: 100, rir: 2, completed: 0 })),
    180,
  );
  await addExercise(workoutRows[3].id, pullup.id, pullup.name, 1,
    Array.from({ length: 4 }, () => ({ reps: 8, weight: 0, rir: 2, completed: 0 })),
    120,
  );
  await addExercise(workoutRows[3].id, ohp.id, ohp.name, 2,
    Array.from({ length: 4 }, () => ({ reps: 8, weight: 50, rir: 2, completed: 0 })),
    120,
  );
  await addExercise(workoutRows[3].id, curl.id, curl.name, 3,
    Array.from({ length: 3 }, () => ({ reps: 12, weight: 16, rir: 2, completed: 0 })),
    75,
  );
}

export async function ensureDemoUser(): Promise<number> {
  const email = "demo@gymrat.pl";
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return existing.id;
  const password = await hashPassword("demo1234");
  const [user] = await db
    .insert(users)
    .values({ name: "Maks Kowalski", email, password })
    .returning();
  await seedStarterData(user.id);
  return user.id;
}
