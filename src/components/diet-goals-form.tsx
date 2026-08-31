"use client";

import { useMemo, useState } from "react";
import { Beef, Croissant, Droplets, Dumbbell, Save, Sofa, UtensilsCrossed } from "lucide-react";
import { saveDietGoalsAction } from "@/actions/diet";
import type { DietGoal } from "@/db/schema";
import { WEEKDAYS, defaultMealName, kcalFromMacros, parseMealNames } from "@/lib/diet";
import type { DayTypeMacros, MacroSet } from "@/lib/day-type-macros";
import { hasMacros } from "@/lib/day-type-macros";
import { SubmitButton } from "@/components/submit-button";

type GoalValues = Record<
  number,
  { protein: string; fat: string; carbs: string; training: boolean; meals: string; mealNames: string[] }
>;

function formatKcal(n: number): string {
  return n.toLocaleString("pl-PL");
}

/** Formatuje makro jako „B 180 · T 60 · W 250 g" — do podpowiedzi o szablonie dnia. */
function formatMacroSet(macro: MacroSet): string {
  const g = (n: number) => n.toLocaleString("pl-PL", { maximumFractionDigits: 1 });
  return `B ${g(macro.protein)} · T ${g(macro.fat)} · W ${g(macro.carbs)} g · ${formatKcal(
    kcalFromMacros(macro.protein, macro.fat, macro.carbs),
  )} kcal`;
}

