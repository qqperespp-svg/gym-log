"use server";

import { db } from "@/db";
import { waterLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function litersOf(value: number): number {
  const n = Number.isFinite(value) ? value : 0;
  return Math.min(Math.max(Math.round(n * 10) / 10, 0), 20);
}

export async function logWaterAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dateStr = String(formData.get("date") ?? "").trim();
  const liters = litersOf(Number(formData.get("liters")) || 0);
  if (!dateStr || liters <= 0) redirect("/nawodnienie");
  await db.insert(waterLogs).values({
    userId: user.id,
    date: new Date(`${dateStr}T12:00:00`),
    liters,
  });
  revalidatePath("/nawodnienie");
  revalidatePath("/dashboard");
  redirect("/nawodnienie?saved=1");
}

export async function deleteWaterLogAction(id: number): Promise<void> {
  const user = await requireUser();
  await db.delete(waterLogs).where(and(eq(waterLogs.id, id), eq(waterLogs.userId, user.id)));
  revalidatePath("/nawodnienie");
  revalidatePath("/dashboard");
}
