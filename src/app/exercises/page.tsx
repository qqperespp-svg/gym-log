import { db } from "@/db";
import { exercises } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { asc, eq, isNull, or } from "drizzle-orm";
import NewExerciseForm from "./NewExerciseForm";
import ExerciseCard from "./ExerciseCard";

export default async function ExercisesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const list = await db.select().from(exercises)
    .where(or(eq(exercises.userId, user.id), isNull(exercises.userId)))
    .orderBy(asc(exercises.name));

  const libraryCount = list.filter((e) => e.userId === null).length;
  const personalCount = list.length - libraryCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Exercises</h2>
          <p className="text-slate-400 text-sm mt-1">
            {libraryCount} library exercises · {personalCount} of your own
          </p>
        </div>
        <NewExerciseForm />
      </div>

      {list.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl">
          <p className="text-4xl mb-4">🏋️</p>
          <p className="text-slate-400 font-semibold">No exercises yet</p>
          <p className="text-slate-500 text-sm mt-1">Add your first exercise to start building workouts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((ex) => <ExerciseCard key={ex.id} exercise={ex} />)}
        </div>
      )}
    </div>
  );
}
