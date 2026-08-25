import { db } from "@/db";
import { dietLogs, waterLogs } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Synchronizacja kolejki offline: przyjmuje JSON z wpisami spożycia i wody. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let body: { entries?: any[]; water?: any[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  let count = 0;
  for (const e of body.entries ?? []) {
    await db.insert(dietLogs).values({
      userId: user.id,
      date: e.date ? new Date(e.date) : new Date(),
      grams: Number.isFinite(Number(e.grams)) && Number(e.grams) >= 0 ? Number(e.grams) : null,
      protein: Number(e.protein) || 0,
      fat: Number(e.fat) || 0,
      carbs: Number(e.carbs) || 0,
      kcal: Number(e.kcal) || 0,
      mealNumber: e.mealNumber ? Number(e.mealNumber) : null,
      note: e.note ? String(e.note) : null,
    });
    count++;
  }
  for (const w of body.water ?? []) {
    await db.insert(waterLogs).values({
      userId: user.id,
      date: w.date ? new Date(w.date) : new Date(),
      liters: Number(w.liters) || 0,
    });
    count++;
  }
  return Response.json({ ok: true, synced: count });
}
