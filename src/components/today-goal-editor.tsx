"use client";

import { useState } from "react";
import { Dumbbell, Sofa } from "lucide-react";
import { updateTodayGoalAction } from "@/actions/diet";

export function TodayGoalEditor({ weekday, goal, training }: { weekday: number; goal: { protein: number; fat: number; carbs: number }; training: boolean }) {
  const [values, setValues] = useState({ protein: String(goal.protein), fat: String(goal.fat), carbs: String(goal.carbs) });
  const saveField = (field: keyof typeof values, value: string, form: HTMLFormElement) => {
    setValues((current) => ({ ...current, [field]: value }));
    window.clearTimeout(Number(form.dataset.saveTimer ?? 0));
    const timer = window.setTimeout(() => form.requestSubmit(), 500);
    form.dataset.saveTimer = String(timer);
  };
  const submit = (trainingValue: string, form: HTMLFormElement) => {
    form.querySelector<HTMLInputElement>('input[name="training"]')!.value = trainingValue;
    form.requestSubmit();
  };
  return <form action={updateTodayGoalAction} className="contents">
    <input type="hidden" name="weekday" value={weekday} />
    <input type="hidden" name="training" value={training ? "1" : "0"} />
    <input className="input !min-h-8 !w-14 !px-1 text-center text-[10px]" name="protein" type="number" step="0.1" value={values.protein} onChange={(e) => saveField("protein", e.target.value, e.currentTarget.form!)} aria-label="Białko dziś" />
    <input className="input !min-h-8 !w-14 !px-1 text-center text-[10px]" name="fat" type="number" step="0.1" value={values.fat} onChange={(e) => saveField("fat", e.target.value, e.currentTarget.form!)} aria-label="Tłuszcze dziś" />
    <input className="input !min-h-8 !w-14 !px-1 text-center text-[10px]" name="carbs" type="number" step="0.1" value={values.carbs} onChange={(e) => saveField("carbs", e.target.value, e.currentTarget.form!)} aria-label="Węglowodany dziś" />
    <button type="button" onClick={(e) => submit(training ? "0" : "1", e.currentTarget.form!)} className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${training ? "bg-lime-400/15 text-lime-300 ring-1 ring-lime-400/40" : "bg-white/[.04] text-slate-400 ring-1 ring-white/10"}`}>
      {training ? <Dumbbell size={13} /> : <Sofa size={13} />}{training ? "Dzień treningowy" : "Dzień nietreningowy"}
    </button>
  </form>;
}
