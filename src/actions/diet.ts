"use server";

import { db } from "@/db";
import { dietGoals, dietLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { WEEKDAYS, kcalFromMacros } from "@/lib/diet";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function clamp(value: number, min: number, max: number): number {
  const n = Number.isFinite(value) ? value : min;
  return Math.min(Math.max(Math.round(n), min), max);
}

/** Zapisuje dzienne cele makro (i liczone z nich kcal) dla każdego dnia tygodnia. */
export async function saveDietGoalsAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  for (const { n } of WEEKDAYS) {
    const protein = clamp(Number(formData.get(`protein-${n}`)) || 0, 0, 9999);
    const fat = clamp(Number(formData.get(`fat-${n}`)) || 0, 0, 9999);
    const carbs = clamp(Number(formData.get(`carbs-${n}`)) || 0, 0, 9999);
    const kcalGoal = kcalFromMacros(protein, fat, carbs);
    const trainingDay = String(formData.get(`training-${n}`) ?? "") === "1" ? 1 : 0;
    await db
      .insert(dietGoals)
      .values({ userId: user.id, weekday: n, protein, fat, carbs, kcalGoal, trainingDay })
      .onConflictDoUpdate({
        target: [dietGoals.userId, dietGoals.weekday],
        set: { protein, fat, carbs, kcalGoal, trainingDay, updatedAt: new Date() },
      });
  }
  revalidatePath("/micha");
  revalidatePath("/dashboard");
  redirect("/micha?saved=1");
}

/** Dopisuje wpis spożycia — białko/tłuszcze/węglowodany, a kcal liczone są z makro. */
export async function logDietEntryAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dateStr = String(formData.get("date") ?? "").trim();
  const protein = clamp(Number(formData.get("protein")) || 0, 0, 9999);
  const fat = clamp(Number(formData.get("fat")) || 0, 0, 9999);
  const carbs = clamp(Number(formData.get("carbs")) || 0, 0, 9999);
  const kcal = kcalFromMacros(protein, fat, carbs);
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!dateStr) redirect("/micha");
  await db.insert(dietLogs).values({
    userId: user.id,
    date: new Date(`${dateStr}T12:00:00`),
    protein,
    fat,
    carbs,
    kcal,
    note,
  });
  revalidatePath("/micha");
  revalidatePath("/dashboard");
  redirect("/micha?saved=1");
}

export async function deleteDietLogAction(id: number): Promise<void> {
  const user = await requireUser();
  await db.delete(dietLogs).where(and(eq(dietLogs.id, id), eq(dietLogs.userId, user.id)));
  revalidatePath("/micha");
  revalidatePath("/dashboard");
}
