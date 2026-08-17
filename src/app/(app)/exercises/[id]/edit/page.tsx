import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateExerciseAction } from "@/actions/exercises";
import { ExerciseEditForm } from "@/components/exercise-edit-form";
import { db } from "@/db";
import { exerciseDefinitions } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EditExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [exercise] = await db
    .select()
    .from(exerciseDefinitions)
    .where(and(eq(exerciseDefinitions.id, id), eq(exerciseDefinitions.userId, user.id)))
    .limit(1);
  if (!exercise) notFound();
  const action = updateExerciseAction.bind(null, id);
  return (
    <div className="space-y-7">
      <header>
        <Link
          href="/exercises"
          className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white"
        >
          <ArrowLeft size={16} /> Wróć do biblioteki
        </Link>
        <p className="eyebrow">Edycja ćwiczenia</p>
        <h1 className="page-title">{exercise.name}</h1>
        <p className="mt-2 text-sm text-slate-500">Zmień nazwę lub kategorię ruchu.</p>
      </header>
      <ExerciseEditForm
        exercise={{
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          equipment: exercise.equipment,
        }}
        action={action}
      />
    </div>
  );
}
