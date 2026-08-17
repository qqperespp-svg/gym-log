"use client";

import { useState, useTransition } from "react";
import { Trash2, Pencil, Dumbbell, Loader2 } from "lucide-react";
import { deleteProgram } from "./actions";
import ProgramForm from "./ProgramForm";

type Exercise = { id: number; name: string; category: string; isGlobal: boolean };
type Program = { id: number; name: string; description: string | null; exercises: Exercise[] };

export default function ProgramCard({ program, allExercises }: { program: Program; allExercises: Exercise[] }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!confirm(`Delete program "${program.name}"?`)) return;
    startTransition(async () => { await deleteProgram(program.id); });
  }

  if (editing) {
    return (
      <ProgramForm
        exercises={allExercises}
        program={{ id: program.id, name: program.name, description: program.description, exerciseIds: program.exercises.map((e) => e.id) }}
        onClose={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl shadow-black/10">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-bold text-white">{program.name}</h3>
          {program.description && <p className="text-sm text-slate-500 mt-1">{program.description}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => setEditing(true)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"><Pencil className="w-4 h-4" /></button>
          <button onClick={remove} disabled={pending} className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <ol className="space-y-1.5">
        {program.exercises.map((e, i) => (
          <li key={e.id} className="flex items-center gap-2 text-sm text-slate-300">
            <span className="text-[11px] font-mono text-slate-500 w-5 shrink-0">{i + 1}.</span>
            <Dumbbell className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
            <span className="truncate">{e.name}</span>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-600 shrink-0">{e.category}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
