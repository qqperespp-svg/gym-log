"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { programs, programExercises, workoutExercises } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function createProgram(data: { name: string; description?: string; exerciseIds: number[] }) {
  const user = await requireUser();
  const [program] = await db.insert(programs)
    .values({ userId: user.id, name: data.name, description: data.description || null })
    .returning({ id: programs.id });

  if (data.exerciseIds.length) {
    await db.insert(programExercises).values(
      data.exerciseIds.map((exerciseId, i) => ({ programId: program.id, exerciseId, orderIndex: i })),
    );
  }
  revalidatePath("/programs");
}

export async function updateProgram(id: number, data: { name: string; description?: string; exerciseIds: number[] }) {
  const user = await requireUser();
  await db.update(programs)
    .set({ name: data.name, description: data.description || null })
    .where(and(eq(programs.id, id), eq(programs.userId, user.id)));

  await db.delete(programExercises).where(eq(programExercises.programId, id));
  if (data.exerciseIds.length) {
    await db.insert(programExercises).values(
      data.exerciseIds.map((exerciseId, i) => ({ programId: id, exerciseId, orderIndex: i })),
    );
  }
  revalidatePath("/programs");
}

export async function deleteProgram(id: number) {
  const user = await requireUser();
  await db.delete(programs).where(and(eq(programs.id, id), eq(programs.userId, user.id)));
  revalidatePath("/programs");
}

export async function applyProgramToWorkout(workoutId: number, programId: number) {
  await requireUser();
  const pes = await db.select().from(programExercises).where(eq(programExercises.programId, programId));
  if (!pes.length) return;
  await db.insert(workoutExercises).values(
    pes.map((pe) => ({ workoutId, exerciseId: pe.exerciseId, orderIndex: pe.orderIndex })),
  );
  revalidatePath(`/workouts/${workoutId}`);
}
