"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  Clock3,
  Layers3,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { WorkoutFormState } from "@/actions/workouts";
import type { PreviousSet } from "@/lib/workout-data";
import { SubmitButton } from "@/components/submit-button";
import { matchesWords } from "@/lib/search";

type LibraryItem = { id: number; name: string; muscleGroup: string; equipment: string };
type SetRow = { key: string; reps: number; weight: number; rir: number | null; note: string; completed: boolean };
type ExerciseRow = { key: string; definitionId: number; name: string; query: string; restSeconds: number; grp: string | null; sets: SetRow[] };
type Program = {
  id: number;
  name: string;
  description: string;
  exercises: Array<{
    definitionId: number;
    name: string;
    targetSets: number;
    targetReps: number;
    targetWeight: number;
    restSeconds: number;
  }>;
};
type InitialWorkout = {
  title: string;
  date: string;
  notes: string;
  durationMinutes: number;
  status: string;
  programId: number | null;
  exercises: Array<{
    definitionId: number;
    name: string;
    restSeconds: number;
    sets: Array<{ reps: number; weight: number; rir: number | null; note: string; completed: boolean }>;
  }>;
};
type Props = {
  action: (state: WorkoutFormState, formData: FormData) => Promise<WorkoutFormState>;
  library: LibraryItem[];
  programs: Program[];
  lastPerformance: Record<number, PreviousSet[]>;
  initial?: InitialWorkout;
  initialProgramId?: number;
  mode: "create" | "edit";
};

const makeSet = (data?: Partial<Omit<SetRow, "key">>): SetRow => ({
  key: crypto.randomUUID(),
  reps: data?.reps ?? 10,
  weight: data?.weight ?? 0,
  rir: data?.rir ?? null,
  note: data?.note ?? "",
  completed: data?.completed ?? false,
});
const makeExercise = (): ExerciseRow => ({
  key: crypto.randomUUID(),
  definitionId: 0,
  name: "",
  query: "",
  restSeconds: 90,
  grp: null,
  sets: [makeSet(), makeSet(), makeSet()],
});

