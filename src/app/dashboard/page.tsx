import Link from "next/link";
import { ArrowRight, TrendingUp, Activity, Flame, Scale, Ruler } from "lucide-react";
import { db } from "@/db";
import { workouts, sets, workoutExercises, bodyMeasurements } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { desc, eq, sql, asc } from "drizzle-orm";
import WeeklyVolumeChart from "./WeeklyVolumeChart";
import BodySummary from "./BodySummary";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const recent = await db.select({ id: workouts.id, title: workouts.title, date: workouts.date, durationMinutes: workouts.durationMinutes }).from(workouts).where(eq(workouts.userId, user.id)).orderBy(desc(workouts.date)).limit(5);

  const [workoutCount] = await db.select({ count: sql<number>`count(*)::int` }).from(workouts).where(eq(workouts.userId, user.id));
  const [setCount] = await db.select({ count: sql<number>`count(*)::int` }).from(sets).innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id)).innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id)).where(eq(workouts.userId, user.id));
  const [activeDays] = await db.select({ count: sql<number>`count(distinct ${workouts.date}::date)::int` }).from(workouts).where(eq(workouts.userId, user.id));

  // Body measurements for summary
  const bodyData = await db.select().from(bodyMeasurements).where(eq(bodyMeasurements.userId, user.id)).orderBy(asc(bodyMeasurements.date));

  // Weekly volume data for chart
  const weeklyVolume = await db.select({
    week: sql<string>`to_char(${workouts.date}, 'YYYY-"W"IW')`,
    volume: sql<number>`coalesce(sum(${sets.reps}::numeric * ${sets.weight}::numeric), 0)::numeric`.mapWith(Number),
  }).from(workouts)
    .innerJoin(workoutExercises, eq(workouts.id, workoutExercises.workoutId))
    .innerJoin(sets, eq(workoutExercises.id, sets.workoutExerciseId))
    .where(eq(workouts.userId, user.id))
    .groupBy(sql`to_char(${workouts.date}, 'YYYY-"W"IW')`)
    .orderBy(sql`to_char(${workouts.date}, 'YYYY-"W"IW')`);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">Welcome back, {user.name}.</p>
        </div>
        <Link href="/workouts/new" className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold px-5 py-2.5 shadow shadow-amber-900/20 transition shrink-0">New Workout <ArrowRight className="w-4 h-4" /></Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<TrendingUp className="w-6 h-6 text-amber-400" />} label="Workouts" value={String(workoutCount?.count ?? 0)} />
        <StatCard icon={<Activity className="w-6 h-6 text-emerald-400" />} label="Total Sets" value={String(setCount?.count ?? 0)} />
        <StatCard icon={<Flame className="w-6 h-6 text-rose-400" />} label="Active Days" value={String(activeDays?.count ?? 0)} />
      </div>

      <BodySummary measurements={bodyData} />

      <WeeklyVolumeChart data={weeklyVolume} />

      <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Recent Workouts</h3>
          <Link href="/workouts" className="text-sm text-amber-400 font-semibold hover:underline">View all</Link>
        </div>
        <div className="space-y-3">
          {recent.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-3xl mb-3"></p>
              <p className="text-sm font-semibold">No workouts recorded yet.</p>
              <Link href="/workouts/new" className="inline-block mt-2 text-sm text-amber-400 font-semibold hover:underline">Create your first workout</Link>
            </div>
          ) : (
            recent.map((w) => (
              <Link key={w.id} href={`/workouts/${w.id}`} className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 transition group">
                <div>
                  <h4 className="font-bold text-white group-hover:text-amber-300 transition">{w.title}</h4>
                  <p className="text-xs text-slate-500">{new Date(w.date).toLocaleDateString()}{w.durationMinutes ? ` · ${w.durationMinutes} min` : ""}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition" />
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between mb-4">{icon}<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span></div>
      <p className="text-4xl font-extrabold text-white">{value}</p>
    </div>
  );
}
