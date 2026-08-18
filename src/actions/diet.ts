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

/** Zapisuje dzienne cele kcal (liczone z białka, tłuszczy i węglowodanów) dla każdego dnia tygodnia. */
export async function saveDietGoalsAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  for (const { n } of WEEKDAYS) {
    const protein = clamp(Number(formData.get(`protein-${n}`)) || 0, 0, 9999);
    const fat = clamp(Number(formData.get(`fat-${n}`)) || 0, 0, 9999);
    const carbs = clamp(Number(formData.get(`carbs-${n}`)) || 0, 0, 9999);
    const kcalGoal = kcalFromMacros(protein, fat, carbs);
    await db
      .insert(dietGoals)
      .values({ userId: user.id, weekday: n, protein, fat, carbs, kcalGoal })
      .onConflictDoUpdate({
        target: [dietGoals.userId, dietGoals.weekday],
        set: { protein, fat, carbs, kcalGoal, updatedAt: new Date() },
      });
  }
  revalidatePath("/micha");
  revalidatePath("/dashboard");
  redirect("/micha?saved=1");
}

/** Dopisuje wpis o spożytych kcal w danym dniu. */
export async function logDietKcalAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dateStr = String(formData.get("date") ?? "").trim();
  const kcal = clamp(Number(formData.get("kcal")) || 0, 0, 20000);
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!dateStr) redirect("/micha");
  await db.insert(dietLogs).values({
    userId: user.id,
    date: new Date(`${dateStr}T12:00:00`),
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
