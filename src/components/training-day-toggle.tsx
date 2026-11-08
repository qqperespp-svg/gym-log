"use client";

import { useState, useTransition } from "react";
import { Dumbbell, Sofa } from "lucide-react";
import { toggleTrainingDayAction } from "@/actions/diet";

/** Szybki przełącznik „dzień treningowy / dzień wolny” na dziś — zapisuje od razu,
 *  nie zmieniając reszty celu ani harmonogramu treningów. */
export function TrainingDayToggle({
  trainingDay,
  weekday,
}: {
  trainingDay: boolean;
  weekday: number;
}) {
  const [value, setValue] = useState(trainingDay);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const next = await toggleTrainingDayAction(weekday);
      setValue(next === 1);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={value}
      title="Przełącz: dzień treningowy / dzień wolny"
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition disabled:cursor-wait disabled:opacity-60 ${
        value
          ? "bg-lime-400/15 text-lime-300 ring-lime-400/40 hover:bg-lime-400/25"
          : "bg-white/[.04] text-slate-400 ring-white/10 hover:text-slate-200"
      }`}
    >
      {value ? <Dumbbell size={13} /> : <Sofa size={13} />}
      {value ? "Dzień treningowy" : "Dzień wolny"}
    </button>
  );
}
