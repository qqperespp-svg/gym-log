"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Dumbbell,
  LoaderCircle,
  Plus,
  Save,
  Trophy,
} from "lucide-react";
import { useFormStatus } from "react-dom";
import type { SessionFormState } from "@/actions/workouts";

type SetRow = {
  id: number;
  setNumber: number;
  reps: number;
  weight: number;
  rir: number | null;
  note: string | null;
  completed: boolean;
};
type ExerciseRow = { id: number; name: string; restSeconds: number; grp: string | null; sets: SetRow[] };
type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

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

function normalizeDraftItems(value: unknown): ExerciseRow[] | null {
  if (!Array.isArray(value)) return null;
  const rows: ExerciseRow[] = [];
  for (const rawRow of value) {
    if (!rawRow || typeof rawRow !== "object") continue;
    const row = rawRow as Record<string, unknown>;
    const id = Number(row.id);
    if (!Number.isInteger(id) || !Array.isArray(row.sets)) continue;
    const sets: SetRow[] = [];
    for (const [index, rawSet] of row.sets.entries()) {
      if (!rawSet || typeof rawSet !== "object") continue;
      const set = rawSet as Record<string, unknown>;
      const setId = Number(set.id);
      const setNumber = Number(set.setNumber);
      sets.push({
        id: Number.isInteger(setId) ? setId : 0,
        setNumber: Number.isInteger(setNumber) && setNumber > 0 ? setNumber : index + 1,
        reps: Number.isFinite(Number(set.reps)) ? Number(set.reps) : 0,
        weight: Number.isFinite(Number(set.weight)) ? Number(set.weight) : 0,
        rir: set.rir == null || set.rir === "" ? null : Number(set.rir),
        note: set.note == null ? null : String(set.note),
        completed: Boolean(set.completed),
      });
    }
    rows.push({
      id,
      name: String(row.name ?? "Ćwiczenie"),
      restSeconds: Number.isFinite(Number(row.restSeconds)) ? Number(row.restSeconds) : 90,
      grp: row.grp == null ? null : String(row.grp),
      sets,
    });
  }
  return rows.length ? rows : null;
}

function readWorkoutDraft(key: string): ExerciseRow[] | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { items?: unknown };
    return normalizeDraftItems(parsed.items);
  } catch {
    return null;
  }
}

function sessionDataValue(items: ExerciseRow[]): string {
  return JSON.stringify(
    items.flatMap((exercise) =>
      exercise.sets.map((set) => ({
        id: set.id,
        exerciseId: exercise.id,
        setNumber: set.setNumber,
        reps: set.reps,
        weight: set.weight,
        rir: set.rir,
        note: set.note,
        completed: set.completed,
      })),
    ),
  );
}

function sessionFormData(items: ExerciseRow[]): FormData {
  const data = new FormData();
  data.set("sessionData", sessionDataValue(items));
  data.set("intent", "save");
  return data;
}

