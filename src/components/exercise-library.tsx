"use client";

import Link from "next/link";
import { useActionState, useMemo, useOptimistic, useState, useTransition } from "react";
import { BicepsFlexed, Edit3, LibraryBig, Plus, Search, Trash2 } from "lucide-react";
import { createExerciseAction, deleteExerciseAction } from "@/actions/exercises";
import { SubmitButton } from "@/components/submit-button";

type Item = { id: number; name: string; muscleGroup: string; equipment: string; isCustom: number };
const muscleGroups = ["Klatka", "Plecy", "Nogi", "Pośladki", "Łydki", "Barki", "Biceps", "Triceps", "Brzuch", "Przedramiona", "Całe ciało", "Cardio", "Mobilność"];
const equipment = ["Sztanga", "Hantle", "Maszyna", "Wyciąg", "Drążek", "Kettlebell", "Masa ciała", "Gumy", "Obciążenie", "Inne"];

export function ExerciseLibrary({ exercises }: { exercises: Item[] }) {
  const [state, formAction] = useActionState(createExerciseAction, undefined);
  const [optimistic, removeOptimistic] = useOptimistic(exercises, (items, id: number) => items.filter((item) => item.id !== id));
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("Wszystkie");
  const [, startTransition] = useTransition();
  const groups = useMemo(() => ["Wszystkie", ...Array.from(new Set(optimistic.map((item) => item.muscleGroup))).sort((a, b) => a.localeCompare(b, "pl"))], [optimistic]);
  const visible = optimistic.filter((item) => (group === "Wszystkie" || item.muscleGroup === group) && item.name.toLocaleLowerCase("pl").includes(search.toLocaleLowerCase("pl")));
  function remove(id: number) { if (!window.confirm("Usunąć własne ćwiczenie? Zapisane treningi zachowają jego nazwę.")) return; startTransition(async () => { removeOptimistic(id); await deleteExerciseAction(id); }); }

  return <div className="grid items-start gap-6 xl:grid-cols-[360px_1fr]"><form action={formAction} className="panel p-6 xl:sticky xl:top-6"><div className="mb-6 flex items-center gap-3"><span className="icon-box"><Plus size={20} /></span><div><h2 className="font-extrabold text-white">Własne ćwiczenie</h2><p className="text-sm text-slate-500">Dodaj ruch spoza katalogu</p></div></div><div className="space-y-4"><label className="field-label">Nazwa<input className="input" name="name" placeholder="np. Wiosłowanie Pendlay" required /></label><label className="field-label">Partia mięśniowa<select className="input" name="muscleGroup" defaultValue="" required><option value="" disabled>Wybierz partię</option>{muscleGroups.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-label">Sprzęt<select className="input" name="equipment" defaultValue="Sztanga">{equipment.map((item) => <option key={item}>{item}</option>)}</select></label>{state?.error && <p className="rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300">{state.error}</p>}<SubmitButton pendingLabel="Dodawanie…" className="button-primary w-full justify-center"><Plus size={17} /> Dodaj do biblioteki</SubmitButton></div></form>
    <section><div className="mb-4"><h2 className="font-extrabold text-white">Katalog ćwiczeń</h2><p className="text-sm text-slate-500">{optimistic.length} ruchów · katalog bazowy i Twoje własne</p></div><div className="mb-5 flex flex-col gap-3 sm:flex-row"><span className="input-shell flex-1"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Szukaj ćwiczenia…" /></span><select className="input sm:w-52" value={group} onChange={(event) => setGroup(event.target.value)}>{groups.map((item) => <option key={item}>{item}</option>)}</select></div>{!visible.length ? <div className="empty-state"><span className="empty-icon"><LibraryBig size={30} /></span><h3>Brak wyników</h3><p>Zmień wyszukiwaną frazę lub filtr partii mięśniowej.</p></div> : <div className="grid gap-3 md:grid-cols-2">{visible.map((item) => <article key={item.id} className="panel flex items-center gap-4 p-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/[.04] text-lime-400"><BicepsFlexed size={20} /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-bold text-white">{item.name}</h3>{item.isCustom === 1 && <span className="rounded bg-sky-400/10 px-1.5 py-0.5 text-[8px] font-black uppercase text-sky-300">Własne</span>}</div><p className="mt-1 text-xs text-slate-500">{item.muscleGroup} <span className="mx-1 text-slate-700">•</span> {item.equipment}</p></div>{item.isCustom === 1 && <><Link href={`/exercises/${item.id}/edit`} className="icon-button"><Edit3 size={16} /></Link><button onClick={() => remove(item.id)} className="icon-button hover:!text-rose-300"><Trash2 size={16} /></button></>}</article>)}</div>}</section></div>;
}
