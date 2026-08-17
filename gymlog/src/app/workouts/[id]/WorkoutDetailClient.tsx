"use client";

import { useState } from "react";
import { Pencil, Dumbbell } from "lucide-react";
import WorkoutEditor from "./WorkoutEditor";

type Exercise = { id: number; name: string; category: string };
type SetRow = { id: number; reps: number; weight: number; rir: number | null };
type WeRow = { id: number; exerciseId: number; exerciseName: string; sets: SetRow[] };
type Workout = { id: number; title: string; notes: string | null; durationMinutes: number | null; date: string };
type Program = { id: number; name: string; exercises: Exercise[] };

export default function WorkoutDetailClient({ workout, exercises, weRows, programs = [] }: {
  workout: Workout;
  exercises: Exercise[];
  weRows: WeRow[];
  programs?: Program[];
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <WorkoutEditor workout={workout} exercises={exercises} weRows={weRows} programs={programs} onDone={() => setEditing(false)} />;
  }

  const totalSets = weRows.reduce((n, r) => n + r.sets.length, 0);
  const totalVolume = weRows.reduce((n, r) => n + r.sets.reduce((m, s) => m + (s.weight > 0 ? s.reps * s.weight : 0), 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">{workout.title}</h2>
          <p className="text-slate-400 text-sm">
            {new Date(workout.date).toLocaleString()}
            {workout.durationMinutes ? ` · ${workout.durationMinutes} min` : ""}
            {workout.notes ? ` · ${workout.notes}` : ""}
          </p>
          <div className="flex gap-2 flex-wrap pt-1">
            <Badge label={`${weRows.length} exercises`} />
            <Badge label={`${totalSets} sets`} />
            {totalVolume > 0 && <Badge label={`${totalVolume.toLocaleString()} lbs volume`} />}
          </div>
        </div>
        <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 text-slate-300 hover:text-white border border-slate-700 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-slate-800 transition shrink-0">
          <Pencil className="w-4 h-4" /> Edit
        </button>
      </div>

      {weRows.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl">
          <p className="text-4xl mb-4">🏋️</p>
          <p className="text-slate-400 font-semibold">Nothing logged yet</p>
          <p className="text-slate-500 text-sm mt-1">Tap Edit to add exercises and start recording sets.</p>
          <button onClick={() => setEditing(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold px-5 py-2.5 transition">
            <Pencil className="w-4 h-4" /> Add exercises
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <th className="px-5 py-3 font-semibold">Exercise</th>
                  <th className="px-4 py-3 font-semibold w-16 text-center">Set</th>
                  <th className="px-4 py-3 font-semibold text-right">Reps</th>
                  <th className="px-4 py-3 font-semibold text-right">Weight</th>
                  <th className="px-5 py-3 font-semibold text-right">RIR</th>
                </tr>
              </thead>
              <tbody>
                {weRows.map((row) => {
                  const count = row.sets.length;
                  if (count === 0) {
                    return (
                      <tr key={row.id} className="border-b border-slate-800/60 last:border-0">
                        <td className="px-5 py-3.5 font-semibold text-white whitespace-nowrap">
                          <span className="inline-flex items-center gap-2"><Dumbbell className="w-3.5 h-3.5 text-amber-400" />{row.exerciseName}</span>
                        </td>
                        <td className="px-4 py-3.5 text-center text-slate-600">—</td>
                        <td className="px-4 py-3.5 text-right text-slate-600">—</td>
                        <td className="px-4 py-3.5 text-right text-slate-600">—</td>
                        <td className="px-5 py-3.5 text-right text-slate-600">—</td>
                      </tr>
                    );
                  }
                  return row.sets.map((s, i) => (
                    <tr key={s.id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-950/40 transition">
                      {i === 0 ? (
                        <td rowSpan={count} className="px-5 py-3.5 align-top font-semibold text-white whitespace-nowrap">
                          <span className="inline-flex items-center gap-2"><Dumbbell className="w-3.5 h-3.5 text-amber-400" />{row.exerciseName}</span>
                        </td>
                      ) : null}
                      <td className="px-4 py-3.5 text-center font-mono text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-white">{s.reps}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-white">{s.weight > 0 ? `${s.weight} lbs` : "BW"}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-white">{s.rir ?? "–"}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return <span className="inline-flex items-center rounded-full bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-1">{label}</span>;
}
