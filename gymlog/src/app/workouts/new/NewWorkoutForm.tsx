"use client";

import { useFormStatus } from "react-dom";
import { Loader2, ClipboardList, Dumbbell } from "lucide-react";
import { createWorkout } from "./actions";

type Program = { id: number; name: string; description: string | null; count: number };

export default function NewWorkoutForm({ programs }: { programs: Program[] }) {
  return (
    <form action={createWorkout} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl shadow-black/10">
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-1.5">Title</label>
        <input name="title" placeholder="e.g. Upper Power B" required className="w-full rounded-xl bg-slate-950 border border-slate-700 text-white px-4 py-3 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-1.5">Notes</label>
        <textarea name="notes" placeholder="How did it feel? PRs?…" className="w-full rounded-xl bg-slate-950 border border-slate-700 text-white px-4 py-3 h-24 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-1.5">Duration (minutes)</label>
        <input type="number" name="duration" placeholder="60" min={0} className="w-full rounded-xl bg-slate-950 border border-slate-700 text-white px-4 py-3 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-1.5">
          <ClipboardList className="w-4 h-4 text-amber-400" /> Program (optional)
        </label>
        {programs.length === 0 ? (
          <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-700 px-4 py-3">
            No programs yet —{" "}
            <a href="/programs" className="text-amber-400 font-semibold hover:underline">create one first</a> to auto-fill this workout.
          </p>
        ) : (
          <>
            <select name="programId" defaultValue="" className="w-full rounded-xl bg-slate-950 border border-slate-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="">— Start empty —</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {p.count} exercises</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
              <Dumbbell className="w-3 h-3" /> Choosing a program adds all its exercises and pre-fills the previous session&apos;s weights.
            </p>
          </>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="w-full rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white font-bold py-3 transition shadow shadow-amber-900/20 inline-flex items-center justify-center gap-2">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Create workout
    </button>
  );
}
