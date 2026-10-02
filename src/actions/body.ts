"use server";

import { db } from "@/db";
import { bodyMeasurements } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseValue(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Wszystkie pomiary ciała zapisujemy z dokładnością do 0,1 jednostki.
  return Math.round(n * 10) / 10;
}

export async function saveBodyAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dateStr = String(formData.get("date") ?? "");
  await db.insert(bodyMeasurements).values({
    userId: user.id,
    weightKg: parseValue(formData, "weight"),
    heightCm: parseValue(formData, "height"),
    chestCm: parseValue(formData, "chest"),
    waistCm: parseValue(formData, "waist"),
    hipCm: parseValue(formData, "hip"),
    thighCm: parseValue(formData, "thigh"),
    bicepsCm: parseValue(formData, "biceps"),
    calfCm: parseValue(formData, "calf"),
    date: dateStr ? new Date(`${dateStr}T10:00:00`) : new Date(),
  });
  revalidatePath("/body");
  redirect("/body?saved=1");
}

export async function updateBodyAction(id: number, formData: FormData): Promise<void> {
  const user = await requireUser();
  const dateStr = String(formData.get("date") ?? "");
  await db
    .update(bodyMeasurements)
    .set({
      weightKg: parseValue(formData, "weight"),
      heightCm: parseValue(formData, "height"),
      chestCm: parseValue(formData, "chest"),
      waistCm: parseValue(formData, "waist"),
      hipCm: parseValue(formData, "hip"),
      thighCm: parseValue(formData, "thigh"),
      bicepsCm: parseValue(formData, "biceps"),
      calfCm: parseValue(formData, "calf"),
      date: dateStr ? new Date(`${dateStr}T10:00:00`) : new Date(),
    })
    .where(and(eq(bodyMeasurements.id, id), eq(bodyMeasurements.userId, user.id)));
  revalidatePath("/body");
  redirect("/body?saved=1");
}

export async function deleteBodyAction(id: number): Promise<void> {
  const user = await requireUser();
  await db
    .delete(bodyMeasurements)
    .where(and(eq(bodyMeasurements.id, id), eq(bodyMeasurements.userId, user.id)));
  revalidatePath("/body");
  redirect("/body");
}
