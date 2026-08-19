"use server";

import { db } from "@/db";
import {
  bodyMeasurements,
  dietGoals,
  dietLogs,
  foodProducts,
  userSettings,
  waterLogs,
  workouts,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { WEEKDAYS, kcalFromMacros } from "@/lib/diet";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** Zapisuje ustawienia użytkownika (język, cel wody, przypomnienia). */
export async function saveSettingsAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const lang = String(formData.get("lang") ?? "pl") === "en" ? "en" : "pl";
  const waterGoal = Math.min(Math.max(Number(formData.get("waterGoal")) || 2.5, 0.5), 10);
  const reminders: string[] = [];
  for (let i = 1; i <= 4; i++) {
    const t = String(formData.get(`reminder${i}`) ?? "").trim();
    if (t) reminders.push(t);
  }
  await db
    .insert(userSettings)
    .values({ userId: user.id, lang, waterGoal, reminders: JSON.stringify(reminders) })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { lang, waterGoal, reminders: JSON.stringify(reminders), updatedAt: new Date() },
    });
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

/** TDEE: wylicza i zapisuje cele makro/kcal dla wszystkich dni tygodnia. */
export async function saveTdeeAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const sex = String(formData.get("sex") ?? "m") === "f" ? "f" : "m";
  const age = Math.max(10, Math.min(100, Number(formData.get("age")) || 30));
  const height = Math.max(120, Math.min(230, Number(formData.get("height")) || 175));
  const weight = Math.max(30, Math.min(300, Number(formData.get("weight")) || 80));
  const activity = Number(formData.get("activity")) || 1.4;
  const goal = String(formData.get("goal") ?? "maintain"); // lose | maintain | gain

  const bmr =
    sex === "m"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;
  let tdee = bmr * activity;
  if (goal === "lose") tdee -= 400;
  if (goal === "gain") tdee += 300;
  tdee = Math.round(tdee / 10) * 10;

  // Makro: białko 2 g/kg, tłuszcz 1 g/kg, reszta z węglowodanów.
  const protein = Math.round(weight * 2);
  const fat = Math.round(weight);
  const carbs = Math.max(30, Math.round((tdee - protein * 4 - fat * 9) / 4));

  for (const { n } of WEEKDAYS) {
    await db
      .insert(dietGoals)
      .values({ userId: user.id, weekday: n, protein, fat, carbs, kcalGoal: tdee })
      .onConflictDoUpdate({
        target: [dietGoals.userId, dietGoals.weekday],
        set: { protein, fat, carbs, kcalGoal: tdee, updatedAt: new Date() },
      });
  }
  revalidatePath("/micha");
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

/** Eksport danych użytkownika jako JSON (do pobrania). */
export async function exportDataAction(): Promise<string> {
  const user = await requireUser();
  const [measurements, meals, goals, products, water, workoutsRows] = await Promise.all([
    db.select().from(bodyMeasurements).where(eq(bodyMeasurements.userId, user.id)),
    db.select().from(dietLogs).where(eq(dietLogs.userId, user.id)),
    db.select().from(dietGoals).where(eq(dietGoals.userId, user.id)),
    db.select().from(foodProducts).where(eq(foodProducts.userId, user.id)),
    db.select().from(waterLogs).where(eq(waterLogs.userId, user.id)),
    db.select().from(workouts).where(eq(workouts.userId, user.id)),
  ]);
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    user: { name: user.name, email: user.email },
    measurements,
    dietLogs: meals,
    dietGoals: goals,
    customProducts: products,
    waterLogs: water,
    workouts: workoutsRows,
  };
  return JSON.stringify(payload, null, 2);
}

/** Import danych z JSON (nadpisuje dane użytkownika w zakresie diet/ciało). */
export async function importDataAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const raw = String(formData.get("data") ?? "").trim();
  if (!raw) redirect("/settings");
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    redirect("/settings?error=1");
  }

  if (Array.isArray(parsed.measurements)) {
    await db.delete(bodyMeasurements).where(eq(bodyMeasurements.userId, user.id));
    for (const m of parsed.measurements) {
      await db.insert(bodyMeasurements).values({
        userId: user.id,
        weightKg: m.weightKg ?? null,
        heightCm: m.heightCm ?? null,
        chestCm: m.chestCm ?? null,
        waistCm: m.waistCm ?? null,
        hipCm: m.hipCm ?? null,
        thighCm: m.thighCm ?? null,
        bicepsCm: m.bicepsCm ?? null,
        calfCm: m.calfCm ?? null,
        date: m.date ? new Date(m.date) : new Date(),
      });
    }
  }
  if (Array.isArray(parsed.dietLogs)) {
    await db.delete(dietLogs).where(eq(dietLogs.userId, user.id));
    for (const l of parsed.dietLogs) {
      await db.insert(dietLogs).values({
        userId: user.id,
        date: l.date ? new Date(l.date) : new Date(),
        protein: l.protein ?? 0,
        fat: l.fat ?? 0,
        carbs: l.carbs ?? 0,
        kcal: l.kcal ?? kcalFromMacros(l.protein ?? 0, l.fat ?? 0, l.carbs ?? 0),
        mealNumber: l.mealNumber ?? null,
        note: l.note ?? null,
      });
    }
  }
  if (Array.isArray(parsed.dietGoals)) {
    for (const g of parsed.dietGoals) {
      if (!g.weekday) continue;
      await db
        .insert(dietGoals)
        .values({
          userId: user.id,
          weekday: g.weekday,
          protein: g.protein ?? 0,
          fat: g.fat ?? 0,
          carbs: g.carbs ?? 0,
          kcalGoal: g.kcalGoal ?? 0,
          trainingDay: g.trainingDay ?? 0,
          meals: g.meals ?? 3,
          mealNames: g.mealNames ?? null,
        })
        .onConflictDoUpdate({
          target: [dietGoals.userId, dietGoals.weekday],
          set: { protein: g.protein ?? 0, fat: g.fat ?? 0, carbs: g.carbs ?? 0, kcalGoal: g.kcalGoal ?? 0, trainingDay: g.trainingDay ?? 0, meals: g.meals ?? 3, mealNames: g.mealNames ?? null },
        });
    }
  }
  if (Array.isArray(parsed.waterLogs)) {
    await db.delete(waterLogs).where(eq(waterLogs.userId, user.id));
    for (const w of parsed.waterLogs) {
      await db.insert(waterLogs).values({
        userId: user.id,
        date: w.date ? new Date(w.date) : new Date(),
        liters: w.liters ?? 0,
      });
    }
  }
  revalidatePath("/settings");
  revalidatePath("/micha");
  revalidatePath("/body");
  redirect("/settings?saved=1");
}
