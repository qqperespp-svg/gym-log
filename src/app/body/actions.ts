"use server";

import { revalidatePath } from "next/cache";
import { eq, desc, asc } from "drizzle-orm";
import { db } from "@/db";
import { bodyMeasurements } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function addBodyMeasurement(data: {
  weightKg?: string;
  heightCm?: string;
  chestCm?: string;
  waistCm?: string;
  hipCm?: string;
  thighCm?: string;
  bicepsCm?: string;
  calfCm?: string;
  date?: string;
}) {
  const user = await requireUser();
  await db.insert(bodyMeasurements).values({
    userId: user.id,
    weightKg: data.weightKg ? parseFloat(data.weightKg) : undefined,
    heightCm: data.heightCm ? parseFloat(data.heightCm) : undefined,
    chestCm: data.chestCm ? parseFloat(data.chestCm) : undefined,
    waistCm: data.waistCm ? parseFloat(data.waistCm) : undefined,
    hipCm: data.hipCm ? parseFloat(data.hipCm) : undefined,
    thighCm: data.thighCm ? parseFloat(data.thighCm) : undefined,
    bicepsCm: data.bicepsCm ? parseFloat(data.bicepsCm) : undefined,
    calfCm: data.calfCm ? parseFloat(data.calfCm) : undefined,
    date: data.date ? new Date(data.date) : new Date(),
  } as any);
  revalidatePath("/body");
  revalidatePath("/dashboard");
}

export async function getBodyMeasurements() {
  const user = await requireUser();
  return db.select().from(bodyMeasurements)
    .where(eq(bodyMeasurements.userId, user.id))
    .orderBy(desc(bodyMeasurements.date));
}

export async function deleteBodyMeasurement(id: number) {
  const user = await requireUser();
  await db.delete(bodyMeasurements)
    .where(eq(bodyMeasurements.id, id));
  revalidatePath("/body");
  revalidatePath("/dashboard");
}

export async function getBodyProgress() {
  const user = await requireUser();
  const all = await db.select().from(bodyMeasurements)
    .where(eq(bodyMeasurements.userId, user.id))
    .orderBy(asc(bodyMeasurements.date));
  
  if (all.length < 2) return null;
  
  const first = all[0];
  const latest = all[all.length - 1];
  
  return {
    first: {
      date: first.date,
      weightKg: first.weightKg,
      chestCm: first.chestCm,
      waistCm: first.waistCm,
      hipCm: first.hipCm,
      thighCm: first.thighCm,
      bicepsCm: first.bicepsCm,
      calfCm: first.calfCm,
    },
    latest: {
      date: latest.date,
      weightKg: latest.weightKg,
      chestCm: latest.chestCm,
      waistCm: latest.waistCm,
      hipCm: latest.hipCm,
      thighCm: latest.thighCm,
      bicepsCm: latest.bicepsCm,
      calfCm: latest.calfCm,
    },
    changes: {
      weightKg: latest.weightKg && first.weightKg ? (parseFloat(latest.weightKg) - parseFloat(first.weightKg)).toFixed(1) : null,
      chestCm: latest.chestCm && first.chestCm ? (parseFloat(latest.chestCm) - parseFloat(first.chestCm)).toFixed(1) : null,
      waistCm: latest.waistCm && first.waistCm ? (parseFloat(latest.waistCm) - parseFloat(first.waistCm)).toFixed(1) : null,
      hipCm: latest.hipCm && first.hipCm ? (parseFloat(latest.hipCm) - parseFloat(first.hipCm)).toFixed(1) : null,
      thighCm: latest.thighCm && first.thighCm ? (parseFloat(latest.thighCm) - parseFloat(first.thighCm)).toFixed(1) : null,
      bicepsCm: latest.bicepsCm && first.bicepsCm ? (parseFloat(latest.bicepsCm) - parseFloat(first.bicepsCm)).toFixed(1) : null,
      calfCm: latest.calfCm && first.calfCm ? (parseFloat(latest.calfCm) - parseFloat(first.calfCm)).toFixed(1) : null,
    },
  };
}
