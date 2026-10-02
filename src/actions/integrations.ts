"use server";

import { db } from "@/db";
import { bodyMeasurements, fitnessLogs, integrations, sleepLogs } from "@/db/schema";
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

/**
 * Synchronizuje dane o śnie z Google Fit (com.google.sleep.segment).
 * Wymaga zakresu fitness.sleep.read — jeśli go brak (403), zwraca null
 * i nie blokuje reszty synchronizacji (kroki/waga).
 * Fazy snu: 0 = czuwanie, 1 = sen ogólny, 2 = płytki, 3 = głęboki, 4 = REM, 5 = poza łóżkiem.
 */
async function syncSleepForUser(
  userId: number,
  access: string,
  start: number,
  end: number,
): Promise<{ nights: number; error?: string } | null> {
  // UWAGA: dane snu (zwłaszcza z opasek Xiaomi) NIE są zwracane przez endpoint
  // dataset:aggregate — trzeba czytać surowy dataset dataSourceId/datasets.
  const startNs = (BigInt(Math.floor(start - 24 * 3600000)) * BigInt(1000000)).toString();
  const endNs = (BigInt(Math.floor(end + 24 * 3600000)) * BigInt(1000000)).toString();
  // Nie każdy telefon tworzy źródło `merged`; wykryj faktyczne źródła snu,
  // aby synchronizacja nie kończyła się pustym wynikiem.
  const sourcesRes = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataSources?dataTypeName=com.google.sleep.segment", { headers: { Authorization: `Bearer ${access}` } });
  if (sourcesRes.status === 403) return null;
  if (!sourcesRes.ok) return { nights: 0, error: "Nie udało się pobrać źródeł snu z Google Fit." };
  const sources = (await sourcesRes.json()) as { dataSource?: Array<{ dataStreamId?: string }> };
  const discoveredIds = (sources.dataSource ?? []).map((s) => s.dataStreamId).filter((id): id is string => !!id);
  if (!discoveredIds.length) return { nights: 0, error: "Google Fit nie udostępnił źródła danych snu." };
  // Google Fit często zwraca jednocześnie źródło raw i jego agregat. Sumowanie
  // obu zawyża sen (np. 8 h staje się kilkanaście godzin). Preferuj agregat,
  // a gdy go nie ma, użyj jednego najbardziej kompletnego źródła.
  const merged = discoveredIds.filter((id) => /:merged$/.test(id));
  const sourceIds = merged.length ? merged : [discoveredIds[0]];
  const allPoints: Array<{ startTimeNanos?: string; endTimeNanos?: string; value?: Array<{ intVal?: number; fpVal?: number }> }> = [];
  for (const dsId of sourceIds) {
    const url = `https://www.googleapis.com/fitness/v1/users/me/dataSources/${encodeURIComponent(dsId)}/datasets/${startNs}-${endNs}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${access}` } });
    if (res.status === 403) return null;
    if (!res.ok) continue;
    const data = (await res.json()) as { point?: typeof allPoints };
    allPoints.push(...(data.point ?? []));
  }
  const data = { point: allPoints };
  if (!allPoints.length) return { nights: 0 };
  const points = (data.point ?? []).filter(
    (p) => p.startTimeNanos && p.endTimeNanos,
  );

  const windowStart = start - 24 * 3600000;
  const windowEnd = end + 24 * 3600000;
  await db
    .delete(sleepLogs)
    .where(
      and(
        eq(sleepLogs.userId, userId),
        gte(sleepLogs.date, new Date(windowStart)),
        lte(sleepLogs.date, new Date(windowEnd)),
      ),
    );

  // Fazy Xiaomi (Mi Fitness / Zepp): 1=czuwanie, 4=REM, 5=płytki, 6=głęboki.
  // Standard Google: 0=czuwanie, 1=sen ogólny, 2=płytki, 3=głęboki, 4=REM, 5=poza łóżkiem.
  // Wykrywamy tryb Xiaomi (faza 6 występuje tylko tam) i mapujemy odpowiednio.
  const stages = new Set(points.map((p) => Number(p.value?.[0]?.intVal ?? 0)));
  const isXiaomi = stages.has(6);
  const toStage = (s: number): "deep" | "light" | "rem" | "awake" | "asleep" | null => {
    if (isXiaomi) {
      if (s === 1) return "awake";
      if (s === 4) return "rem";
      if (s === 5) return "light";
      if (s === 6) return "deep";
      if (s === 0) return "awake";
      return null;
    }
    if (s === 0) return "awake";
    if (s === 1) return "asleep";
    if (s === 2) return "light";
    if (s === 3) return "deep";
    if (s === 4) return "rem";
    return null; // 5 = poza łóżkiem — pomijamy
  };

  // Grupuj punkty w „noce": nowa noc, gdy przerwa > 6 h lub przejście po 12:00.
  const sorted = [...points].sort((a, b) => Number(a.startTimeNanos) - Number(b.startTimeNanos));
  const nightsAgg: Array<{
    start: number;
    end: number;
    deep: number; light: number; rem: number; awake: number; asleep: number;
  }> = [];
  for (const p of sorted) {
    const startMs = Number(p.startTimeNanos) / 1e6;
    const endMs = Number(p.endTimeNanos) / 1e6;
    const mins = Math.max(0, (endMs - startMs) / 60000);
    const kind = toStage(Number(p.value?.[0]?.intVal ?? 0));
    const cur = nightsAgg[nightsAgg.length - 1];
    if (!cur || startMs - cur.end > 6 * 3600000) {
      nightsAgg.push({ start: startMs, end: endMs, deep: 0, light: 0, rem: 0, awake: 0, asleep: 0 });
    }
    const target = nightsAgg[nightsAgg.length - 1];
    target.start = Math.min(target.start, startMs);
    target.end = Math.max(target.end, endMs);
    if (kind && target) target[kind] += mins;
  }

  let nights = 0;
  for (const n of nightsAgg) {
    const total = n.deep + n.light + n.rem + n.asleep;
    if (total <= 0) continue;
    // Data nocy = lokalne południe dnia, w którym sen się ZACZĄŁ (poprzedni wieczór).
    const localStart = new Date(n.start);
    const date = new Date(localStart.getFullYear(), localStart.getMonth(), localStart.getDate(), 12, 0, 0);
    await db
      .insert(sleepLogs)
      .values({
        userId,
        date,
        totalMinutes: Math.round(total),
        deepMinutes: Math.round(n.deep),
        lightMinutes: Math.round(n.light),
        remMinutes: Math.round(n.rem),
        awakeMinutes: Math.round(n.awake),
        asleepMinutes: Math.round(n.asleep),
        startAt: new Date(n.start),
        endAt: new Date(n.end),
        source: "google_fit",
      })
      .onConflictDoUpdate({
        target: [sleepLogs.userId, sleepLogs.date],
        set: {
          totalMinutes: Math.round(total),
          deepMinutes: Math.round(n.deep),
          lightMinutes: Math.round(n.light),
          remMinutes: Math.round(n.rem),
          awakeMinutes: Math.round(n.awake),
          asleepMinutes: Math.round(n.asleep),
          startAt: new Date(n.start),
          endAt: new Date(n.end),
          source: "google_fit",
        },
      });
    nights++;
  }
  return { nights };
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
    // ============ KROKI: DOKŁADNIE to, co pokazuje Google Fit ============
    // Bez estymacji i bez łączenia źródeł (opaska/telefon). Używamy tej samej
    // liczby, którą wyświetla aplikacja Google Fit: `estimated_steps` (pojedyncza
    // najlepsza estymata Google). Zapas: `merge_step_deltas` tylko gdy estymata
    // to 0 (brak danych dla danego dnia).
    const stepsRes = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
      method: "POST",
      headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        // Bez wymuszania konkretnego dataSourceId Google Fit sam wybiera
        // deduplikowany strumień kroków, tak jak aplikacja Google Fit.
        aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: start,
        endTimeMillis: end,
      }),
    });
    if (!stepsRes.ok) throw new Error("Google Fit odmówił dostępu (" + stepsRes.status + ").");
    const stepsData = (await stepsRes.json()) as { bucket?: Array<{ startTimeMillis?: string; dataset?: Array<{ point?: Array<{ value?: Array<{ intVal?: number; fpVal?: number }> }> }> }> };

    const sumPoints = (ds?: { point?: Array<{ value?: Array<{ intVal?: number; fpVal?: number }> }> }) =>
      (ds?.point ?? []).reduce((s, p) => s + (p.value?.[0]?.intVal ?? p.value?.[0]?.fpVal ?? 0), 0);
    const dsAt = (dss: NonNullable<typeof stepsData.bucket>[number]["dataset"]) =>
      (dss ?? []).reduce((total, dataset) => total + sumPoints(dataset), 0);

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
    const buckets = stepsData.bucket ?? [];
    let totalSteps = 0;
    let weekSteps = 0;
    let daysWithSteps = 0;
    for (let bi = 0; bi < buckets.length; bi++) {
      const bucket = buckets[bi];
      const dss = bucket.dataset ?? [];
      const steps = dsAt(dss);

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
    const sourceLabel = "Google Fit (dokładna liczba z aplikacji)";
    const summarySteps = weekSteps > 0 ? weekSteps : totalSteps;

    // ---------- Sen (wymaga zakresu fitness.sleep.read) ----------
    let sleepNote = "";
    try {
      const sleepResult = await syncSleepForUser(userId, access, start, end);
      if (sleepResult?.error) {
        sleepNote = ` Sen: ${sleepResult.error}`;
      } else if (sleepResult) {
        sleepNote = ` Sen: ${sleepResult.nights} nocy.`;
      } else {
        sleepNote =
          " Sen: brak uprawnień — rozłącz i połącz Google Fit ponownie (Ustawienia → Integracje).";
      }
    } catch {
      sleepNote = " Sen: nie udało się pobrać (spróbuj ponownie).";
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
    return {
      summary: `Zapisano: ${summarySteps.toLocaleString("pl-PL")} kroków (7 dni, źródło: ${sourceLabel}).${sleepNote}${weightKg ? ` Waga: ${weightKg.toFixed(1)} kg.` : ""}`,
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
