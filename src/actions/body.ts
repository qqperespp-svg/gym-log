"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { bodyMeasurements } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function updateBodyAction(id: number, formData: FormData) {
  const user = await requireUser();
  const [owned] = await db.select({ id: bodyMeasurements.id }).from(bodyMeasurements).where(and(eq(bodyMeasurements.id, id), eq(bodyMeasurements.userId, user.id))).limit(1);
  if (!owned) return { error: "Nie znaleziono wpisu." };
  const date = String(formData.get("date") || new Date().toISOString().slice(0, 10));
  const weight = formData.get("weight") ? Number(formData.get("weight")) : null;
  const height = formData.get("height") ? Number(formData.get("height")) : null;
  const chest = formData.get("chest") ? Number(formData.get("chest")) : null;
  const waist = formData.get("waist") ? Number(formData.get("waist")) : null;
  const hip = formData.get("hip") ? Number(formData.get("hip")) : null;
  const thigh = formData.get("thigh") ? Number(formData.get("thigh")) : null;
  const biceps = formData.get("biceps") ? Number(formData.get("biceps")) : null;
  const calf = formData.get("calf") ? Number(formData.get("calf")) : null;
  await db.update(bodyMeasurements).set({ weightKg: weight, heightCm: height, chestCm: chest, waistCm: waist, hipCm: hip, thighCm: thigh, bicepsCm: biceps, calfCm: calf, date: new Date(date) }).where(eq(bodyMeasurements.id, id));
  redirect("/body?saved=1");
}

export async function saveBodyAction(formData: FormData) {
  const user = await requireUser();
  const date = String(formData.get("date") || new Date().toISOString().slice(0, 10));
  const weight = formData.get("weight") ? Number(formData.get("weight")) : null;
  const height = formData.get("height") ? Number(formData.get("height")) : null;
  const chest = formData.get("chest") ? Number(formData.get("chest")) : null;
  const waist = formData.get("waist") ? Number(formData.get("waist")) : null;
  const hip = formData.get("hip") ? Number(formData.get("hip")) : null;
  const thigh = formData.get("thigh") ? Number(formData.get("thigh")) : null;
  const biceps = formData.get("biceps") ? Number(formData.get("biceps")) : null;
  const calf = formData.get("calf") ? Number(formData.get("calf")) : null;
  await db.insert(bodyMeasurements).values({ userId: user.id, weightKg: weight, heightCm: height, chestCm: chest, waistCm: waist, hipCm: hip, thighCm: thigh, bicepsCm: biceps, calfCm: calf, date: new Date(date) });
}

export async function deleteBodyAction(id: number) {
  const user = await requireUser();
  await db.delete(bodyMeasurements).where(and(eq(bodyMeasurements.id, id), eq(bodyMeasurements.userId, user.id)));
  redirect("/body");
}
