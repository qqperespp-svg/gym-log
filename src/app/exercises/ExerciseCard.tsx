"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Check, X, Loader2, Library } from "lucide-react";
import { updateExercise, deleteExercise } from "./actions";

type Props = { exercise: { id: number; name: string; category: string; description: string | null; userId: number | null } };

export default function ExerciseCard({ exercise }: Props) {
  const isGlobal = exercise.userId === null;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(exercise.name);
  const [category, setCategory] = useState(exercise.category);
  const [description, setDescription] = useState(exercise.description ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    if (!name.trim()) return;
    startTransition(async () => {
      await updateExercise(exercise.id, { name: name.trim(), category, description: description.trim() });
      setEditing(false);
    });
  }

  function remove() {
    if (!confirm(`Delete "${exercise.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteExercise(exercise.id);
      if (!res.ok) setError(res.error || "Could not delete.");
    });
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl shadow-black/10">
      {editing ? (
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg bg-slate-950 border border-slate-700 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg bg-slate-950 border border-slate-700 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="w-full rounded-lg bg-slate-950 border border-slate-700 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          <div className="flex gap-2">
            <button onClick={save} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-1.5 transition">
              {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
            </button>
            <button onClick={() => setEditing(false)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 transition">
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-white">{exercise.name}</h3>
              {isGlobal && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-300 bg-sky-500/10 rounded-full px-2 py-0.5"><Library className="w-3 h-3" /> Library</span>
              )}
            </div>
            <span className="inline-block mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5">{exercise.category}</span>
            {exercise.description && <p className="text-sm text-slate-500 mt-2">{exercise.description}</p>}
          </div>
          {!isGlobal && (
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setEditing(true)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"><Pencil className="w-4 h-4" /></button>
              <button onClick={remove} className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-rose-400 mt-3">{error}</p>}
    </div>
  );
}
