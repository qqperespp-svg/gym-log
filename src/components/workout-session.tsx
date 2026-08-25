"use client";

import Link from "next/link";
import { useActionState, useCallback, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  Circle,
  CloudUpload,
  Dumbbell,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  Trophy,
} from "lucide-react";
import { useFormStatus } from "react-dom";
import type {
  AddSetResult,
  AutosaveResult,
  RemoveSetResult,
  SessionFormState,
} from "@/actions/workouts";

type SetRow = {
  id: number;
  setNumber: number;
  reps: number;
  weight: number;
  rir: number | null;
  note: string | null;
  completed: boolean;
  isExtra: boolean;
};
type ExerciseRow = { id: number; name: string; restSeconds: number; grp: string | null; sets: SetRow[] };
type SaveStatus =
  | { status: "idle" }
  | { status: "dirty" }
  | { status: "saving" }
  | { status: "saved"; at: number }
  | { status: "error"; message: string };

function SessionButtons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button name="intent" value="save" disabled={pending} className="button-secondary justify-center">
        {pending ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />} Zapisz postęp
      </button>
      <button name="intent" value="finish" disabled={pending} className="button-primary justify-center">
        {pending ? <LoaderCircle className="animate-spin" size={17} /> : <Trophy size={17} />} Zakończ trening
      </button>
    </div>
  );
}

