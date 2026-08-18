"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { ChevronDown, Dumbbell, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import type { ProgramFormState } from "@/actions/programs";
import { SubmitButton } from "@/components/submit-button";

type LibraryItem = { id: number; name: string; muscleGroup: string; equipment: string };
type Row = {
  key: string;
  definitionId: number;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  restSeconds: number;
};
type Initial = { name: string; description: string; exercises: Omit<Row, "key">[] };

const emptyRow = (): Row => ({
  key: crypto.randomUUID(),
  definitionId: 0,
  name: "",
  targetSets: 3,
  targetReps: 10,
  targetWeight: 0,
  restSeconds: 90,
});

export function ProgramForm({
  action,
  library,
  initial,
  mode,
}: {
  action: (state: ProgramFormState, formData: FormData) => Promise<ProgramFormState>;
  library: LibraryItem[];
  initial?: Initial;
  mode: "create" | "edit";
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [rows, setRows] = useState<Row[]>(
    initial?.exercises.map((item) => ({ ...item, key: crypto.randomUUID() })) ?? [emptyRow()],
  );
  const groups = useMemo(
    () => Array.from(new Set(library.map((item) => item.muscleGroup))).sort((a, b) => a.localeCompare(b, "pl")),
    [library],
  );
  const update = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  const serialized = rows.map(({ key: _key, ...item }) => ({
    ...item,
    definitionId: item.definitionId || null,
  }));

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="programData" value={JSON.stringify(serialized)} />
      <section className="panel p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="icon-box">
            <Dumbbell size={20} />
          </span>
          <div>
            <h2 className="font-extrabold text-white">Informacje o programie</h2>
            <p className="text-sm text-slate-500">Zestaw gotowy do użycia w planie</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="field-label">
            Nazwa programu
            <input className="input" name="name" defaultValue={initial?.name} placeholder="np. Push A — siła" required />
          </label>
          <label className="field-label sm:col-span-2">
            Opis
            <textarea
              className="input min-h-24 resize-y"
              name="description"
              defaultValue={initial?.description}
              placeholder="Cel programu, wskazówki, częstotliwość…"
            />
          </label>
        </div>
      </section>
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[.06] p-5 sm:p-7">
          <div>
            <h2 className="font-extrabold text-white">Zestaw ćwiczeń</h2>
            <p className="mt-1 text-sm text-slate-500">{rows.length} pozycji w programie</p>
          </div>
          <button
            type="button"
            className="button-secondary"
            onClick={() => setRows((current) => [...current, emptyRow()])}
          >
            <Plus size={17} /> Dodaj
          </button>
        </div>
        <div className="space-y-3 p-4 sm:p-7">
          {rows.map((row, index) => (
            <article key={row.key} className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical size={16} className="text-slate-700" />
                  <span className="text-xs font-black uppercase tracking-[.16em] text-lime-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={rows.length === 1}
                  onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                  className="icon-button hover:!text-rose-300 disabled:opacity-20"
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                <label className="field-label sm:col-span-2 lg:col-span-3">
                  Ćwiczenie
                  <span className="select-shell">
                    <select
                      value={row.definitionId}
                      onChange={(event) => {
                        const id = Number(event.target.value);
                        const selected = library.find((item) => item.id === id);
                        update(row.key, { definitionId: id, name: selected?.name ?? "" });
                      }}
                      required
                    >
                      <option value={0}>Wybierz ćwiczenie</option>
                      {groups.map((group) => (
                        <optgroup key={group} label={group}>
                          {library
                            .filter((item) => item.muscleGroup === group)
                            .map((item) => (
                              <option value={item.id} key={item.id}>
                                {item.name}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown size={16} />
                  </span>
                </label>
                <label className="field-label">
                  Serie
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="20"
                    value={row.targetSets}
                    onChange={(event) => update(row.key, { targetSets: Number(event.target.value) })}
                  />
                </label>
                <label className="field-label">
                  Powtórzenia
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={row.targetReps}
                    onChange={(event) => update(row.key, { targetReps: Number(event.target.value) })}
                  />
                </label>
                <label className="field-label">
                  Ciężar startowy
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.1"
                    value={row.targetWeight}
                    onChange={(event) => update(row.key, { targetWeight: Number(event.target.value) })}
                  />
                </label>
                <label className="field-label sm:col-span-2 lg:col-span-2">
                  Przerwa (sek.)
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={row.restSeconds}
                    onChange={(event) => update(row.key, { restSeconds: Number(event.target.value) })}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>
      {state?.error && (
        <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
          {state.error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/programs" className="button-secondary justify-center">
          Anuluj
        </Link>
        <SubmitButton>
          <Save size={17} /> {mode === "create" ? "Zapisz program" : "Zapisz zmiany"}
        </SubmitButton>
      </div>
    </form>
  );
}
