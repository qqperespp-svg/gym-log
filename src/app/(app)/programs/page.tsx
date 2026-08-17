import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { ProgramList } from "@/components/program-list";
import { db } from "@/db";
import { programExercises, workoutPrograms } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const user = await requireUser();
  const rows = await db
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
    .orderBy(asc(workoutPrograms.name), asc(programExercises.position));
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
          <h1 className="page-title">Twoje programy</h1>
          <p className="mt-2 text-sm text-slate-500">
            Zapisuj gotowe zestawy i planuj je jednym kliknięciem.
          </p>
        </div>
        <Link href="/programs/new" className="button-primary self-start sm:self-auto">
          <Plus size={18} /> Nowy program
        </Link>
      </header>
      <ProgramList programs={programs} />
    </div>
  );
}
