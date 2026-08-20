"use server";

import { db } from "@/db";
import { bodyMeasurements, fitnessLogs, integrations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Brak konfiguracji GOOGLE_FIT_CLIENT_*");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Nie udało się odświeżyć tokenu Google");
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Brak access_token");
  return data.access_token;
}

/** Zsynchronizuj ostatnie 7 dni z Google Fit (kroki + waga). */
export async function syncGoogleFitAction(): Promise<void> {
  const user = await requireUser();
  const [integration] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.userId, user.id), eq(integrations.provider, "google_fit")))
    .limit(1);
  if (!integration?.accessToken) redirect("/settings?fit_error=2");

  let access = integration.accessToken;
  if (integration.refreshToken) {
    try {
      access = await refreshGoogleToken(integration.refreshToken);
      await db
        .update(integrations)
        .set({ accessToken: access })
        .where(eq(integrations.id, integration.id));
    } catch {
      redirect("/settings?fit_error=3");
    }
  }

  const now = Date.now();
  const start = now - 7 * 86400000;
  const aggregate = async (dataTypeName: string, dataSourceId: string) => {
    const res = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
      method: "POST",
      headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        aggregateBy: [{ dataTypeName, dataSourceId }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: start,
        endTimeMillis: now,
      }),
    });
    if (!res.ok) throw new Error("Google Fit odmówił dostępu (" + res.status + ").");
    return (await res.json()) as { bucket?: Array<{ startTimeMillis?: string; dataset?: Array<{ point?: Array<{ value?: Array<{ intVal?: number; fpVal?: number }> }> }> }> };
  };

  try {
    const stepsData = await aggregate(
      "com.google.step_count.delta",
      "derived:com.google.step_count.delta:com.google.android.gms:merge_step_deltas",
    );
    let totalSteps = 0;
    for (const bucket of stepsData.bucket ?? []) {
      const dayStart = new Date(Number(bucket.startTimeMillis)).setHours(12, 0, 0, 0);
      const steps = (bucket.dataset?.[0]?.point ?? []).reduce(
        (s, p) => s + (p.value?.[0]?.intVal ?? p.value?.[0]?.fpVal ?? 0),
        0,
      );
      totalSteps += steps;
      const date = new Date(dayStart);
      await db
        .insert(fitnessLogs)
        .values({ userId: user.id, date, steps: Math.round(steps) })
        .onConflictDoUpdate({ target: [fitnessLogs.userId, fitnessLogs.date], set: { steps: Math.round(steps) } });
    }

    // Waga — ostatni punkt
    let weightKg: number | null = null;
    try {
      const weightData = await aggregate(
        "com.google.weight",
        "derived:com.google.weight:com.google.android.gms:merge_weight",
      );
      const all = (weightData.bucket ?? []).flatMap((b) => b.dataset?.[0]?.point ?? []);
      const latest = all[all.length - 1];
      weightKg = latest?.value?.[0]?.fpVal ?? null;
    } catch {
      weightKg = null; // brak zgody na dane o wadze — nie przerywaj
    }

    if (weightKg && weightKg > 20 && weightKg < 300) {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const tomorrow = new Date(todayStart.getTime() + 86400000);
      const existing = await db
        .select({ id: bodyMeasurements.id })
        .from(bodyMeasurements)
        .where(and(eq(bodyMeasurements.userId, user.id), eq(bodyMeasurements.date, todayStart)))
        .limit(1);
      if (!existing.length) {
        await db.insert(bodyMeasurements).values({
          userId: user.id,
          weightKg: Math.round(weightKg * 10) / 10,
          date: todayStart,
        });
      }
    }

    revalidatePath("/settings");
    redirect(`/settings?saved=1`);
  } catch (e) {
    redirect(`/settings?fit_error=3`);
  }
}

export async function disconnectGoogleFitAction(): Promise<void> {
  const user = await requireUser();
  await db
    .delete(integrations)
    .where(and(eq(integrations.userId, user.id), eq(integrations.provider, "google_fit")));
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}
