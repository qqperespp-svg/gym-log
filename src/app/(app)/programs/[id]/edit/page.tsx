import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { updateProgramAction } from "@/actions/programs";
import { ProgramForm } from "@/components/program-form";
import { db } from "@/db";
import { exerciseDefinitions, programExercises, workoutPrograms } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export default async function EditProgramPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser(); const id = Number((await params).id); if (!Number.isInteger(id)) notFound();
  const [program] = await db.select().from(workoutPrograms).where(and(eq(workoutPrograms.id, id), eq(workoutPrograms.userId, user.id))).limit(1); if (!program) notFound();
  const [items, library, query] = await Promise.all([db.select().from(programExercises).where(eq(programExercises.programId, id)).orderBy(asc(programExercises.position)), db.select({ id: exerciseDefinitions.id, name: exerciseDefinitions.name, muscleGroup: exerciseDefinitions.muscleGroup, equipment: exerciseDefinitions.equipment }).from(exerciseDefinitions).where(eq(exerciseDefinitions.userId, user.id)).orderBy(asc(exerciseDefinitions.name)), searchParams]);
  const initial = { name: program.name, description: program.description ?? "", exercises: items.map((item) => ({ definitionId: item.exerciseDefinitionId ?? 0, name: item.name, targetSets: item.targetSets, targetReps: item.targetReps, targetWeight: item.targetWeight, restSeconds: item.restSeconds })) };
  return <div className="space-y-7">{query.saved === "1" && <div className="flex items-center gap-2 rounded-xl bg-lime-400/10 p-4 text-sm text-lime-200"><CheckCircle2 size={18} /> Program zapisany.</div>}<header><Link href="/programs" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white"><ArrowLeft size={16} /> Wróć do programów</Link><p className="eyebrow">Edycja zestawu</p><h1 className="page-title">Edytuj program</h1></header><ProgramForm action={updateProgramAction.bind(null, id)} library={library} initial={initial} mode="edit" /></div>;
}
