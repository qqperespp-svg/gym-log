import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { updateExerciseAction } from "@/actions/exercises";
import { ExerciseEditForm } from "@/components/exercise-edit-form";
import { db } from "@/db";
import { exerciseDefinitions } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export default async function EditExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [exercise] = await db.select().from(exerciseDefinitions).where(and(eq(exerciseDefinitions.id, id), eq(exerciseDefinitions.userId, user.id), eq(exerciseDefinitions.isCustom, 1))).limit(1);
  if (!exercise) notFound();
  const action = updateExerciseAction.bind(null, exercise.id);
  return <div className="space-y-7"><header><Link href="/exercises" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white"><ArrowLeft size={16} /> Wróć do biblioteki</Link><p className="eyebrow">Własne ćwiczenie</p><h1 className="page-title">Edytuj ćwiczenie</h1><p className="mt-2 text-sm text-slate-500">Zaktualizuj nazwę, partię lub używany sprzęt.</p></header><ExerciseEditForm exercise={exercise} action={action} /></div>;
}
