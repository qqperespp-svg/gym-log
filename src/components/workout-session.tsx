"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Dumbbell,
  LoaderCircle,
  Save,
  Trophy,
} from "lucide-react";
import { useFormStatus } from "react-dom";
import type { SessionFormState } from "@/actions/workouts";

type SetRow = { id: number; setNumber: number; reps: number; weight: number; rir: number | null; completed: boolean };
type ExerciseRow = { id: number; name: string; restSeconds: number; sets: SetRow[] };

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

export function WorkoutSession({
  action,
  initial,
}: {
  action: (state: SessionFormState, formData: FormData) => Promise<SessionFormState>;
  initial: ExerciseRow[];
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [items, setItems] = useState(initial);
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
  const updateSet = (exerciseId: number, setId: number, patch: Partial<SetRow>) =>
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
              <h2 className="font-extrabold text-white">{exercise.name}</h2>
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
                  <th>Wykonana</th>
                </tr>
              </thead>
              <tbody>
                {exercise.sets.map((set) => (
                  <tr key={set.id} className={set.completed ? "set-completed" : ""}>
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
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Ciężar seria ${set.setNumber}`}
                        type="number"
                        min="0"
                        value={set.weight}
                        onChange={(event) =>
                          updateSet(exercise.id, set.id, { weight: Number(event.target.value) })
                        }
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
