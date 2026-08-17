import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { desc, eq } from "drizzle-orm";

export default async function WorkoutsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const list = await db.select().from(workouts).where(eq(workouts.userId, user.id)).orderBy(desc(workouts.date));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Workouts</h2>
        <Link href="/workouts/new" className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold px-4 py-2 transition">New Workout</Link>
      </div>
      {list.length === 0 ? (
        <Empty />
      ) : (
        <div className="grid gap-4">
          {list.map((w) => (
            <Link key={w.id} href={`/workouts/${w.id}`} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-amber-700/40 transition shadow-xl shadow-black/10 group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition">{w.title}</h3>
                  <p className="text-xs text-slate-500">{new Date(w.date).toLocaleString()} · {w.durationMinutes} min</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-amber-400 transition" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty() {
  return <p className="text-slate-500">No workouts recorded.</p>;
}
