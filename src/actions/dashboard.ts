"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateWeeklyGoalAction(goal: number): Promise<number> {
  const user = await requireUser();
  const clean = Math.min(Math.max(Math.round(Number(goal) || 1), 1), 14);
  await db.update(users).set({ weeklyGoal: clean }).where(eq(users.id, user.id));
  revalidatePath("/dashboard");
  return clean;
}
