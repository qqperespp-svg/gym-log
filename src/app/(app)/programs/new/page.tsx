import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createProgramAction } from "@/actions/programs";
import { ProgramForm } from "@/components/program-form";
import { db } from "@/db";
import { exerciseDefinitions } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewProgramPage() {
  const user = await requireUser();
  const library = await db
    .select({
      id: exerciseDefinitions.id,
      name: exerciseDefinitions.name,
      muscleGroup: exerciseDefinitions.muscleGroup,
      equipment: exerciseDefinitions.equipment,
    })
    .from(exerciseDefinitions)
    .where(eq(exerciseDefinitions.userId, user.id))
    .orderBy(asc(exerciseDefinitions.name));
  return (
    <div className="space-y-7">
      <header>
        <Link
          href="/programs"
          className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white"
        >
          <ArrowLeft size={16} /> Wróć do programów
        </Link>
        <p className="eyebrow">Nowy zestaw</p>
        <h1 className="page-title">Nowy program</h1>
        <p className="mt-2 text-sm text-slate-500">
          Zdefiniuj ćwiczenia, serie, powtórzenia i przerwy.
        </p>
      </header>
      <ProgramForm action={createProgramAction} library={library} mode="create" />
    </div>
  );
}
