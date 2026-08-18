"use server";

import { db } from "@/db";
import { dietGoals, dietLogs, foodProducts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { WEEKDAYS, kcalFromMacros } from "@/lib/diet";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function clamp(value: number, min: number, max: number): number {
  const n = Number.isFinite(value) ? value : min;
  return Math.min(Math.max(Math.round(n), min), max);
}

function readMealNumber(formData: FormData): number | null {
  const raw = Number(formData.get("meal") ?? 0);
  if (!Number.isFinite(raw) || raw < 1 || raw > 12) return null;
  return Math.round(raw);
}

/** Zapisuje dzienne cele makro (i liczone z nich kcal) oraz liczbę posiłków dla każdego dnia tygodnia. */
export async function saveDietGoalsAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  for (const { n } of WEEKDAYS) {
    const protein = clamp(Number(formData.get(`protein-${n}`)) || 0, 0, 9999);
    const fat = clamp(Number(formData.get(`fat-${n}`)) || 0, 0, 9999);
    const carbs = clamp(Number(formData.get(`carbs-${n}`)) || 0, 0, 9999);
    const kcalGoal = kcalFromMacros(protein, fat, carbs);
    const trainingDay = String(formData.get(`training-${n}`) ?? "") === "1" ? 1 : 0;
    const meals = clamp(Number(formData.get(`meals-${n}`)) || 3, 1, 10);
    await db
      .insert(dietGoals)
      .values({ userId: user.id, weekday: n, protein, fat, carbs, kcalGoal, trainingDay, meals })
      .onConflictDoUpdate({
        target: [dietGoals.userId, dietGoals.weekday],
        set: { protein, fat, carbs, kcalGoal, trainingDay, meals, updatedAt: new Date() },
      });
  }
  revalidatePath("/micha");
  revalidatePath("/dashboard");
  redirect("/micha?saved=1");
}

/** Dopisuje wpis spożycia — białko/tłuszcze/węglowodany, kcal liczone z makro, numer posiłku. */
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
    mealNumber: readMealNumber(formData),
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

/** Dopisuje wpis spożycia z produktu zeskanowanego z kodu kreskowego.
 *  Makro (i kcal) są już przeliczone na gramaturę po stronie klienta. */
export async function logScannedEntryAction(formData: FormData): Promise<void> {
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
    mealNumber: readMealNumber(formData),
    note,
  });
  revalidatePath("/micha");
  revalidatePath("/dashboard");
  redirect("/micha?saved=1");
}

// ---------- Katalog produktów ----------

/** Dodaje własny produkt spożywczy (białko/tłuszcze/węglowodany + opcjonalny kod kreskowy). */
export async function addFoodProductAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) redirect("/micha");
  const protein = clamp(Number(formData.get("protein")) || 0, 0, 999);
  const fat = clamp(Number(formData.get("fat")) || 0, 0, 999);
  const carbs = clamp(Number(formData.get("carbs")) || 0, 0, 999);
  const kcal = kcalFromMacros(protein, fat, carbs);
  const barcode = String(formData.get("barcode") ?? "").trim() || null;
  await db.insert(foodProducts).values({
    userId: user.id,
    name: name.slice(0, 255),
    barcode,
    protein,
    fat,
    carbs,
    kcal,
    isCustom: 1,
  }).onConflictDoNothing();
  revalidatePath("/micha");
  redirect("/micha?saved=1");
}

export async function deleteFoodProductAction(id: number): Promise<void> {
  const user = await requireUser();
  await db
    .delete(foodProducts)
    .where(and(eq(foodProducts.id, id), eq(foodProducts.userId, user.id)));
  revalidatePath("/micha");
  redirect("/micha?saved=1");
}
