"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { createExercise } from "./actions";
import { CATEGORIES } from "@/lib/categories";

export default function NewExerciseForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Chest");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await createExercise({ name: name.trim(), category, description: description.trim() });
      setName("");
      setDescription("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold px-4 py-2.5 transition shadow shadow-amber-900/20">
        <Plus className="w-4 h-4" /> New exercise
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Exercise name" required autoFocus className="rounded-xl bg-slate-950 border border-slate-700 text-white px-4 py-2.5 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl bg-slate-950 border border-slate-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full rounded-xl bg-slate-950 border border-slate-700 text-white px-4 py-2.5 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white text-sm font-bold px-4 py-2.5 transition inline-flex items-center gap-2">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save exercise
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-400 hover:text-white transition px-3 py-2">Cancel</button>
      </div>
    </form>
  );
}
