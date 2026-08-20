"use server";

import { db } from "@/db";
import { bodyMeasurements, fitnessLogs, integrations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq, gte, lte } from "drizzle-orm";
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

/** Wspólna logika synchronizacji Google Fit — zwraca wynik bez redirectu. */
async function performGoogleFitSync(userId: number, tzOffsetMin = 0): Promise<{ error?: string; summary?: string }> {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, "google_fit")))
    .limit(1);
  if (!integration?.accessToken) return { error: "Najpierw połącz Google Fit (Ustawienia → Integracje)." };

  let access = integration.accessToken;
  if (integration.refreshToken) {
    try {
      access = await refreshGoogleToken(integration.refreshToken);
      await db
        .update(integrations)
        .set({ accessToken: access })
        .where(eq(integrations.id, integration.id));
    } catch {
      return { error: "Nie udało się odświeżyć tokenu Google — połącz Google Fit ponownie." };
    }
  }

  const now = Date.now();
  // Lokalna północ dzisiaj (w strefie użytkownika) — buckety od niej po 24 h = lokalne dni.
  const localMidnightToday = new Date();
  localMidnightToday.setHours(0, 0, 0, 0);
  // Okno 31 dni: pokrywa 7 dni widocznych na dashboardzie + czyści starsze duplikaty
  // (wiersze zapisane wcześniej z błędną konwencją dat UTC).
  const start = localMidnightToday.getTime() - tzOffsetMin * 60000 - 30 * 86400000;
  const end = now;
  const aggregate = async (dataTypeName: string, dataSourceId: string) => {
    const res = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
      method: "POST",
      headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        aggregateBy: [{ dataTypeName, dataSourceId }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: start,
        endTimeMillis: end,
      }),
    });
    if (!res.ok) throw new Error("Google Fit odmówił dostępu (" + res.status + ").");
    return (await res.json()) as { bucket?: Array<{ startTimeMillis?: string; dataset?: Array<{ point?: Array<{ value?: Array<{ intVal?: number; fpVal?: number }> }> }> }> };
  };

  try {
    // Wybierz źródło kroków = ta sama liczba, którą pokazuje Google Fit.
    // `merge_step_deltas` SUmuje kroki ze wszystkich urządzeń (np. Google Health
    // + Mi Fitness), co zawyża wynik ~2x; `estimated_steps` to pojedyncza
    // najlepsza estymata Google — zgodna z aplikacją Google Fit.
    const stepSources = [
      "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps",
      "derived:com.google.step_count.delta:com.google.android.gms:merge_step_deltas",
    ];
    let stepsData: Awaited<ReturnType<typeof aggregate>> | null = null;
    for (const ds of stepSources) {
      const data = await aggregate("com.google.step_count.delta", ds);
      const sum = (data.bucket ?? []).reduce(
        (s, b) => s + (b.dataset?.[0]?.point ?? []).reduce((x, p) => x + (p.value?.[0]?.intVal ?? p.value?.[0]?.fpVal ?? 0), 0),
        0,
      );
      if (sum > 0) { stepsData = data; break; }
    }
    if (!stepsData) stepsData = await aggregate("com.google.step_count.delta", stepSources[1]);

    // Ważne: usuń stare wiersze w oknie synchronizacji, zanim zapiszemy nowe.
    // Wcześniej te same dni bywały zapisywane pod dwoma różnymi timestampami
    // (sync z Ustawień: południe UTC, sync z dashboardu: lokalne południe),
    // przez co kafelek sumował oba wiersze i pokazywał ~2x więcej kroków.
    const windowStart = start - 24 * 3600000;
    const windowEnd = end + 24 * 3600000;
    await db
      .delete(fitnessLogs)
      .where(
        and(
          eq(fitnessLogs.userId, userId),
          gte(fitnessLogs.date, new Date(windowStart)),
          lte(fitnessLogs.date, new Date(windowEnd)),
        ),
      );

    let totalSteps = 0;
    for (const bucket of stepsData.bucket ?? []) {
      // bucket.startTimeMillis = początek lokalnego dnia; data = lokalne południe (start + 12 h).
      const date = new Date(Number(bucket.startTimeMillis) + 12 * 3600000);
      const steps = (bucket.dataset?.[0]?.point ?? []).reduce(
        (s, p) => s + (p.value?.[0]?.intVal ?? p.value?.[0]?.fpVal ?? 0),
        0,
      );
      totalSteps += steps;
      await db
        .insert(fitnessLogs)
        .values({ userId, date, steps: Math.round(steps) })
        .onConflictDoUpdate({ target: [fitnessLogs.userId, fitnessLogs.date], set: { steps: Math.round(steps) } });
    }

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
      weightKg = null;
    }

    if (weightKg && weightKg > 20 && weightKg < 300) {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const tomorrow = new Date(todayStart.getTime() + 86400000);
      const existing = await db
        .select({ id: bodyMeasurements.id })
        .from(bodyMeasurements)
        .where(and(eq(bodyMeasurements.userId, userId), eq(bodyMeasurements.date, todayStart)))
        .limit(1);
      if (!existing.length) {
        await db.insert(bodyMeasurements).values({
          userId,
          weightKg: Math.round(weightKg * 10) / 10,
          date: todayStart,
        });
      }
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { summary: `Zapisano: ${totalSteps.toLocaleString("pl-PL")} kroków (7 dni)${weightKg ? `, waga ${weightKg.toFixed(1)} kg` : ""}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Błąd synchronizacji Google Fit." };
  }
}

/** Akcja dla Ustawień (form) — po synchronizacji przekierowuje z komunikatem.
 *  `formData.tz` = przesunięcie strefy w minutach (jak z dashboardu), aby daty
 *  dni były spójne (lokalne południe) niezależnie od tego, skąd zsynchronizowano. */
export async function syncGoogleFitAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const tzOffsetMin = Number(formData.get("tz") ?? 0) || 0;
  const result = await performGoogleFitSync(user.id, tzOffsetMin);
  redirect(result.error ? "/settings?fit_error=3" : "/settings?saved=1");
}

/** Akcja dla dashboardu — zwraca wynik (bez redirectu), odświeża dane. */
export async function syncGoogleFitNowAction(tzOffsetMin = 0): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const result = await performGoogleFitSync(user.id, tzOffsetMin);
  if (result.error) return { ok: false, message: result.error };
  return { ok: true, message: result.summary ?? "Zsynchronizowano." };
}

export async function disconnectGoogleFitAction(): Promise<void> {
  const user = await requireUser();
  await db
    .delete(integrations)
    .where(and(eq(integrations.userId, user.id), eq(integrations.provider, "google_fit")));
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}
