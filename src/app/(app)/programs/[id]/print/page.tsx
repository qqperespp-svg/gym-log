import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { programExercises, workoutPrograms } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatMacro } from "@/lib/diet";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export default async function PrintProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [program] = await db
    .select()
    .from(workoutPrograms)
    .where(and(eq(workoutPrograms.id, id), eq(workoutPrograms.userId, user.id)))
    .limit(1);
  if (!program) notFound();
  const rows = await db
    .select()
    .from(programExercises)
    .where(eq(programExercises.programId, id))
    .orderBy(asc(programExercises.position));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="print-hide flex items-center justify-between">
        <Link href="/programs" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white">
          <ArrowLeft size={16} /> Wróć
        </Link>
        <PrintButton />
      </div>

      <div className="panel p-6">
        <p className="eyebrow">Plan treningowy</p>
        <h1 className="text-2xl font-black text-white">{program.name}</h1>
        {program.description && <p className="mt-2 text-sm text-slate-500">{program.description}</p>}
        <p className="mt-3 text-xs text-slate-500">
          Data wydruku: {new Date().toLocaleDateString("pl-PL")} · GYMRAT
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={row.id} className="panel p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-extrabold text-white">
                {i + 1}. {row.name}
              </p>
              <span className="rounded-full bg-white/[.05] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                {row.targetSets} × {row.targetReps}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Ciężar startowy: <b className="text-slate-300">{formatMacro(row.targetWeight)} kg</b>
              <span className="ml-3">Przerwa: {row.restSeconds} s</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
