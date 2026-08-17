import { asc, eq } from "drizzle-orm";
import { ExerciseLibrary } from "@/components/exercise-library";
import { db } from "@/db";
import { exerciseDefinitions } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export default async function ExercisesPage() {
  const user = await requireUser();
  const items = await db.select({ id: exerciseDefinitions.id, name: exerciseDefinitions.name, muscleGroup: exerciseDefinitions.muscleGroup, equipment: exerciseDefinitions.equipment, isCustom: exerciseDefinitions.isCustom }).from(exerciseDefinitions).where(eq(exerciseDefinitions.userId, user.id)).orderBy(asc(exerciseDefinitions.name));
  return <div className="space-y-7"><header><p className="eyebrow">Ponad 200 ruchów</p><h1 className="page-title">Biblioteka ćwiczeń</h1><p className="mt-2 text-sm text-slate-500">Przeszukuj katalog lub dodawaj własne ćwiczenia.</p></header><ExerciseLibrary exercises={items} /></div>;
}
