"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function updateWeeklyGoalAction(_: { error?: string } | undefined, formData: FormData) {
  const user = await requireUser();
  const raw = String(formData.get("weeklyGoal") ?? "4").trim();
  const value = Math.max(1, Math.min(14, parseInt(raw, 10) || 4));
  await db.update(users).set({ weeklyGoal: value }).where(eq(users.id, user.id));
  redirect("/dashboard?saved=1");
}