export function WorkoutForm({
  action,
  library,
  programs,
  lastPerformance,
  initial,
  initialProgramId,
  mode,
}: Props) {
  const [state, formAction] = useActionState(action, undefined);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [status, setStatus] = useState(initial?.status ?? "planned");
  const [programId, setProgramId] = useState(initial?.programId ?? initialProgramId ?? 0);
  const [rows, setRows] = useState<ExerciseRow[]>(
    initial?.exercises.map((item) => ({
      ...item,
      key: crypto.randomUUID(),
      query: "",
      grp: (item as { grp?: string | null }).grp ?? null,
      sets: item.sets.map((set) => makeSet(set)),
    })) ?? [makeExercise()],
  );
  const groups = useMemo(
    () => Array.from(new Set(library.map((item) => item.muscleGroup))).sort((a, b) => a.localeCompare(b, "pl")),
    [library],
  );
  const updateExercise = (key: string, patch: Partial<ExerciseRow>) =>
    setRows((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  const updateSet = (exerciseKey: string, setKey: string, patch: Partial<SetRow>) =>
    setRows((current) =>
      current.map((exercise) =>
        exercise.key === exerciseKey
          ? {
              ...exercise,
              sets: exercise.sets.map((set) => (set.key === setKey ? { ...set, ...patch } : set)),
            }
          : exercise,
      ),
    );
  const previousSets = (definitionId: number, count: number, fallback: { reps: number; weight: number }) =>
    Array.from({ length: count }, (_, index) => {
      const previous = lastPerformance[definitionId]?.[index] ?? lastPerformance[definitionId]?.at(-1);
      return makeSet({
        reps: previous?.reps ?? fallback.reps,
        weight: previous?.weight ?? fallback.weight,
        rir: previous?.rir ?? null,
        completed: status === "completed",
      });
    });
  function chooseExercise(key: string, definitionId: number) {
    const item = library.find((exercise) => exercise.id === definitionId);
    if (!item) return;
    const current = rows.find((row) => row.key === key);
    updateExercise(key, {
      definitionId,
      name: item.name,
      sets: previousSets(definitionId, current?.sets.length ?? 3, { reps: 10, weight: 0 }),
    });
  }
  function applyProgram(id: number) {
    setProgramId(id);
    const program = programs.find((item) => item.id === id);
    if (!program) return;
    setTitle(program.name);
    setStatus("planned");
    setRows(
      program.exercises.map((item) => ({
        key: crypto.randomUUID(),
        definitionId: item.definitionId,
        name: item.name,
        query: "",
        restSeconds: item.restSeconds,
        grp: null,
        sets: previousSets(item.definitionId, item.targetSets, {
          reps: item.targetReps,
          weight: item.targetWeight,
        }),
      })),
    );
  }
  const initialProgramApplied = useRef(false);
  useEffect(() => {
    if (!initial && initialProgramId && !initialProgramApplied.current) {
      initialProgramApplied.current = true;
      applyProgram(initialProgramId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, initialProgramId]);
  function resizeSets(key: string, count: number) {
    const row = rows.find((item) => item.key === key);
    if (!row || count < 1 || count > 20) return;
    const next = row.sets.slice(0, count);
    while (next.length < count) {
      const last = next.at(-1);
      next.push(makeSet(last ? { reps: last.reps, weight: last.weight, rir: last.rir, completed: false } : undefined));
    }
    updateExercise(key, { sets: next });
  }
  const serialized = rows.map(({ query: _q, ...row }) => ({
    definitionId: row.definitionId || null,
    name: row.name,
    restSeconds: row.restSeconds,
    grp: row.grp,
    sets: row.sets.map((set) => ({
      reps: set.reps,
      weight: set.weight,
      rir: set.rir,
      note: set.note,
      completed: set.completed,
    })),
  }));

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="workoutData" value={JSON.stringify(serialized)} />
      <input type="hidden" name="programId" value={programId} />

      {mode === "create" && programs.length > 0 && (
        <section className="rounded-2xl border border-lime-400/15 bg-gradient-to-r from-lime-400/[.08] to-transparent p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="icon-box">
              <Layers3 size={20} />
            </span>
            <div className="flex-1">
              <h2 className="font-extrabold text-white">Wczytaj gotowy program</h2>
              <p className="mt-1 text-sm text-slate-500">
                Serie zostaną uzupełnione wynikami z ostatniego treningu.
              </p>
            </div>
            <span className="select-shell w-full sm:w-72">
              <select value={programId} onChange={(event) => applyProgram(Number(event.target.value))}>
                <option value={0}>Wybierz program…</option>
                {programs.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </span>
          </div>
        </section>
      )}

      <section className="panel p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="icon-box">
            <Calendar size={20} />
          </span>
          <div>
            <h2 className="font-extrabold text-white">Szczegóły treningu</h2>
            <p className="text-sm text-slate-500">Nazwa, termin i charakter sesji</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="field-label sm:col-span-2">
            Nazwa treningu
            <input
              className="input"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="np. Push — klatka i barki"
              required
            />
          </label>
          <label className="field-label">
            Data
            <span className="input-shell">
              <Calendar size={17} />
              <input
                name="date"
                type="date"
                defaultValue={initial?.date ?? new Date().toISOString().slice(0, 10)}
                required
              />
            </span>
          </label>
          <label className="field-label">
            Czas trwania
            <span className="input-shell">
              <Clock3 size={17} />
              <input name="durationMinutes" type="number" min="1" max="600" defaultValue={initial?.durationMinutes ?? 60} required  onFocus={(event) => event.target.select()} />
              <span className="text-xs text-slate-500">min</span>
            </span>
          </label>
          <label className="field-label">
            Status
            <span className="select-shell">
              <select name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="completed">Ukończony</option>
                <option value="planned">Zaplanowany</option>
              </select>
              <ChevronDown size={16} />
            </span>
          </label>
          <label className="field-label sm:col-span-2">
            Notatki
            <textarea
              className="input min-h-24 resize-y"
              name="notes"
              placeholder="Technika, samopoczucie, cele…"
              defaultValue={initial?.notes}
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Ćwiczenia i serie</h2>
            <p className="mt-1 text-sm text-slate-500">Każdą serię zapisujesz osobno.</p>
          </div>
          <button
            type="button"
            className="button-secondary"
            onClick={() => setRows((current) => [...current, makeExercise()])}
          >
            <Plus size={17} /> <span className="hidden sm:inline">Dodaj ćwiczenie</span>
          </button>
        </div>

        {rows.map((row, exerciseIndex) => (
          <article key={row.key} className="panel overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-white/[.06] p-5 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[.18em] text-lime-400">
                  Ćwiczenie {exerciseIndex + 1}
                </p>
                <div className="relative">
                  <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    className="input pl-10"
                    type="text"
                    placeholder="Szukaj ćwiczenia…"
                    value={row.query}
                    onChange={(event) => updateExercise(row.key, { query: event.target.value })}
                  />
                  {row.query && (
                    <button
                      type="button"
                      onClick={() => updateExercise(row.key, { query: "" })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      aria-label="Wyczyść"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Wybrane ćwiczenie */}
                {!row.query && row.definitionId > 0 && (
                  <p className="mt-2 flex items-center gap-2 rounded-lg bg-lime-400/[.06] px-3 py-2 text-sm font-bold text-lime-300">
                    <Check size={14} /> {row.name}
                  </p>
                )}

                {/* Podpowiedzi */}
                {row.query.trim().length >= 2 && (
                  <div className="absolute z-20 mt-1 max-h-56 w-full space-y-1 overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-[#11171f] p-2 shadow-2xl">
                    {library
                      .filter((item) => matchesWords(item.name, row.query))
                      .slice(0, 8)
                      .map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            updateExercise(row.key, { definitionId: item.id, name: item.name, query: "" });
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-white/5"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-white">{item.name}</span>
                            <span className="text-[10px] text-slate-500">{item.muscleGroup}</span>
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-500">{item.equipment}</span>
                        </button>
                      ))}
                    {library.filter((item) => matchesWords(item.name, row.query)).length === 0 && (
                      <p className="px-3 py-2 text-sm text-slate-500">Brak ćwiczeń pasujących do zapytania.</p>
                    )}
                  </div>
                )}
              </div>
              <label className="field-label w-full sm:w-28">
                Liczba serii
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="20"
                  value={row.sets.length}
                  onChange={(event) => resizeSets(row.key, Number(event.target.value))} onFocus={(event) => event.target.select()} />
              </label>
              <label className="field-label w-full sm:w-32">
                Przerwa (sek.)
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={row.restSeconds}
                  onChange={(event) => updateExercise(row.key, { restSeconds: Number(event.target.value) })} onFocus={(event) => event.target.select()} />
              </label>
              <button
                type="button"
                disabled={rows.length === 1}
                onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                className="icon-button mb-1 hover:!text-rose-300 disabled:opacity-20"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="set-table">
                <thead>
                  <tr>
                    <th>Seria</th>
                    <th>Powtórzenia</th>
                    <th>Ciężar (kg)</th>
                    <th>RIR</th>
                    <th>Notatka</th>
                    <th>Wykonana</th>
                  </tr>
                </thead>
                <tbody>
                  {row.sets.map((set, index) => (
                    <tr key={set.key} className={set.completed ? "set-completed" : ""}>
                      <td>
                        <span className="set-number">{index + 1}</span>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          aria-label={`Powtórzenia seria ${index + 1}`}
                          value={set.reps}
                          onChange={(event) =>
                            updateSet(row.key, set.key, { reps: Number(event.target.value) })
                          } onFocus={(event) => event.target.select()} />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          aria-label={`Ciężar seria ${index + 1}`}
                          value={set.weight}
                          onChange={(event) =>
                            updateSet(row.key, set.key, { weight: Number(event.target.value) })
                          } onFocus={(event) => event.target.select()} />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          placeholder="—"
                          aria-label={`RIR seria ${index + 1}`}
                          value={set.rir ?? ""}
                          onChange={(event) =>
                            updateSet(row.key, set.key, {
                              rir: event.target.value === "" ? null : Number(event.target.value),
                            })
                          } onFocus={(event) => event.target.select()} />
                      </td>
                      <td>
                        <input
                          type="text"
                          maxLength={200}
                          placeholder="Notatka…"
                          aria-label={`Notatka seria ${index + 1}`}
                          className="note-input"
                          value={set.note}
                          onChange={(event) =>
                            updateSet(row.key, set.key, { note: event.target.value })
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => updateSet(row.key, set.key, { completed: !set.completed })}
                          className={`complete-toggle ${set.completed ? "complete-toggle-on" : ""}`}
                          aria-label="Oznacz serię jako wykonaną"
                        >
                          {set.completed ? <Check size={18} /> : <span className="size-[18px] rounded-full border-2 border-current" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </section>

      {state?.error && (
        <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
          {state.error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <SubmitButton pendingLabel="Zapisywanie…">
          {mode === "create" ? "Zaplanuj trening" : "Zapisz zmiany"}
        </SubmitButton>
      </div>
    </form>
  );
}
