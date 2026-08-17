import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { programs, programExercises } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { asc, eq, inArray, sql } from "drizzle-orm";
import NewWorkoutForm from "./NewWorkoutForm";

export default async function NewWorkoutPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const programList = await db.select().from(programs).where(eq(programs.userId, user.id)).orderBy(asc(programs.name));

  const counts = programList.length
    ? await db.select({ programId: programExercises.programId, count: sql<number>`count(*)::int` })
        .from(programExercises)
        .where(inArray(programExercises.programId, programList.map((p) => p.id)))
        .groupBy(programExercises.programId)
    : [];

  const countMap = new Map(counts.map((c) => [c.programId, c.count]));
  const options = programList.map((p) => ({ id: p.id, name: p.name, description: p.description, count: countMap.get(p.id) ?? 0 }));

  return (
    <div className="max-w-lg space-y-6">
      <Link href="/workouts" className="inline-flex text-sm text-slate-400 hover:text-white items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back</Link>
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">New Workout</h2>
        <p className="text-slate-400 text-sm mt-1">Log a session, then add exercises and sets on the next screen.</p>
      </div>
      <NewWorkoutForm programs={options} />
    </div>
  );
}
