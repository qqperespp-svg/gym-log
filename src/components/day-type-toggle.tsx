"use client";

import { useTransition } from "react";
import { Dumbbell, LoaderCircle, Sofa } from "lucide-react";
import { setDayTypeAction } from "@/actions/diet";

/**
 * Przełącznik typu dnia („Dzień treningowy" ⇄ „Dzień wolny") dla wskazanego dnia
 * tygodnia. Po kliknięciu zapisuje nowy typ i podmienia cel makro/kcal na ten
 * przypisany do wybranego typu dnia — kafelek „Dzisiaj" odświeża się od razu.
 */
export function DayTypeToggle({
  weekday,
  training,
  label = "Przełącz typ dnia — cel makro i kcal zmienią się na przypisane do tego typu",
}: {
  weekday: number;
  training: boolean;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={training}
      title={label}
      onClick={() =>
        startTransition(async () => {
          await setDayTypeAction(weekday, !training);
        })
      }
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition disabled:opacity-60 ${
        training
          ? "bg-lime-400/15 text-lime-300 ring-lime-400/40 hover:bg-lime-400/25"
          : "bg-white/[.04] text-slate-400 ring-white/10 hover:text-slate-200"
      }`}
    >
      {pending ? (
        <LoaderCircle size={13} className="animate-spin" />
      ) : training ? (
        <Dumbbell size={13} />
      ) : (
        <Sofa size={13} />
      )}
      {training ? "Dzień treningowy" : "Dzień wolny"}
    </button>
  );
}
