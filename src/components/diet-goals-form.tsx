"use client";

import { useMemo, useState } from "react";
import { Beef, Croissant, Droplets, Dumbbell, Save, Sofa, UtensilsCrossed } from "lucide-react";
import { saveDietGoalsAction } from "@/actions/diet";
import type { DietGoal } from "@/db/schema";
import { WEEKDAYS, defaultMealName, kcalFromMacros, parseMealNames } from "@/lib/diet";
import type { DayTypeMacros, MacroSet } from "@/lib/day-type-macros";
import { hasMacros, sameMacros } from "@/lib/day-type-macros";
import { SubmitButton } from "@/components/submit-button";

type GoalValues = Record<
  number,
  { protein: string; fat: string; carbs: string; training: boolean; meals: string; mealNames: string[] }
>;

/** Typ dnia: treningowy albo wolny. */
type DayType = "training" | "rest";

/** Makro szablonu jako wartości pól formularza (stringi). */
type MacroFields = { protein: string; fat: string; carbs: string };

const toFields = (macro: MacroSet): MacroFields => ({
  protein: macro.protein ? String(macro.protein) : "",
  fat: macro.fat ? String(macro.fat) : "",
  carbs: macro.carbs ? String(macro.carbs) : "",
});

const fromFields = (fields: MacroFields): MacroSet => ({
  protein: Number(fields.protein) || 0,
  fat: Number(fields.fat) || 0,
  carbs: Number(fields.carbs) || 0,
});

function formatKcal(n: number): string {
  return n.toLocaleString("pl-PL");
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
  // Makro „na dzień treningowy" i „na dzień wolny" — edytowalne wprost przez
  // użytkownika. To one są podstawiane przy przełączaniu typu dnia i to one
  // trafiają do ustawień przy zapisie celów.
  const [templates, setTemplates] = useState<Record<DayType, MacroFields>>(() => ({
    training: toFields(dayTypeMacros.training),
    rest: toFields(dayTypeMacros.rest),
  }));
  const templateMacros = useMemo(
    () => ({ training: fromFields(templates.training), rest: fromFields(templates.rest) }),
    [templates],
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
   */
  function toggleTraining(n: number) {
    const prev = values[n];
    if (!prev) return;
    const nextTraining = !prev.training;
    const target = nextTraining ? templateMacros.training : templateMacros.rest;
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

  /** Wpisuje makro szablonu do wszystkich dni oznaczonych danym typem. */
  function applyTemplateToDays(type: DayType) {
    const macro = templateMacros[type];
    if (!hasMacros(macro)) return;
    setValues((current) => {
      const next = { ...current };
      for (const { n } of WEEKDAYS) {
        if ((next[n].training ? "training" : "rest") !== type) continue;
        next[n] = {
          ...next[n],
          protein: String(macro.protein),
          fat: String(macro.fat),
          carbs: String(macro.carbs),
        };
      }
      return next;
    });
  }

  function setTemplateField(type: DayType, field: keyof MacroFields, value: string) {
    setTemplates((current) => ({ ...current, [type]: { ...current[type], [field]: value } }));
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
      {/* Makro przypisane do typu dnia — te wartości podstawia przełącznik przy każdym dniu. */}
      <div className="rounded-2xl border border-lime-400/20 bg-lime-400/[.04] p-4">
        <p className="text-xs font-black uppercase tracking-wider text-lime-400">
          Makro wg typu dnia
        </p>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          Ustaw raz makro dnia treningowego i dnia wolnego. Przełącznik przy każdym dniu tygodnia
          (a także plakietka „Dzisiaj” w Michy i na dashboardzie) podmienia makro i kcal na
          wartości z tego panelu.
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {(
            [
              { type: "training" as DayType, label: "Dzień treningowy", icon: <Dumbbell size={14} /> },
              { type: "rest" as DayType, label: "Dzień wolny", icon: <Sofa size={14} /> },
            ]
          ).map(({ type, label, icon }) => {
            const fields = templates[type];
            const macro = templateMacros[type];
            const kcal = kcalFromMacros(macro.protein, macro.fat, macro.carbs);
            return (
              <div key={type} className="rounded-xl border border-white/[.07] bg-black/20 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-2 text-xs font-extrabold ${
                      type === "training" ? "text-lime-300" : "text-slate-300"
                    }`}
                  >
                    {icon} {label}
                  </span>
                  <span className="text-xs font-black text-lime-300">
                    {formatKcal(kcal)} <span className="text-[10px] text-lime-400/70">kcal</span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: "protein" as const, label: "Białko", icon: <Beef size={13} /> },
                      { key: "fat" as const, label: "Tłuszcze", icon: <Droplets size={13} /> },
                      { key: "carbs" as const, label: "Węglow.", icon: <Croissant size={13} /> },
                    ]
                  ).map(({ key, label: macroLabel, icon: macroIcon }) => (
                    <label key={key} className="field-label !text-[10px]">
                      {macroLabel} (g)
                      <span className="input-shell !min-h-10">
                        {macroIcon}
                        <input
                          name={`dayType-${type}-${key}`}
                          type="number"
                          min="0"
                          step="0.1"
                          value={fields[key]}
                          onFocus={(event) => event.target.select()}
                          onChange={(event) => setTemplateField(type, key, event.target.value)}
                        />
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => applyTemplateToDays(type)}
                  disabled={!hasMacros(macro)}
                  className="mt-2 w-full rounded-lg bg-white/[.05] px-3 py-1.5 text-[11px] font-bold text-slate-300 ring-1 ring-white/10 transition hover:text-white disabled:opacity-40"
                >
                  Zastosuj do wszystkich dni tego typu
                </button>
              </div>
            );
          })}
        </div>
        {sameMacros(templateMacros.training, templateMacros.rest) && (
          <p className="mt-3 rounded-xl bg-amber-400/10 px-3 py-2 text-[11px] font-semibold text-amber-200">
            Oba typy dnia mają teraz identyczne makro — przełączanie nie zmieni kaloryki. Ustaw
            wyższe makro dla dnia treningowego (albo niższe dla wolnego).
          </p>
        )}
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
