import { isNull } from "drizzle-orm";
import { db, pool } from "@/db";
import { users, exercises, workouts, workoutExercises, sets, programs, programExercises } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { EXERCISE_LIBRARY } from "@/db/exercise-data";

// Self-contained schema creation so a fresh deploy works with zero manual
// database commands. These statements are idempotent (IF NOT EXISTS).
const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS "users" ("id" serial PRIMARY KEY, "email" text NOT NULL UNIQUE, "name" text NOT NULL, "password_hash" text NOT NULL, "created_at" timestamp NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS "exercises" ("id" serial PRIMARY KEY, "user_id" integer REFERENCES "users"("id"), "name" text NOT NULL, "category" text NOT NULL, "description" text, "created_at" timestamp NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS "workouts" ("id" serial PRIMARY KEY, "user_id" integer NOT NULL REFERENCES "users"("id"), "title" text NOT NULL, "notes" text, "date" timestamp NOT NULL DEFAULT now(), "duration_minutes" integer, "created_at" timestamp NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS "workout_exercises" ("id" serial PRIMARY KEY, "workout_id" integer NOT NULL REFERENCES "workouts"("id") ON DELETE CASCADE, "exercise_id" integer NOT NULL REFERENCES "exercises"("id"), "order_index" integer NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "sets" ("id" serial PRIMARY KEY, "workout_exercise_id" integer NOT NULL REFERENCES "workout_exercises"("id") ON DELETE CASCADE, "reps" integer NOT NULL, "weight" real NOT NULL, "rir" integer, "completed" boolean NOT NULL DEFAULT true)`,
  `CREATE TABLE IF NOT EXISTS "programs" ("id" serial PRIMARY KEY, "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "name" text NOT NULL, "description" text, "created_at" timestamp NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS "program_exercises" ("id" serial PRIMARY KEY, "program_id" integer NOT NULL REFERENCES "programs"("id") ON DELETE CASCADE, "exercise_id" integer NOT NULL REFERENCES "exercises"("id") ON DELETE CASCADE, "order_index" integer NOT NULL)`,
];

let initPromise: Promise<void> | null = null;

// Idempotent: safe to call on every request. Only does real work the first time.
export function initDb(): Promise<void> {
  if (!initPromise) {
    initPromise = run().catch((err) => {
      console.error("[initDb] Initialization failed:", err);
    });
  }
  return initPromise;
}

async function run() {
  for (const stmt of SCHEMA_SQL) {
    await pool.query(stmt);
  }
  await seedIfEmpty();
}

async function seedIfEmpty() {
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length) return;

  const [demo] = await db
    .insert(users)
    .values({
      email: "rat@gym.com",
      name: "Mike 'The Beast' Johnson",
      passwordHash: hashPassword("gymrat99"),
    })
    .returning();

  // Global exercise library (available to everyone)
  await db.insert(exercises).values(
    EXERCISE_LIBRARY.map((e) => ({ userId: null, name: e.name, category: e.category, description: null })),
  );

  const libRows = await db.select().from(exercises).where(isNull(exercises.userId));
  const idByName = new Map(libRows.map((r) => [r.name, r.id]));

  // Programs (templates)
  const [p1] = await db.insert(programs).values({ userId: demo.id, name: "Upper Power", description: "Heavy push + pull day" }).returning();
  const [p2] = await db.insert(programs).values({ userId: demo.id, name: "Leg Day", description: "Squats, hinges, calves" }).returning();
  const [p3] = await db.insert(programs).values({ userId: demo.id, name: "Push Pull", description: "Balanced upper body" }).returning();

  const programDefs: Record<string, string[]> = {
    [p1.id]: ["Barbell Bench Press", "Overhead Press", "Pull-Up", "Barbell Row", "Dumbbell Lateral Raise"],
    [p2.id]: ["Back Squat", "Conventional Deadlift", "Leg Press", "Romanian Deadlift", "Standing Calf Raise"],
    [p3.id]: ["Barbell Bench Press", "Overhead Press", "Lat Pulldown", "Seated Cable Row"],
  };

  for (const [pid, names] of Object.entries(programDefs)) {
    await db.insert(programExercises).values(
      names.map((name, i) => ({ programId: Number(pid), exerciseId: idByName.get(name)!, orderIndex: i })),
    );
  }

  // Demo workouts so the app feels alive on first login
  async function addWorkout(
    title: string,
    notes: string,
    minutes: number,
    daysAgo: number,
    items: { name: string; sets: { reps: number; weight: number; rir: number }[] }[],
  ) {
    const [w] = await db
      .insert(workouts)
      .values({ userId: demo.id, title, notes, durationMinutes: minutes, date: new Date(Date.now() - daysAgo * 86400000) })
      .returning();
    let order = 0;
    for (const it of items) {
      const [we] = await db
        .insert(workoutExercises)
        .values({ workoutId: w.id, exerciseId: idByName.get(it.name)!, orderIndex: order++ })
        .returning();
      await db.insert(sets).values(it.sets.map((s) => ({ workoutExerciseId: we.id, reps: s.reps, weight: s.weight, rir: s.rir })));
    }
  }

  await addWorkout("Upper Power A", "Heavy pressing", 75, 3, [
    { name: "Barbell Bench Press", sets: [{ reps: 8, weight: 225, rir: 1 }, { reps: 6, weight: 245, rir: 0 }] },
    { name: "Overhead Press", sets: [{ reps: 10, weight: 135, rir: 2 }] },
    { name: "Pull-Up", sets: [{ reps: 10, weight: 0, rir: 3 }] },
  ]);

  await addWorkout("Leg Day", "Squat focus", 90, 2, [
    { name: "Back Squat", sets: [{ reps: 5, weight: 315, rir: 1 }] },
    { name: "Conventional Deadlift", sets: [{ reps: 8, weight: 185, rir: 1 }] },
  ]);

  await addWorkout("Pull & Push", "Back and shoulders", 80, 1, [
    { name: "Pull-Up", sets: [{ reps: 12, weight: 45, rir: 2 }] },
    { name: "Romanian Deadlift", sets: [{ reps: 10, weight: 95, rir: 1 }] },
  ]);
}
