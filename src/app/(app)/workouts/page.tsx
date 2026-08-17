import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { WorkoutList } from "@/components/workout-list";
import { db } from "@/db";
import { exercises, exerciseSets, workouts } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const user = await requireUser();
  const rows = await db
    .select({
      id: workouts.id,
      title: workouts.title,
      date: workouts.date,
      durationMinutes: workouts.durationMinutes,
      status: workouts.status,
      exerciseId: exercises.id,
      setId: exerciseSets.id,
      reps: exerciseSets.reps,
      weight: exerciseSets.weight,
      completed: exerciseSets.completed,
    })
    .from(workouts)
    .leftJoin(exercises, eq(exercises.workoutId, workouts.id))
    .leftJoin(exerciseSets, eq(exerciseSets.exerciseId, exercises.id))
    .where(eq(workouts.userId, user.id))
    .orderBy(desc(workouts.date), asc(exercises.position), asc(exerciseSets.setNumber));
  const grouped = new Map<
    number,
    {
      id: number;
      title: string;
      date: string;
      durationMinutes: number;
      status: string;
      exerciseIds: Set<number>;
      totalSets: number;
      volume: number;
    }
  >();
  for (const row of rows) {
    const item = grouped.get(row.id) ?? {
      id: row.id,
      title: row.title,
      date: row.date.toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" }),
      durationMinutes: row.durationMinutes,
      status: row.status,
      exerciseIds: new Set<number>(),
      totalSets: 0,
      volume: 0,
    };
    if (row.exerciseId) item.exerciseIds.add(row.exerciseId);
    if (row.setId) {
      item.totalSets += 1;
      if (row.completed === 1) item.volume += (row.reps ?? 0) * (row.weight ?? 0);
    }
    grouped.set(row.id, item);
  }
  const items = Array.from(grouped.values()).map(({ exerciseIds, ...item }) => ({
    ...item,
    exerciseCount: exerciseIds.size,
  }));
  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Dziennik treningowy</p>
          <h1 className="page-title">Twoje treningi</h1>
          <p className="mt-2 text-sm text-slate-500">
            Otwieraj sesje, zapisuj serie i śledź wykonanie.
          </p>
        </div>
        <Link href="/workouts/new" className="button-primary self-start sm:self-auto">
          <Plus size={18} /> Nowy trening
        </Link>
      </header>
      <WorkoutList workouts={items} />
    </div>
  );
}
