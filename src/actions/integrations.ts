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
    // ============ KROKI: priorytet Mi Fitness (opaska), fallback Google Fit ============
    // Aplikacje Xiaomi (Mi Fitness / Mi Fit / Zepp) zapisują kroki do Google Fit
    // pod własnymi źródłami RAW, np. `com.xiaomi.wearable:health_platform`.
    // Wykrywamy je dynamicznie (lista źródeł), pytamy o nie OSOBNO od estymaty
    // Google i dla każdego dnia wybieramy: Mi Fitness, a gdy opaska nie
    // zsynchronizowała się danego dnia (wartość 0) → estymata Google Fit.
    // NIGDY nie sumujemy obu źródeł tego samego dnia.
    const XIAOMI_PACKAGES = [
      "com.xiaomi.wearable", // Mi Fitness (nowa aplikacja)
      "com.xiaomi.hm.health", // Mi Fit / Zepp Life (starsza)
      "com.huami.watch.hmwatchmanager", // Amazfit / Zepp
    ];
    let xiaomiIds: string[] = [];
    try {
      const res = await fetch(
        "https://www.googleapis.com/fitness/v1/users/me/dataSources?dataTypeName=com.google.step_count.delta",
        { headers: { Authorization: `Bearer ${access}` } },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          dataSource?: Array<{ type?: string; dataStreamId?: string; application?: { packageName?: string } }>;
        };
        const raw = data.dataSource ?? [];
        xiaomiIds = XIAOMI_PACKAGES.flatMap((pkg) =>
          raw.filter((s) => s.type === "raw" && s.application?.packageName === pkg)
            .map((s) => s.dataStreamId ?? ""),
        ).filter(Boolean);
      }
    } catch {
      xiaomiIds = []; // wykrywanie opcjonalne — bez niego działa fallback do Google Fit
    }

    // Kolejność w aggregateBy odpowiada indeksom datasetów w odpowiedzi:
    // [0] = estimated_steps (estymata Google), [1] = merge_step_deltas (zapas),
    // [2..] = źródła Xiaomi.
    const stepIds = [
      "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps",
      "derived:com.google.step_count.delta:com.google.android.gms:merge_step_deltas",
      ...xiaomiIds,
    ];
    const stepsRes = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
      method: "POST",
      headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        aggregateBy: stepIds.map((dataSourceId) => ({ dataTypeName: "com.google.step_count.delta", dataSourceId })),
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: start,
        endTimeMillis: end,
      }),
    });
    if (!stepsRes.ok) throw new Error("Google Fit odmówił dostępu (" + stepsRes.status + ").");
    const stepsData = (await stepsRes.json()) as { bucket?: Array<{ startTimeMillis?: string; dataset?: Array<{ point?: Array<{ value?: Array<{ intVal?: number; fpVal?: number }> }> }> }> };

    const sumPoints = (ds?: { point?: Array<{ value?: Array<{ intVal?: number; fpVal?: number }> }> }) =>
      (ds?.point ?? []).reduce((s, p) => s + (p.value?.[0]?.intVal ?? p.value?.[0]?.fpVal ?? 0), 0);
    const dsAt = (dss: NonNullable<typeof stepsData.bucket>[number]["dataset"], i: number) =>
      dss && dss[i] ? sumPoints(dss[i]) : 0;

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

    // Próg „ostatnie 7 dni” — do podsumowania w komunikacie.
    const weekStart = localMidnightToday.getTime() - tzOffsetMin * 60000 - 6 * 86400000;
    let totalSteps = 0;
    let weekSteps = 0;
    let miFitDays = 0;
    let daysWithSteps = 0;
    for (const bucket of stepsData.bucket ?? []) {
      const dss = bucket.dataset ?? [];
      const googleEst = dsAt(dss, 0); // estimated_steps
      const googleMerge = dsAt(dss, 1); // merge_step_deltas (zapas)
      // Mi Fitness: max po źródłach Xiaomi — NIE suma (kilka aplikacji Xiaomi = ta sama opaska).
      const xiaomi = xiaomiIds.length ? Math.max(...stepIds.slice(2).map((_, i) => dsAt(dss, 2 + i))) : 0;

      // Priorytet dnia: Mi Fitness > estymata Google > merge (zapas).
      const steps = xiaomi > 0 ? xiaomi : googleEst > 0 ? googleEst : googleMerge;

      if (xiaomi > 0) miFitDays++;
      if (steps > 0) daysWithSteps++;
      totalSteps += steps;
      const bStart = Number(bucket.startTimeMillis);
      if (bStart >= weekStart) weekSteps += steps;

      // bucket.startTimeMillis = początek lokalnego dnia; data = lokalne południe (start + 12 h).
      const date = new Date(bStart + 12 * 3600000);
      await db
        .insert(fitnessLogs)
        .values({ userId, date, steps: Math.round(steps) })
        .onConflictDoUpdate({ target: [fitnessLogs.userId, fitnessLogs.date], set: { steps: Math.round(steps) } });
    }
    const sourceLabel =
      miFitDays > 0
        ? `Mi Fitness${daysWithSteps > miFitDays ? " (dni bez sync opaski: Google Fit)" : ""}`
        : "Google Fit (brak danych Mi Fitness)";
    const summarySteps = weekSteps > 0 ? weekSteps : totalSteps;

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
    return {
      summary: `Zapisano: ${summarySteps.toLocaleString("pl-PL")} kroków (7 dni, źródło: ${sourceLabel})${weightKg ? `, waga ${weightKg.toFixed(1)} kg` : ""}.`,
    };
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
