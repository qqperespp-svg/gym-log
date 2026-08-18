"use client";

import { useMemo, useState } from "react";
import { Beef, Croissant, Droplets, Save } from "lucide-react";
import { saveDietGoalsAction } from "@/actions/diet";
import type { DietGoal } from "@/db/schema";
import { WEEKDAYS, kcalFromMacros } from "@/lib/diet";
import { SubmitButton } from "@/components/submit-button";

type GoalValues = Record<number, { protein: string; fat: string; carbs: string }>;

function formatKcal(n: number): string {
  return n.toLocaleString("pl-PL");
}

export function DietGoalsForm({ goals }: { goals: DietGoal[] }) {
  const goalByWeekday = useMemo(
    () => new Map(goals.map((goal) => [goal.weekday, goal])),
    [goals],
  );
  const [values, setValues] = useState<GoalValues>(() =>
    Object.fromEntries(
      WEEKDAYS.map(({ n }) => {
        const goal = goalByWeekday.get(n);
        return [
          n,
          {
            protein: goal ? String(goal.protein) : "",
            fat: goal ? String(goal.fat) : "",
            carbs: goal ? String(goal.carbs) : "",
          },
        ];
      }),
    ),
  );

  const totalKcal = useMemo(() => {
    let sum = 0;
    for (const { n } of WEEKDAYS) {
      sum += kcalFromMacros(
        Number(values[n]?.protein) || 0,
        Number(values[n]?.fat) || 0,
        Number(values[n]?.carbs) || 0,
      );
    }
    return sum;
  }, [values]);

  function setField(n: number, field: "protein" | "fat" | "carbs", value: string) {
    setValues((current) => ({
      ...current,
      [n]: { ...current[n], [field]: value },
    }));
  }

  return (
    <form action={saveDietGoalsAction} className="space-y-6">
      <div className="space-y-3">
        {WEEKDAYS.map(({ n, label }) => {
          const kcal = kcalFromMacros(
            Number(values[n]?.protein) || 0,
            Number(values[n]?.fat) || 0,
            Number(values[n]?.carbs) || 0,
          );
          return (
            <div
              key={n}
              className="grid items-end gap-3 rounded-2xl border border-white/[.07] bg-black/15 p-4 sm:grid-cols-[1fr_repeat(3,minmax(0,1fr))_auto]"
            >
              <div>
                <p className="text-sm font-extrabold text-white">{label}</p>
                <p className="mt-1 text-[11px] text-slate-500">Cel kcal dla tego dnia</p>
              </div>
              <label className="field-label">
                Białko (g)
                <span className="input-shell !min-h-11">
                  <Beef size={15} />
                  <input
                    name={`protein-${n}`}
                    type="number"
                    min="0"
                    step="1"
                    value={values[n].protein}
                    onChange={(event) => setField(n, "protein", event.target.value)}
                  />
                </span>
              </label>
              <label className="field-label">
                Tłuszcze (g)
                <span className="input-shell !min-h-11">
                  <Droplets size={15} />
                  <input
                    name={`fat-${n}`}
                    type="number"
                    min="0"
                    step="1"
                    value={values[n].fat}
                    onChange={(event) => setField(n, "fat", event.target.value)}
                  />
                </span>
              </label>
              <label className="field-label">
                Węglowodany (g)
                <span className="input-shell !min-h-11">
                  <Croissant size={15} />
                  <input
                    name={`carbs-${n}`}
                    type="number"
                    min="0"
                    step="1"
                    value={values[n].carbs}
                    onChange={(event) => setField(n, "carbs", event.target.value)}
                  />
                </span>
              </label>
              <div className="rounded-xl bg-lime-400/10 px-4 py-2 text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-lime-400/70">
                  kcal
                </p>
                <b className="text-lg font-black text-lime-300">{formatKcal(kcal)}</b>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Suma tygodniowa:{" "}
          <b className="text-white">{formatKcal(totalKcal)} kcal</b>{" "}
          <span className="text-xs text-slate-600">
            (białko 4 · węglowodany 4 · tłuszcze 9 kcal/g)
          </span>
        </p>
        <SubmitButton pendingLabel="Zapisywanie…">
          <Save size={17} /> Zapisz cele
        </SubmitButton>
      </div>
    </form>
  );
}
