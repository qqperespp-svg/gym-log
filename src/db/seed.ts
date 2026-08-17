import { sql } from "drizzle-orm";
import { db } from "./index";
import { users, exercises, workouts, workoutExercises, sets, programs, programExercises } from "./schema";
import { EXERCISE_LIBRARY } from "./exercise-data";
import { hashPassword } from "@/lib/auth";

async function seed() {
  await db.execute(sql`TRUNCATE TABLE sets, workout_exercises, workouts, program_exercises, programs, exercises, users RESTART IDENTITY CASCADE`);

  const userId = 1;

  await db.insert(users).values({
    id: userId,
    email: "rat@gym.com",
    name: "Mike 'The Beast' Johnson",
    passwordHash: hashPassword("gymrat99"),
  });

  // Global exercise library (available to every user)
  const library = EXERCISE_LIBRARY.map((e, i) => ({
    id: i + 1,
    userId: null,
    name: e.name,
    category: e.category,
    description: null,
  }));
  await db.insert(exercises).values(library);

  // A few personal, custom exercises for the demo user
  await db.insert(exercises).values([
    { id: 1000, userId, name: "My Custom Cable Row (home)", category: "Back", description: "Home cable tower" },
    { id: 1001, userId, name: "Driveway Sled Drag", category: "Cardio", description: "Rogue sled in the garage" },
  ]);

  const idByName = new Map(EXERCISE_LIBRARY.map((e, i) => [e.name, i + 1]));

  // Demo workouts
  const workoutsData = [
    { id: 1, userId, title: "Upper Power A", notes: "Heavy pressing", durationMinutes: 75, date: new Date("2025-11-10T08:00:00Z") },
    { id: 2, userId, title: "Leg Day", notes: "Squat focus", durationMinutes: 90, date: new Date("2025-11-11T17:00:00Z") },
    { id: 3, userId, title: "Pull & Push", notes: "Back and shoulders", durationMinutes: 80, date: new Date("2025-11-13T10:00:00Z") },
  ];
  await db.insert(workouts).values(workoutsData);

  const weData = [
    { id: 1, workoutId: 1, exerciseId: idByName.get("Barbell Bench Press")!, orderIndex: 0 },
    { id: 2, workoutId: 1, exerciseId: idByName.get("Overhead Press")!, orderIndex: 1 },
    { id: 3, workoutId: 1, exerciseId: idByName.get("Pull-Up")!, orderIndex: 2 },
    { id: 4, workoutId: 2, exerciseId: idByName.get("Back Squat")!, orderIndex: 0 },
    { id: 5, workoutId: 2, exerciseId: idByName.get("Conventional Deadlift")!, orderIndex: 1 },
    { id: 6, workoutId: 3, exerciseId: idByName.get("Pull-Up")!, orderIndex: 0 },
    { id: 7, workoutId: 3, exerciseId: idByName.get("Romanian Deadlift")!, orderIndex: 1 },
  ];
  await db.insert(workoutExercises).values(weData);

  const setsData = [
    { workoutExerciseId: 1, reps: 8, weight: 225, rir: 1 },
    { workoutExerciseId: 1, reps: 6, weight: 245, rir: 0 },
    { workoutExerciseId: 2, reps: 10, weight: 135, rir: 2 },
    { workoutExerciseId: 3, reps: 10, weight: 0, rir: 3 },
    { workoutExerciseId: 4, reps: 5, weight: 315, rir: 1 },
    { workoutExerciseId: 5, reps: 8, weight: 185, rir: 1 },
    { workoutExerciseId: 6, reps: 12, weight: 45, rir: 2 },
    { workoutExerciseId: 7, reps: 10, weight: 95, rir: 1 },
  ];
  await db.insert(sets).values(setsData);

  // Demo training programs (templates)
  const programsData = [
    { id: 1, userId, name: "Upper Power", description: "Heavy push + pull day" },
    { id: 2, userId, name: "Leg Day", description: "Squats, hinges, calves" },
    { id: 3, userId, name: "Push Pull", description: "Balanced upper body" },
  ];
  await db.insert(programs).values(programsData);

  const programExerciseNames: Record<number, string[]> = {
    1: ["Barbell Bench Press", "Overhead Press", "Pull-Up", "Barbell Row", "Dumbbell Lateral Raise"],
    2: ["Back Squat", "Conventional Deadlift", "Leg Press", "Romanian Deadlift", "Standing Calf Raise"],
    3: ["Barbell Bench Press", "Overhead Press", "Lat Pulldown", "Seated Cable Row"],
  };

  const peData: { programId: number; exerciseId: number; orderIndex: number }[] = [];
  for (const [pid, names] of Object.entries(programExerciseNames)) {
    names.forEach((name, i) => {
      peData.push({ programId: Number(pid), exerciseId: idByName.get(name)!, orderIndex: i });
    });
  }
  await db.insert(programExercises).values(peData);

  console.log(`Seeded! ${library.length} exercises, ${programsData.length} programs, ${workoutsData.length} workouts.`);
}

seed().catch(console.error);
