"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { CalendarPlus, Dumbbell, Edit3, FileDown, Layers3, Plus, Trash2 } from "lucide-react";
import { deleteProgramAction } from "@/actions/programs";

type Item = { id: number; name: string; description: string; exerciseCount: number; totalSets: number };

export function ProgramList({ programs }: { programs: Item[] }) {
  const [items, removeOptimistic] = useOptimistic(programs, (current, id: number) =>
    current.filter((item) => item.id !== id),
  );
  const [, startTransition] = useTransition();
  function remove(id: number) {
    if (!window.confirm("Usunąć program? Zaplanowane wcześniej treningi pozostaną bez zmian.")) return;
    startTransition(async () => {
      removeOptimistic(id);
      await deleteProgramAction(id);
    });
  }
  if (!items.length)
    return (
      <div className="empty-state">
        <span className="empty-icon">
          <Layers3 size={30} />
        </span>
        <h3>Nie masz jeszcze programu</h3>
        <p>Zapisz zestaw ćwiczeń raz, a potem dodawaj cały plan do kalendarza jednym kliknięciem.</p>
        <Link className="button-primary" href="/programs/new">
          <Plus size={17} /> Utwórz program
        </Link>
      </div>
    );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {items.map((item) => (
        <article key={item.id} className="panel p-5">
          <div className="mb-5 flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-lime-400/10 text-lime-400">
              <Layers3 size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-extrabold text-white">{item.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                {item.description || "Bez opisu"}
              </p>
            </div>
            <button onClick={() => remove(item.id)} className="icon-button hover:!text-rose-300">
              <Trash2 size={17} />
            </button>
          </div>
          <div className="mb-5 flex gap-6 rounded-xl bg-black/20 px-4 py-3 text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <Dumbbell size={15} className="text-lime-400" />
              <b className="text-white">{item.exerciseCount}</b> ćwiczeń
            </span>
            <span>
              <b className="text-white">{item.totalSets}</b> serii
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/workouts/new?program=${item.id}`} className="button-primary flex-1 justify-center text-sm">
              <CalendarPlus size={16} /> Zaplanuj
            </Link>
            <Link href={`/programs/${item.id}/edit`} className="button-secondary text-sm">
              <Edit3 size={16} /> Edytuj
            </Link>
            <Link href={`/programs/${item.id}/print`} className="button-secondary text-sm">
              <FileDown size={16} /> PDF
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
