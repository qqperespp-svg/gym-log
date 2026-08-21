"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Check, Dumbbell, GripVertical, Plus, Save, Search, Trash2, X } from "lucide-react";
import type { ProgramFormState } from "@/actions/programs";
import { SubmitButton } from "@/components/submit-button";
import { matchesWords } from "@/lib/search";

type LibraryItem = { id: number; name: string; muscleGroup: string; equipment: string };
type Row = {
  key: string;
  definitionId: number;
  name: string;
  query: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  restSeconds: number;
};
type Initial = { name: string; description: string; exercises: Omit<Row, "key" | "query">[] };

const emptyRow = (): Row => ({
  key: crypto.randomUUID(),
  definitionId: 0,
  name: "",
  query: "",
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
    initial?.exercises.map((item) => ({ ...item, key: crypto.randomUUID(), query: "" })) ?? [emptyRow()],
  );
  const groups = useMemo(
    () => Array.from(new Set(library.map((item) => item.muscleGroup))).sort((a, b) => a.localeCompare(b, "pl")),
    [library],
  );
  const update = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  const serialized = rows.map(({ key: _key, query: _q, ...item }) => ({
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
                <div className="relative sm:col-span-2 lg:col-span-3">
                  <label className="field-label">
                    Ćwiczenie
                    <div className="relative">
                      <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        className="input pl-10"
                        type="text"
                        placeholder="Szukaj ćwiczenia…"
                        value={row.query}
                        onChange={(event) => update(row.key, { query: event.target.value })}
                      />
                      {row.query && (
                        <button
                          type="button"
                          onClick={() => update(row.key, { query: "" })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                          aria-label="Wyczyść"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  </label>

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
                              update(row.key, { definitionId: item.id, name: item.name, query: "" });
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
                <label className="field-label">
                  Serie
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="20"
                    value={row.targetSets}
                    onChange={(event) => update(row.key, { targetSets: Number(event.target.value) })} onFocus={(event) => event.target.select()} />
                </label>
                <label className="field-label">
                  Powtórzenia
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={row.targetReps}
                    onChange={(event) => update(row.key, { targetReps: Number(event.target.value) })} onFocus={(event) => event.target.select()} />
                </label>
                <label className="field-label">
                  Ciężar startowy
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.1"
                    value={row.targetWeight}
                    onChange={(event) => update(row.key, { targetWeight: Number(event.target.value) })} onFocus={(event) => event.target.select()} />
                </label>
                <label className="field-label sm:col-span-2 lg:col-span-2">
                  Przerwa (sek.)
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={row.restSeconds}
                    onChange={(event) => update(row.key, { restSeconds: Number(event.target.value) })} onFocus={(event) => event.target.select()} />
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