function AutosaveBadge({ state }: { state: SaveStatus }) {
  if (state.status === "idle") return null;
  const base = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold";
  if (state.status === "saving")
    return (
      <span className={`${base} bg-white/[.06] text-slate-300`}>
        <LoaderCircle className="animate-spin" size={13} /> Autozapis…
      </span>
    );
  if (state.status === "saved")
    return (
      <span className={`${base} bg-lime-400/10 text-lime-300`}>
        <CloudUpload size={13} /> Zapisano{" "}
        {new Date(state.at).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
      </span>
    );
  if (state.status === "dirty")
    return <span className={`${base} bg-amber-400/10 text-amber-300`}>Niezapisane zmiany</span>;
  return <span className={`${base} bg-rose-400/10 text-rose-300`}>{state.message}</span>;
}

export function WorkoutSession({
  action,
  autosave,
  addSet,
  removeSet,
  initial,
}: {
  action: (state: SessionFormState, formData: FormData) => Promise<SessionFormState>;
  autosave: (
    rows: Array<{
      id: number;
      reps: number;
      weight: number;
      rir: number | null;
      note: string | null;
      completed: boolean;
    }>,
  ) => Promise<AutosaveResult>;
  addSet: (exerciseId: number) => Promise<AddSetResult>;
  removeSet: (setId: number) => Promise<RemoveSetResult>;
  initial: ExerciseRow[];
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [items, setItems] = useState(initial);
  const [saveState, setSaveState] = useState<SaveStatus>({ status: "idle" });
  const [busyExerciseId, setBusyExerciseId] = useState<number | null>(null);
  const [busySetId, setBusySetId] = useState<number | null>(null);
  const saveSeq = useRef(0);
  const allSets = items.flatMap((item) => item.sets);
  const completed = allSets.filter((set) => set.completed).length;
  const progress = allSets.length ? Math.round((completed / allSets.length) * 100) : 0;
  const volume = useMemo(
    () =>
      allSets
        .filter((set) => set.completed)
        .reduce((sum, set) => sum + set.reps * set.weight, 0),
    [allSets],
  );

  /** Autozapis — wysyła aktualny stan wszystkich serii na serwer. */
  const runAutosave = useCallback(
    async (rows: SetRow[]) => {
      const seq = ++saveSeq.current;
      setSaveState({ status: "saving" });
      try {
        const result = await autosave(
          rows.map(({ id, reps, weight, rir, note, completed: done }) => ({
            id,
            reps,
            weight,
            rir,
            note,
            completed: done,
          })),
        );
        if (seq !== saveSeq.current) return;
        if ("error" in result) setSaveState({ status: "error", message: result.error });
        else setSaveState({ status: "saved", at: result.savedAt });
      } catch {
        if (seq === saveSeq.current)
          setSaveState({ status: "error", message: "Autozapis nieudany — zapisz ręcznie." });
      }
    },
    [autosave],
  );

  const updateSet = (exerciseId: number, setId: number, patch: Partial<SetRow>) => {
    setItems((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
            }
          : exercise,
      ),
    );
    setSaveState((current) => (current.status === "saving" ? current : { status: "dirty" }));
  };

  /** Oznaczenie serii jako wykonanej/niewykonanej + natychmiastowy autozapis. */
  const toggleCompleted = (exerciseId: number, setId: number) => {
    const next = items.map((exercise) =>
      exercise.id === exerciseId
        ? {
            ...exercise,
            sets: exercise.sets.map((set) =>
              set.id === setId ? { ...set, completed: !set.completed } : set,
            ),
          }
        : exercise,
    );
    setItems(next);
    void runAutosave(next.flatMap((exercise) => exercise.sets));
  };

  /** Dodanie serii w trakcie treningu — plan treningowy pozostaje bez zmian. */
  const handleAddSet = async (exerciseId: number) => {
    setBusyExerciseId(exerciseId);
    try {
      const result = await addSet(exerciseId);
      if ("error" in result) {
        setSaveState({ status: "error", message: result.error });
        return;
      }
      const created = result.set;
      const savedAt = result.savedAt;
      setItems((current) =>
        current.map((exercise) =>
          exercise.id === exerciseId
            ? { ...exercise, sets: [...exercise.sets, created] }
            : exercise,
        ),
      );
      setSaveState({ status: "saved", at: savedAt });
    } catch {
      setSaveState({ status: "error", message: "Nie udało się dodać serii." });
    } finally {
      setBusyExerciseId(null);
    }
  };

  /** Usunięcie dodatkowej serii (serie z planu są nieusuwalne w tym trybie). */
  const handleRemoveSet = async (exerciseId: number, setId: number) => {
    setBusySetId(setId);
    try {
      const result = await removeSet(setId);
      if ("error" in result) {
        setSaveState({ status: "error", message: result.error });
        return;
      }
      setItems((current) =>
        current.map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                sets: exercise.sets
                  .filter((set) => set.id !== setId)
                  .map((set, index) => ({ ...set, setNumber: index + 1 })),
              }
            : exercise,
        ),
      );
      setSaveState({ status: "saved", at: result.savedAt });
    } catch {
      setSaveState({ status: "error", message: "Nie udało się usunąć serii." });
    } finally {
      setBusySetId(null);
    }
  };

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="sessionData" value={JSON.stringify(allSets)} />
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-bold text-white">Postęp treningu</span>
              <span className="text-lime-400">
                {completed}/{allSets.length} serii
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[.06]">
              <div className="h-full rounded-full bg-lime-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-3 min-h-6">
              <AutosaveBadge state={saveState} />
            </div>
          </div>
          <div className="flex shrink-0 gap-6 text-center">
            <div>
              <b className="block text-lg text-white">{progress}%</b>
              <span className="text-[10px] uppercase tracking-wider text-slate-600">wykonano</span>
            </div>
            <div>
              <b className="block text-lg text-white">{volume.toLocaleString("pl-PL")} kg</b>
              <span className="text-[10px] uppercase tracking-wider text-slate-600">objętość</span>
            </div>
          </div>
        </div>
      </section>

      {items.map((exercise, exerciseIndex) => (
        <section key={exercise.id} className="panel overflow-hidden">
          <div className="flex items-center gap-4 border-b border-white/[.06] p-5 sm:px-6">
            <span className="grid size-10 place-items-center rounded-xl bg-lime-400/10 text-lime-400">
              <Dumbbell size={19} />
            </span>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-600">
                Ćwiczenie {exerciseIndex + 1}
              </p>
              <h2 className="flex items-center gap-2 font-extrabold text-white">
                {exercise.name}
                {exercise.grp && (
                  <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-black text-sky-300 ring-1 ring-sky-400/30">
                    Superseria {exercise.grp}
                  </span>
                )}
              </h2>
            </div>
            <span className="hidden text-xs text-slate-500 sm:block">
              Przerwa {exercise.restSeconds}s
            </span>
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
                  <th aria-label="Akcje" />
                </tr>
              </thead>
              <tbody>
                {exercise.sets.map((set) => (
                  <tr key={set.id} className={set.completed ? "set-completed" : ""}>
                    <td>
                      <span className="inline-flex items-center gap-2">
                        <span className="set-number">{set.setNumber}</span>
                        {set.isExtra && (
                          <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
                            Extra
                          </span>
                        )}
                      </span>
                    </td>
                    <td>
                      <input
                        aria-label={`Powtórzenia seria ${set.setNumber}`}
                        type="number"
                        min="0"
                        value={set.reps}
                        onChange={(event) =>
                          updateSet(exercise.id, set.id, { reps: Number(event.target.value) })
                        } onFocus={(event) => event.target.select()} />
                    </td>
                    <td>
                      <input
                        aria-label={`Ciężar seria ${set.setNumber}`}
                        type="number"
                        min="0"
                        step="0.1"
                        value={set.weight}
                        onChange={(event) =>
                          updateSet(exercise.id, set.id, { weight: Number(event.target.value) })
                        } onFocus={(event) => event.target.select()} />
                    </td>
                    <td>
                      <input
                        aria-label={`RIR seria ${set.setNumber}`}
                        type="number"
                        min="0"
                        max="10"
                        placeholder="—"
                        value={set.rir ?? ""}
                        onChange={(event) =>
                          updateSet(exercise.id, set.id, {
                            rir: event.target.value === "" ? null : Number(event.target.value),
                          })
                        } onFocus={(event) => event.target.select()} />
                    </td>
                    <td>
                      <input
                        aria-label={`Notatka seria ${set.setNumber}`}
                        type="text"
                        maxLength={200}
                        placeholder="Notatka…"
                        className="note-input"
                        value={set.note ?? ""}
                        onChange={(event) =>
                          updateSet(exercise.id, set.id, { note: event.target.value })
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => toggleCompleted(exercise.id, set.id)}
                        disabled={saveState.status === "saving"}
                        className={`complete-toggle ${set.completed ? "complete-toggle-on" : ""}`}
                        aria-label="Oznacz serię jako wykonaną"
                        aria-pressed={set.completed}
                      >
                        {set.completed ? <Check size={18} /> : <Circle size={18} />}
                      </button>
                    </td>
                    <td>
                      {set.isExtra ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveSet(exercise.id, set.id)}
                          disabled={busySetId === set.id}
                          className="mx-auto grid size-9 place-items-center rounded-xl border border-white/10 text-slate-600 hover:border-rose-400/30 hover:text-rose-400 disabled:opacity-50"
                          aria-label={`Usuń dodatkową serię ${set.setNumber}`}
                          title="Usuń dodatkową serię"
                        >
                          {busySetId === set.id ? (
                            <LoaderCircle className="animate-spin" size={16} />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 border-t border-white/[.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-[11px] text-slate-600">
              Dodatkowe serie zapisują się tylko w tym treningu — plan pozostaje bez zmian.
            </p>
            <button
              type="button"
              onClick={() => handleAddSet(exercise.id)}
              disabled={busyExerciseId === exercise.id}
              className="button-secondary justify-center self-start px-4 py-2 text-xs disabled:opacity-50 sm:self-auto"
            >
              {busyExerciseId === exercise.id ? (
                <LoaderCircle className="animate-spin" size={15} />
              ) : (
                <Plus size={15} />
              )}
              Dodaj serię
            </button>
          </div>
        </section>
      ))}

      {state?.error && (
        <p className="rounded-xl bg-rose-400/10 p-4 text-sm text-rose-300">{state.error}</p>
      )}
      {state?.success && (
        <p className="flex items-center gap-2 rounded-xl bg-lime-400/10 p-4 text-sm text-lime-200">
          <CheckCircle2 size={17} /> {state.success}
        </p>
      )}

      <div className="flex flex-col gap-4 border-t border-white/[.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-white">
          <ChevronLeft size={17} /> Wróć do dashboardu
        </Link>
        <SessionButtons />
      </div>
    </form>
  );
}