export function DietGoalsForm({
  goals,
  dayTypeMacros,
}: {
  goals: DietGoal[];
  /** Makro przypisane do dnia treningowego / wolnego — podstawiane przy przełączaniu typu dnia. */
  dayTypeMacros: DayTypeMacros;
}) {
  const goalByWeekday = useMemo(
    () => new Map(goals.map((goal) => [goal.weekday, goal])),
    [goals],
  );
  const [values, setValues] = useState<GoalValues>(() =>
    Object.fromEntries(
      WEEKDAYS.map(({ n }) => {
        const goal = goalByWeekday.get(n);
        const count = goal ? goal.meals || 3 : 3;
        return [
          n,
          {
            protein: goal ? String(goal.protein) : "",
            fat: goal ? String(goal.fat) : "",
            carbs: goal ? String(goal.carbs) : "",
            training: goal ? goal.trainingDay === 1 : false,
            meals: String(count),
            mealNames: parseMealNames(goal?.mealNames ?? null, count),
          },
        ];
      }),
    ),
  );
  // Makro „na dzień treningowy" i „na dzień wolny" — podstawiane przy przełączaniu
  // typu dnia. Startuje z wartości wyliczonych na serwerze i uczy się w trakcie edycji.
  const [macroMemory, setMacroMemory] = useState<DayTypeMacros>(dayTypeMacros);

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

  function setField(
    n: number,
    field: "protein" | "fat" | "carbs" | "training" | "meals" | "mealNames",
    value: string | boolean | string[],
  ) {
    setValues((current) => ({
      ...current,
      [n]: { ...current[n], [field]: value },
    }));
  }

  /**
   * Przełącza dzień treningowy ⇄ wolny i **podmienia makro** na przypisane do
   * nowego typu dnia — kaloryka (liczona z makro) zmienia się od razu.
   * Makro dotychczasowego typu zapamiętujemy, żeby powrót nic nie gubił.
   */
  function toggleTraining(n: number) {
    const prev = values[n];
    if (!prev) return;
    const nextTraining = !prev.training;
    const previousMacro: MacroSet = {
      protein: Number(prev.protein) || 0,
      fat: Number(prev.fat) || 0,
      carbs: Number(prev.carbs) || 0,
    };
    const memory: DayTypeMacros = hasMacros(previousMacro)
      ? { ...macroMemory, [prev.training ? "training" : "rest"]: previousMacro }
      : macroMemory;
    if (memory !== macroMemory) setMacroMemory(memory);

    const target = nextTraining ? memory.training : memory.rest;
    setValues((current) => ({
      ...current,
      [n]: {
        ...current[n],
        training: nextTraining,
        // Brak makro dla docelowego typu dnia — zmieniamy samą etykietę.
        ...(hasMacros(target)
          ? {
              protein: String(target.protein),
              fat: String(target.fat),
              carbs: String(target.carbs),
            }
          : {}),
      },
    }));
  }

  function setMeals(n: number, raw: string) {
    const count = Math.max(1, Math.min(Math.round(Number(raw) || 1), 10));
    setValues((current) => {
      const prev = current[n];
      const names = Array.from({ length: count }, (_, i) => prev.mealNames[i] || defaultMealName(i + 1));
      return { ...current, [n]: { ...prev, meals: String(count), mealNames: names } };
    });
  }

  function setMealName(n: number, index: number, name: string) {
    setValues((current) => {
      const names = [...current[n].mealNames];
      names[index] = name;
      return { ...current, [n]: { ...current[n], mealNames: names } };
    });
  }

  return (
    <form action={saveDietGoalsAction} className="space-y-6">
      {/* Makro przypisane do typu dnia — to je podstawia przełącznik przy każdym dniu. */}
      <div className="grid gap-2 rounded-2xl border border-white/[.07] bg-black/15 p-4 sm:grid-cols-2">
        <p className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5 font-bold text-lime-300">
            <Dumbbell size={13} /> Dzień treningowy
          </span>
          <span className="text-slate-500">
            {hasMacros(macroMemory.training) ? formatMacroSet(macroMemory.training) : "brak — uzupełnij makro"}
          </span>
        </p>
        <p className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5 font-bold text-slate-300">
            <Sofa size={13} /> Dzień wolny
          </span>
          <span className="text-slate-500">
            {hasMacros(macroMemory.rest) ? formatMacroSet(macroMemory.rest) : "brak — uzupełnij makro"}
          </span>
        </p>
        <p className="text-[11px] text-slate-600 sm:col-span-2">
          Przełącznik przy dniu podmienia makro (i kcal) na wartości przypisane do wybranego typu
          dnia. Zmieniasz makro ręcznie? Nowe wartości stają się szablonem tego typu dnia po
          zapisaniu celów.
        </p>
      </div>

      <div className="space-y-3">
        {WEEKDAYS.map(({ n, label }) => {
          const kcal = kcalFromMacros(
            Number(values[n]?.protein) || 0,
            Number(values[n]?.fat) || 0,
            Number(values[n]?.carbs) || 0,
          );
          const training = !!values[n]?.training;
          const meals = Math.max(1, Math.min(Number(values[n]?.meals) || 3, 10));
          const mealNames = values[n]?.mealNames ?? [];
          return (
            <div key={n} className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-extrabold text-white">{label}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="field-label !space-y-0 flex items-center gap-2 !text-[11px] text-slate-400">
                    <UtensilsCrossed size={13} className="text-lime-400" />
                    Posiłki
                    <input
                      name={`meals-${n}`}
                      type="number"
                      min="1"
                      max="10"
                      step="1"
                      className="input !min-h-9 !w-16 !px-2 !py-1 text-center"
                      value={values[n].meals}
                      onFocus={(event) => event.target.select()}
                      onChange={(event) => setMeals(n, event.target.value)}
                    />
                  </label>
                  <input type="hidden" name={`training-${n}`} value={training ? "1" : "0"} />
                  <button
                    type="button"
                    onClick={() => toggleTraining(n)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      training
                        ? "bg-lime-400/15 text-lime-300 ring-1 ring-lime-400/40"
                        : "bg-white/[.04] text-slate-500 ring-1 ring-white/10 hover:text-slate-300"
                    }`}
                    aria-pressed={training}
                    title="Przełącz: dzień treningowy / dzień wolny — makro i kcal zmienią się na przypisane do wybranego typu dnia"
                  >
                    {training ? <Dumbbell size={13} /> : <Sofa size={13} />}
                    {training ? "Dzień treningowy" : "Dzień wolny"}
                  </button>
                </div>
              </div>

              {/* Nazwy posiłków */}
              {meals > 1 && (
                <div className="mb-3 grid gap-2 sm:grid-cols-2">
                  {mealNames.slice(0, meals).map((name, i) => (
                    <label
                      key={i}
                      className="field-label !space-y-1 flex items-center gap-2 !text-[11px] text-slate-400"
                    >
                      <UtensilsCrossed size={12} className="shrink-0 text-lime-400" />
                      {i + 1}.
                      <input
                        type="text"
                        maxLength={40}
                        className="input !min-h-9 !px-2 !py-1 text-sm"
                        placeholder={defaultMealName(i + 1)}
                        value={name}
                        onChange={(event) => setMealName(n, i, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              )}
              <input
                type="hidden"
                name={`mealNames-${n}`}
                value={JSON.stringify(mealNames.slice(0, meals))}
              />

              <div className="grid items-end gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
                <label className="field-label">
                  Białko (g)
                  <span className="input-shell !min-h-11">
                    <Beef size={15} />
                    <input
                      name={`protein-${n}`}
                      type="number"
                      min="0"
                      step="0.1"
                      value={values[n].protein}
                      onFocus={(event) => event.target.select()}
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
                      step="0.1"
                      value={values[n].fat}
                      onFocus={(event) => event.target.select()}
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
                      step="0.1"
                      value={values[n].carbs}
                      onFocus={(event) => event.target.select()}
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
