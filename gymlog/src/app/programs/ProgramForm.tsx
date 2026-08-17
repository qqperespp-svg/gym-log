"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Loader2, Check, X, Search } from "lucide-react";
import { createProgram, updateProgram } from "./actions";

type Exercise = { id: number; name: string; category: string; isGlobal: boolean };
type Program = { id: number; name: string; description: string | null; exerciseIds: number[] };

export default function ProgramForm({
  exercises,
  program,
  onClose,
}: {
  exercises: Exercise[];
  program?: Program;
  onClose?: () => void;
}) {
  const [name, setName] = useState(program?.name ?? "");
  const [description, setDescription] = useState(program?.description ?? "");
  const [selected, setSelected] = useState<number[]>(program?.exerciseIds ?? []);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? exercises.filter((e) => e.name.toLowerCase().includes(q)) : exercises;
    const map = new Map<string, Exercise[]>();
    for (const e of filtered) {
      const arr = map.get(e.category) ?? [];
      arr.push(e);
      map.set(e.category, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [exercises, search]);

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || selected.length === 0) return;
    startTransition(async () => {
      const payload = { name: name.trim(), description: description.trim(), exerciseIds: selected };
      if (program) await updateProgram(program.id, payload);
      else await createProgram(payload);
      onClose?.();
    });
  }

  return (
    <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Program name" required autoFocus className="rounded-xl bg-slate-950 border border-slate-700 text-white px-4 py-2.5 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="rounded-xl bg-slate-950 border border-slate-700 text-white px-4 py-2.5 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-slate-300">Exercises ({selected.length} selected)</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="rounded-lg bg-slate-950 border border-slate-700 text-white pl-9 pr-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-4">
          {grouped.map(([category, list]) => (
            <div key={category}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">{category}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {list.map((e) => {
                  const active = selected.includes(e.id);
                  return (
                    <button type="button" key={e.id} onClick={() => toggle(e.id)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition border ${active ? "bg-amber-600/15 border-amber-600/40 text-white" : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"}`}>
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${active ? "bg-amber-500 border-amber-500" : "border-slate-600"}`}>
                        {active && <Check className="w-3 h-3 text-slate-950" />}
                      </span>
                      <span className="truncate">{e.name}</span>
                      {!e.isGlobal && <span className="text-[10px] text-slate-500">(yours)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {grouped.length === 0 && <p className="text-sm text-slate-500 p-3">No exercises match your search.</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending || !name.trim() || selected.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2.5 transition">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : program ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {program ? "Save program" : "Create program"}
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white px-3 py-2 transition"><X className="w-4 h-4" /> Cancel</button>
        )}
      </div>
    </form>
  );
}
