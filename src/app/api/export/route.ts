import { db } from "@/db";
import { bodyMeasurements, dietGoals, dietLogs, foodProducts, progressPhotos, waterLogs, workouts } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Pobranie pełnej kopii zapasowej danych użytkownika w formacie JSON. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const [measurements, meals, goals, products, water, photos, workoutsRows] = await Promise.all([
    db.select().from(bodyMeasurements).where(eq(bodyMeasurements.userId, user.id)),
    db.select().from(dietLogs).where(eq(dietLogs.userId, user.id)),
    db.select().from(dietGoals).where(eq(dietGoals.userId, user.id)),
    db.select().from(foodProducts).where(eq(foodProducts.userId, user.id)),
    db.select().from(waterLogs).where(eq(waterLogs.userId, user.id)),
    db.select().from(progressPhotos).where(eq(progressPhotos.userId, user.id)),
    db.select().from(workouts).where(eq(workouts.userId, user.id)),
  ]);
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    user: { name: user.name, email: user.email },
    measurements,
    dietLogs: meals,
    dietGoals: goals,
    customProducts: products,
    waterLogs: water,
    progressPhotos: photos,
    workouts: workoutsRows,
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="gymrat-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
