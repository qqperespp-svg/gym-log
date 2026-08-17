"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Check, X, Save, Loader2, Dumbbell, ClipboardList } from "lucide-react";
import {
  updateWorkout,
  deleteWorkout,
  addExerciseToWorkout,
  removeExercise,
  addSet,
  removeSet,
} from "./actions";

type Exercise = { id: number; name: string; category: string };
type SetRow = { id: number; reps: number; weight: number; rir: number | null };
type WeRow = { id: number; exerciseId: number; exerciseName: string; sets: SetRow[] };
type Workout = { id: number; title: string; notes: string | null; durationMinutes: number | null; date: string };
type Program = { id: number; name: string; exercises: Exercise[] };

export default function WorkoutEditor({ workout, exercises, weRows: initial, onDone, programs = [] }: {
  workout: Workout;
  exercises: Exercise[];
  weRows: WeRow[];
  onDone?: () => void;
  programs?: Program[];
}) {
  const router = useRouter();
  const [weRows, setWeRows] = useState<WeRow[]>(initial);
  const [editingMeta, setEditingMeta] = useState(false);
  const [title, setTitle] = useState(workout.title);
  const [notes, setNotes] = useState(workout.notes ?? "");
  const [duration, setDuration] = useState(workout.durationMinutes?.toString() ?? "");
  const [addId, setAddId] = useState<number | "">("");
  const [loadProgramId, setLoadProgramId] = useState<number | "">("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const available = exercises.filter((e) => !weRows.some((w) => w.exerciseId === e.id));

  async function addExercise(exId: number, exName: string) {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: WeRow = { id: tempId as unknown as number, exerciseId: exId, exerciseName: exName, sets: [] };
    setWeRows((prev) => [...prev, optimistic]);
    try {
      const realId = await addExerciseToWorkout(workout.id, exId);
      setWeRows((prev) => prev.map((r) => (r.id === optimistic.id ? { ...r, id: realId } : r)));
      return true;
    } catch {
      setWeRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      setError("Could not add exercise.");
      return false;
    }
  }

  async function handleAddExercise() {
    if (!addId) return;
    const ex = exercises.find((e) => e.id === addId);
    setAddId("");
    if (!ex) return;
    await addExercise(ex.id, ex.name);
    router.refresh();
  }

  async function handleLoadProgram() {
    if (!loadProgramId) return;
    const prog = programs.find((p) => p.id === loadProgramId);
    setLoadProgramId("");
    if (!prog) return;
    const toAdd = prog.exercises.filter((e) => !weRows.some((w) => w.exerciseId === e.id));
    for (const ex of toAdd) {
      await addExercise(ex.id, ex.name);
    }
    router.refresh();
  }

  function handleRemoveExercise(weId: number) {
    setWeRows((prev) => prev.filter((r) => r.id !== weId));
    startTransition(async () => {
      try { await removeExercise(weId); router.refresh(); } catch { setError("Could not remove exercise."); router.refresh(); }
    });
  }

  function handleAddSet(weId: number, reps: number, weight: number, rir: number | null) {
    const tempId = `s-${Date.now()}`;
    setWeRows((prev) => prev.map((r) => r.id === weId
      ? { ...r, sets: [...r.sets, { id: tempId as unknown as number, reps, weight, rir }] }
      : r));
    startTransition(async () => {
      try {
        const realId = await addSet(weId, reps, weight, rir);
        setWeRows((prev) => prev.map((r) => r.id === weId
          ? { ...r, sets: r.sets.map((s) => (s.id === (tempId as unknown as number) ? { ...s, id: realId } : s)) }
          : r));
        router.refresh();
      } catch {
        setWeRows((prev) => prev.map((r) => r.id === weId
          ? { ...r, sets: r.sets.filter((s) => s.id !== (tempId as unknown as number)) }
          : r));
        setError("Could not add set.");
      }
    });
  }

  function handleRemoveSet(weId: number, setId: number) {
    setWeRows((prev) => prev.map((r) => r.id === weId
      ? { ...r, sets: r.sets.filter((s) => s.id !== setId) }
      : r));
    startTransition(async () => {
      try { await removeSet(setId); router.refresh(); } catch { setError("Could not remove set."); router.refresh(); }
    });
  }

  function saveMeta() {
    startTransition(async () => {
      try {
        await updateWorkout(workout.id, {
          title: title.trim(),
          notes,
          durationMinutes: duration ? Number(duration) : null,
        });
        setEditingMeta(false);
        router.refresh();
      } catch { setError("Could not save changes."); }
    });
  }

  function handleDelete() {
    if (!confirm("Delete this workout and all of its sets?")) return;
    startTransition(async () => {
      await deleteWorkout(workout.id);
      router.push("/workouts");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        {editingMeta ? (
          <div className="flex-1 space-y-3 bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl bg-slate-950 border border-slate-700 text-white px-4 py-2.5 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="rounded-xl bg-slate-950 border border-slate-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <input value={duration} onChange={(e) => setDuration(e.target.value)} type="number" placeholder="Duration (min)" className="rounded-xl bg-slate-950 border border-slate-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={saveMeta} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-2 transition">
                {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
              </button>
              <button onClick={() => setEditingMeta(false)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 transition">
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">{workout.title}</h2>
            <p className="text-slate-400 text-sm">
              {new Date(workout.date).toLocaleString()}
              {workout.durationMinutes ? ` · ${workout.durationMinutes} min` : ""}
              {workout.notes ? ` · ${workout.notes}` : ""}
            </p>
          </div>
        )}
        <div className="flex gap-2 shrink-0">
          {onDone && (
            <button onClick={onDone} className="inline-flex items-center gap-2 text-amber-300 hover:text-amber-200 border border-amber-700/50 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-amber-950/40 transition">
              <Check className="w-4 h-4" /> Done
            </button>
          )}
          {!editingMeta && (
            <button onClick={() => setEditingMeta(true)} className="inline-flex items-center gap-2 text-slate-300 hover:text-white border border-slate-700 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-slate-800 transition">
              <Pencil className="w-4 h-4" /> Edit
            </button>
          )}
          <button onClick={handleDelete} className="inline-flex items-center gap-2 text-rose-400 hover:text-rose-300 border border-rose-900/50 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-rose-950 transition">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl bg-rose-950/60 border border-rose-800/50 text-rose-200 text-sm px-4 py-3">{error}</div>}

      {/* Exercises */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-lg">Exercises &amp; Sets</h3>
          <span className="text-xs text-slate-500">{weRows.length} exercises · {weRows.reduce((n, r) => n + r.sets.length, 0)} sets</span>
        </div>

        {weRows.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl">
            <p className="text-slate-500 text-sm">No exercises added yet. Add one below to start logging sets.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {weRows.map((row) => (
              <div key={row.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-amber-400" />
                    <p className="font-bold text-white text-sm">{row.exerciseName}</p>
                  </div>
                  <button onClick={() => handleRemoveExercise(row.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition" title="Remove exercise">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {row.sets.length === 0 ? (
                    <span className="text-xs text-slate-600 italic">No sets yet</span>
                  ) : (
                    row.sets.map((s, i) => (
                      <span key={s.id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-slate-800 rounded-lg text-xs font-mono text-white">
                        <span className="text-slate-400">#{i + 1}</span> {s.reps} × {s.weight} lbs
                        <span className="text-slate-400">· RIR {s.rir ?? "–"}</span>
                        <button onClick={() => handleRemoveSet(row.id, s.id)} className="p-0.5 rounded text-slate-500 hover:text-rose-400 transition" title="Remove set">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <SetAdder onAdd={(reps, weight, rir) => handleAddSet(row.id, reps, weight, rir)} />
              </div>
            ))}
          </div>
        )}

        {/* Add exercise */}
        <div className="flex gap-3 pt-2 border-t border-slate-800">
          <select value={addId} onChange={(e) => setAddId(e.target.value ? Number(e.target.value) : "")} className="flex-1 rounded-xl bg-slate-950 border border-slate-700 text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
            <option value="">Add an exercise…</option>
            {available.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.category}</option>)}
          </select>
          <button onClick={handleAddExercise} disabled={!addId} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-2.5 transition">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        {available.length === 0 && <p className="text-xs text-slate-500 -mt-2">All your exercises are already in this workout.</p>}

        {programs.length > 0 && (
          <div className="flex gap-3">
            <select value={loadProgramId} onChange={(e) => setLoadProgramId(e.target.value ? Number(e.target.value) : "")} className="flex-1 rounded-xl bg-slate-950 border border-slate-700 text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="">Load a whole program…</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.exercises.length} exercises</option>)}
            </select>
            <button onClick={handleLoadProgram} disabled={!loadProgramId} className="inline-flex items-center gap-2 rounded-xl border border-amber-700/50 text-amber-300 hover:bg-amber-950/40 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold px-4 py-2.5 transition">
              <ClipboardList className="w-4 h-4" /> Load
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function SetAdder({ onAdd }: { onAdd: (reps: number, weight: number, rir: number | null) => void }) {
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [rir, setRir] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = Number(reps);
    const w = Number(weight);
    if (!reps || r <= 0) return;
    onAdd(r, Number.isFinite(w) ? w : 0, rir !== "" ? Number(rir) : null);
    setReps("");
    setWeight("");
    setRir("");
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2">
      <input value={reps} onChange={(e) => setReps(e.target.value)} type="number" min={1} placeholder="Reps" className="w-20 rounded-lg bg-slate-800/60 border border-slate-700 text-white px-3 py-1.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
      <input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" min={0} step="0.5" placeholder="Lbs" className="w-20 rounded-lg bg-slate-800/60 border border-slate-700 text-white px-3 py-1.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
      <input value={rir} onChange={(e) => setRir(e.target.value)} type="number" min={0} step="1" placeholder="RIR" className="w-20 rounded-lg bg-slate-800/60 border border-slate-700 text-white px-3 py-1.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500" title="Reps in reserve" />
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 transition">
        <Plus className="w-3 h-3" /> Set
      </button>
    </form>
  );
}
