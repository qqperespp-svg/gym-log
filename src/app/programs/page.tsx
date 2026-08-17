import { db } from "@/db";
import { programs, programExercises, exercises } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { asc, eq, inArray, isNull, or } from "drizzle-orm";
import ProgramForm from "./ProgramForm";
import ProgramCard from "./ProgramCard";

export default async function ProgramsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const programList = await db.select().from(programs).where(eq(programs.userId, user.id)).orderBy(asc(programs.name));
  const allExercises = await db.select().from(exercises)
    .where(or(eq(exercises.userId, user.id), isNull(exercises.userId)))
    .orderBy(asc(exercises.name));

  const exerciseOptions = allExercises.map((e) => ({ id: e.id, name: e.name, category: e.category, isGlobal: e.userId === null }));

  // Load exercises for each program
  const pes = programList.length
    ? await db.select().from(programExercises).where(inArray(programExercises.programId, programList.map((p) => p.id))).orderBy(asc(programExercises.orderIndex))
    : [];

  const enriched = programList.map((p) => ({
    ...p,
    exercises: pes
      .filter((pe) => pe.programId === p.id)
      .map((pe) => {
        const ex = allExercises.find((e) => e.id === pe.exerciseId);
        return ex ? { id: ex.id, name: ex.name, category: ex.category, isGlobal: ex.userId === null } : { id: pe.exerciseId, name: "Unknown", category: "Other", isGlobal: true };
      }),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Programs</h2>
          <p className="text-slate-400 text-sm mt-1">Reusable workout templates — apply a whole plan to a new workout in one tap.</p>
        </div>
      </div>

      <ProgramForm exercises={exerciseOptions} />

      {enriched.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl">
          <p className="text-4xl mb-4">📋</p>
          <p className="text-slate-400 font-semibold">No programs yet</p>
          <p className="text-slate-500 text-sm mt-1">Create a template above and reuse it whenever you plan a workout.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enriched.map((p) => <ProgramCard key={p.id} program={p} allExercises={exerciseOptions} />)}
        </div>
      )}
    </div>
  );
}
