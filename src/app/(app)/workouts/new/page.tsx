import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createWorkoutAction } from "@/actions/workouts";
import { WorkoutForm } from "@/components/workout-form";
import { db } from "@/db";
import { exerciseDefinitions, programExercises, workoutPrograms } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getLastPerformance } from "@/lib/workout-data";

export default async function NewWorkoutPage({ searchParams }: { searchParams: Promise<{ program?: string }> }) {
  const user = await requireUser();
  const [library, programRows, lastPerformance, query] = await Promise.all([
    db.select({ id: exerciseDefinitions.id, name: exerciseDefinitions.name, muscleGroup: exerciseDefinitions.muscleGroup, equipment: exerciseDefinitions.equipment }).from(exerciseDefinitions).where(eq(exerciseDefinitions.userId, user.id)).orderBy(asc(exerciseDefinitions.name)),
    db.select({ id: workoutPrograms.id, name: workoutPrograms.name, description: workoutPrograms.description, exerciseId: programExercises.id, definitionId: programExercises.exerciseDefinitionId, exerciseName: programExercises.name, targetSets: programExercises.targetSets, targetReps: programExercises.targetReps, targetWeight: programExercises.targetWeight, restSeconds: programExercises.restSeconds, position: programExercises.position }).from(workoutPrograms).leftJoin(programExercises, eq(programExercises.programId, workoutPrograms.id)).where(eq(workoutPrograms.userId, user.id)).orderBy(asc(workoutPrograms.name), asc(programExercises.position)),
    getLastPerformance(user.id), searchParams,
  ]);
  const programs = Array.from(programRows.reduce((map, row) => { const current = map.get(row.id) ?? { id: row.id, name: row.name, description: row.description ?? "", exercises: [] as Array<{ definitionId: number; name: string; targetSets: number; targetReps: number; targetWeight: number; restSeconds: number }> }; if (row.exerciseId && row.definitionId) current.exercises.push({ definitionId: row.definitionId, name: row.exerciseName ?? "", targetSets: row.targetSets ?? 3, targetReps: row.targetReps ?? 10, targetWeight: row.targetWeight ?? 0, restSeconds: row.restSeconds ?? 90 }); map.set(row.id, current); return map; }, new Map<number, { id: number; name: string; description: string; exercises: Array<{ definitionId: number; name: string; targetSets: number; targetReps: number; targetWeight: number; restSeconds: number }> }>()).values());
  const requestedProgram = Number(query.program); const initialProgramId = programs.some((item) => item.id === requestedProgram) ? requestedProgram : 0;
  return <div className="space-y-7"><header><Link href="/workouts" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white"><ArrowLeft size={16} /> Wróć do treningów</Link><p className="eyebrow">Nowa sesja</p><h1 className="page-title">Zaplanuj trening</h1><p className="mt-2 text-sm text-slate-500">Wybierz program lub zbuduj sesję od zera.</p></header><WorkoutForm action={createWorkoutAction} library={library} programs={programs} lastPerformance={lastPerformance} initialProgramId={initialProgramId} mode="create" /></div>;
}
