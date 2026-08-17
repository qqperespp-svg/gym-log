import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateProgramAction } from "@/actions/programs";
import { ProgramForm } from "@/components/program-form";
import { db } from "@/db";
import { exerciseDefinitions, programExercises, workoutPrograms } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EditProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [program] = await db
    .select()
    .from(workoutPrograms)
    .where(and(eq(workoutPrograms.id, id), eq(workoutPrograms.userId, user.id)))
    .limit(1);
  if (!program) notFound();
  const [library, rows] = await Promise.all([
    db
      .select({
        id: exerciseDefinitions.id,
        name: exerciseDefinitions.name,
        muscleGroup: exerciseDefinitions.muscleGroup,
        equipment: exerciseDefinitions.equipment,
      })
      .from(exerciseDefinitions)
      .where(eq(exerciseDefinitions.userId, user.id))
      .orderBy(asc(exerciseDefinitions.name)),
    db
      .select()
      .from(programExercises)
      .where(eq(programExercises.programId, id))
      .orderBy(asc(programExercises.position)),
  ]);
  const action = updateProgramAction.bind(null, id);
  const initial = {
    name: program.name,
    description: program.description ?? "",
    exercises: rows.map((row) => ({
      definitionId: row.exerciseDefinitionId ?? 0,
      name: row.name,
      targetSets: row.targetSets,
      targetReps: row.targetReps,
      targetWeight: row.targetWeight,
      restSeconds: row.restSeconds,
    })),
  };
  return (
    <div className="space-y-7">
      <header>
        <Link
          href="/programs"
          className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white"
        >
          <ArrowLeft size={16} /> Wróć do programów
        </Link>
        <p className="eyebrow">Edycja zestawu</p>
        <h1 className="page-title">Edytuj program</h1>
        <p className="mt-2 text-sm text-slate-500">Zmień ćwiczenia lub cele serii.</p>
      </header>
      <ProgramForm action={action} library={library} initial={initial} mode="edit" />
    </div>
  );
}
