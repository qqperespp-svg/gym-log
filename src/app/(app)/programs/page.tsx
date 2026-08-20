import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { ProgramList } from "@/components/program-list";
import { ExerciseLibrary } from "@/components/exercise-library";
import { PlansTabs } from "@/components/plans-tabs";
import { db } from "@/db";
import { exerciseDefinitions, programExercises, workoutPrograms } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const user = await requireUser();
  const [rows, exercises] = await Promise.all([
    db
      .select({
        id: workoutPrograms.id,
        name: workoutPrograms.name,
        description: workoutPrograms.description,
        exerciseId: programExercises.id,
        targetSets: programExercises.targetSets,
      })
      .from(workoutPrograms)
      .leftJoin(programExercises, eq(programExercises.programId, workoutPrograms.id))
      .where(eq(workoutPrograms.userId, user.id))
      .orderBy(asc(workoutPrograms.name), asc(programExercises.position)),
    db
      .select({
        id: exerciseDefinitions.id,
        name: exerciseDefinitions.name,
        muscleGroup: exerciseDefinitions.muscleGroup,
        equipment: exerciseDefinitions.equipment,
        isCustom: exerciseDefinitions.isCustom,
      })
      .from(exerciseDefinitions)
      .where(eq(exerciseDefinitions.userId, user.id))
      .orderBy(asc(exerciseDefinitions.name)),
  ]);
  const programs = Array.from(
    rows
      .reduce((map, row) => {
        const current = map.get(row.id) ?? {
          id: row.id,
          name: row.name,
          description: row.description ?? "",
          exerciseCount: 0,
          totalSets: 0,
        };
        if (row.exerciseId) {
          current.exerciseCount += 1;
          current.totalSets += row.targetSets ?? 0;
        }
        map.set(row.id, current);
        return map;
      }, new Map<number, { id: number; name: string; description: string; exerciseCount: number; totalSets: number }>())
      .values(),
  );

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Programowanie treningu</p>
          <h1 className="page-title">Plany treningowe</h1>
          <p className="mt-2 text-sm text-slate-500">
            Programy (gotowe zestawy) i biblioteka ćwiczeń — wszystko w jednym miejscu.
          </p>
        </div>
      </header>

      <PlansTabs
        programy={
          <div className="space-y-6">
            <div className="flex justify-end">
              <Link href="/programs/new" className="button-primary">
                <Plus size={18} /> Nowy program
              </Link>
            </div>
            <ProgramList programs={programs} />
          </div>
        }
        cwiczenia={
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/[.06] bg-black/10 px-4 py-3 text-xs text-slate-500">
              Przeszukuj katalog ćwiczeń lub dodawaj własne — korzystają z nich programy i treningi.
            </div>
            <ExerciseLibrary exercises={exercises} />
          </div>
        }
      />
    </div>
  );
}