export function WorkoutSession({
  action,
  initial,
  workoutId,
}: {
  action: (state: SessionFormState, formData: FormData) => Promise<SessionFormState>;
  initial: ExerciseRow[];
  workoutId: number;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [items, setItems] = useState(initial);
  const [draftReady, setDraftReady] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const [, startAutosaveTransition] = useTransition();
  const pendingSnapshot = useRef<ExerciseRow[] | null>(null);
  const latestSnapshot = useRef<ExerciseRow[] | null>(null);
  const latestItems = useRef(initial);
  const autosavePromise = useRef<Promise<void> | null>(null);
  const draftKey = `gymrat-workout-session-${workoutId}`;

  const queueAutosave = useCallback((snapshot: ExerciseRow[]) => {
    latestSnapshot.current = snapshot;
    pendingSnapshot.current = snapshot;
    if (autosavePromise.current) return;

    startAutosaveTransition(() => {
      const run = async () => {
        while (pendingSnapshot.current) {
          const nextSnapshot = pendingSnapshot.current;
          pendingSnapshot.current = null;
          setAutoSaveStatus("saving");
          try {
            const result = await action(undefined, sessionFormData(nextSnapshot));
            setAutoSaveStatus(result?.error ? "error" : "saved");
          } catch {
            setAutoSaveStatus("error");
          }
        }
      };
      const promise = run();
      autosavePromise.current = promise;
      void promise
        .finally(() => {
          if (autosavePromise.current === promise) autosavePromise.current = null;
        })
        .catch(() => {});
    });
  }, [action, startAutosaveTransition]);

  // Przywróć ostatni lokalny szkic po przeładowaniu strony, np. gdy telefon
  // uśpił kartę podczas treningu. Robimy to po hydracji, aby nie powodować
  // różnicy między HTML-em serwera i pierwszym renderem klienta.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = readWorkoutDraft(draftKey);
      if (draft) {
        latestItems.current = draft;
        setItems(draft);
        setDraftRestored(true);
        // Jeżeli poprzedni autosave nie zdążył dojść do serwera przed
        // przeładowaniem, spróbuj zsynchronizować odzyskany szkic od razu.
        queueAutosave(draft);
      }
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [draftKey, queueAutosave]);

  // Lokalny zapis działa niezależnie od połączenia z serwerem. Serwerowy
  // autosave jest dodatkową kopią wykonywaną po oznaczeniu serii.
  useEffect(() => {
    if (!draftReady) return;
    try {
      window.localStorage.setItem(draftKey, JSON.stringify({ savedAt: Date.now(), items }));
    } catch {
      // Brak miejsca lub prywatny tryb przeglądarki — zapis serwerowy nadal działa.
    }
  }, [draftKey, draftReady, items]);

  function retryAutosave() {
    if (latestSnapshot.current) queueAutosave(latestSnapshot.current);
  }

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

  function updateSet(exerciseId: number, setId: number, patch: Partial<SetRow>) {
    const currentExercise = items.find((exercise) => exercise.id === exerciseId);
    const currentSet = currentExercise?.sets.find((set) => set.id === setId);
    if (!currentSet) return;
    const next = items.map((exercise) =>
      exercise.id === exerciseId
        ? {
            ...exercise,
            sets: exercise.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
          }
        : exercise,
    );
    setItems(next);
    // Kliknięcie „wykonana” zapisuje cały aktualny stan, w tym wpisane chwilę
    // wcześniej powtórzenia, ciężar, RIR i notatkę.
    if (patch.completed !== undefined && patch.completed !== currentSet.completed) {
      queueAutosave(next);
    }
  }

  function addSet(exerciseId: number) {
    const currentExercise = items.find((exercise) => exercise.id === exerciseId);
    if (!currentExercise || currentExercise.sets.length >= 20) return;
    const last = currentExercise.sets.at(-1);
    const setNumber = Math.max(0, ...currentExercise.sets.map((set) => set.setNumber)) + 1;
    const temporaryIds = items
      .flatMap((exercise) => exercise.sets.map((set) => set.id))
      .filter((id) => id < 0);
    const temporaryId = temporaryIds.length ? Math.min(...temporaryIds) - 1 : -1;
    const newSet: SetRow = {
      id: temporaryId,
      setNumber,
      reps: last?.reps ?? 10,
      weight: last?.weight ?? 0,
      rir: null,
      note: null,
      completed: false,
    };
    const next = items.map((exercise) =>
      exercise.id === exerciseId ? { ...exercise, sets: [...exercise.sets, newSet] } : exercise,
    );
    setItems(next);
    // Seria jest dodawana tylko do kopii ćwiczenia w tym treningu, nie do
    // programu treningowego. Zapis od razu pozwala bezpiecznie przeładować kartę.
    queueAutosave(next);
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="sessionData" value={sessionDataValue(items)} />
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
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              {autoSaveStatus === "saving" && <span className="text-slate-400">Autosave: zapisuję postęp…</span>}
              {autoSaveStatus === "saved" && <span className="text-lime-300">Autosave: zapisano po zmianie serii ✓</span>}
              {autoSaveStatus === "error" && (
                <span className="flex items-center gap-2 text-amber-300">
                  Autosave czeka na połączenie.
                  <button type="button" onClick={retryAutosave} className="font-bold underline underline-offset-2">
                    Spróbuj ponownie
                  </button>
                </span>
              )}
              {draftRestored && <span className="text-sky-300">Przywrócono lokalny szkic treningu.</span>}
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
            <div className="min-w-0 flex-1">
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
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <span className="hidden text-xs text-slate-500 sm:block">Przerwa {exercise.restSeconds}s</span>
              <button
                type="button"
                onClick={() => addSet(exercise.id)}
                disabled={exercise.sets.length >= 20}
                title="Dodaj serię tylko do bieżącego treningu"
                className="button-secondary px-3 py-2 text-xs text-lime-300 disabled:opacity-40"
              >
                <Plus size={14} /> Dodaj serię
              </button>
            </div>
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
                {exercise.sets.map((set) => (
                  <tr key={`${exercise.id}-${set.setNumber}`} className={set.completed ? "set-completed" : ""}>
                    <td>
                      <span className="set-number">{set.setNumber}</span>
                    </td>
                    <td>
                      <input
                        aria-label={`Powtórzenia seria ${set.setNumber}`}
                        type="number"
                        min="0"
                        value={set.reps}
                        onChange={(event) =>
                          updateSet(exercise.id, set.id, { reps: Number(event.target.value) })
                        }
                        onFocus={(event) => event.target.select()}
                      />
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
                        }
                        onFocus={(event) => event.target.select()}
                      />
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
                        }
                        onFocus={(event) => event.target.select()}
                      />
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
                        onClick={() => updateSet(exercise.id, set.id, { completed: !set.completed })}
                        className={`complete-toggle ${set.completed ? "complete-toggle-on" : ""}`}
                        aria-label="Oznacz serię jako wykonaną"
                      >
                        {set.completed ? <Check size={18} /> : <Circle size={18} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
