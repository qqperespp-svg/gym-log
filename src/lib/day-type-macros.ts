import type { DietGoal, UserSettings } from "@/db/schema";
import { kcalFromMacros, round1 } from "@/lib/diet";

/**
 * Makro przypisane do *typu dnia* (treningowy / wolny).
 *
 * Cele diety trzymamy per dzień tygodnia (`diet_goals`), ale użytkownik myśli
 * kategoriami „makro na dzień treningowy” i „makro na dzień wolny”. Dzięki temu
 * przełączenie dnia treningowy ⇄ wolny może od razu podmienić makro (a więc i
 * kaloryka), zamiast zmieniać wyłącznie etykietę.
 */
export type MacroSet = { protein: number; fat: number; carbs: number };

/** Minimalny kształt celu dnia potrzebny do wyznaczenia szablonów makro. */
export type GoalLike = Pick<DietGoal, "weekday" | "protein" | "fat" | "carbs" | "trainingDay">;

export type DayTypeMacros = { training: MacroSet; rest: MacroSet };

/** Domyślna różnica kalorii między dniem treningowym a wolnym (gdy brak danych). */
export const DEFAULT_TRAINING_BONUS_KCAL = 200;

const EMPTY: MacroSet = { protein: 0, fat: 0, carbs: 0 };

function normalize(macro: MacroSet): MacroSet {
  return {
    protein: Math.max(0, round1(Number(macro.protein) || 0)),
    fat: Math.max(0, round1(Number(macro.fat) || 0)),
    carbs: Math.max(0, round1(Number(macro.carbs) || 0)),
  };
}

function isEmpty(macro: MacroSet | null | undefined): boolean {
  if (!macro) return true;
  return kcalFromMacros(macro.protein, macro.fat, macro.carbs) <= 0;
}

/** Przesuwa kalorykę o `deltaKcal`, korygując węglowodany (4 kcal/g). */
function shiftKcal(macro: MacroSet, deltaKcal: number): MacroSet {
  const carbs = Math.max(0, round1(macro.carbs + deltaKcal / 4));
  return normalize({ ...macro, carbs });
}

/** Szablon zapisany wprost w ustawieniach (kalkulator TDEE / zapis celów). */
function fromSettings(settings: Pick<
  UserSettings,
  "trainingProtein" | "trainingFat" | "trainingCarbs" | "restProtein" | "restFat" | "restCarbs"
> | null | undefined, training: boolean): MacroSet | null {
  if (!settings) return null;
  const protein = training ? settings.trainingProtein : settings.restProtein;
  const fat = training ? settings.trainingFat : settings.restFat;
  const carbs = training ? settings.trainingCarbs : settings.restCarbs;
  if (protein == null && fat == null && carbs == null) return null;
  const macro = normalize({ protein: protein ?? 0, fat: fat ?? 0, carbs: carbs ?? 0 });
  return isEmpty(macro) ? null : macro;
}

/**
 * Najbardziej reprezentatywne makro dni danego typu: bierzemy wariant
 * powtarzający się najczęściej (a przy remisie — z najwcześniejszego dnia
 * tygodnia). Dni bez ustawionych makro pomijamy.
 */
export function macrosFromGoals(goals: GoalLike[], training: boolean): MacroSet | null {
  const candidates = goals
    .filter((goal) => (goal.trainingDay === 1) === training)
    .map((goal) => ({
      weekday: goal.weekday,
      macro: normalize({ protein: goal.protein, fat: goal.fat, carbs: goal.carbs }),
    }))
    .filter((entry) => !isEmpty(entry.macro))
    .sort((a, b) => a.weekday - b.weekday);
  if (!candidates.length) return null;

  const buckets = new Map<string, { macro: MacroSet; count: number; weekday: number }>();
  for (const entry of candidates) {
    const key = `${entry.macro.protein}|${entry.macro.fat}|${entry.macro.carbs}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.count += 1;
    else buckets.set(key, { macro: entry.macro, count: 1, weekday: entry.weekday });
  }
  return [...buckets.values()].sort(
    (a, b) => b.count - a.count || a.weekday - b.weekday,
  )[0].macro;
}

/** Czy oba zestawy makro są identyczne (a więc przełącznik nic by nie zmienił)? */
export function sameMacros(a: MacroSet, b: MacroSet): boolean {
  return a.protein === b.protein && a.fat === b.fat && a.carbs === b.carbs;
}

/**
 * Wyznacza makro dla obu typów dnia:
 *   1. szablon zapisany wprost w ustawieniach (panel „Makro wg typu dnia”,
 *      kalkulator TDEE) — zawsze ma pierwszeństwo,
 *   2. makro dni tego typu z tygodniowego planu,
 *   3. makro drugiego typu skorygowane o domyślny bonus treningowy
 *      (+/- 200 kcal na węglowodanach).
 *
 * Punkt 3 działa też wtedy, gdy oba typy wyszły *identyczne* (typowe, gdy
 * wszystkie dni mają te same makro) — inaczej przełącznik nie zmieniałby
 * kaloryki. Zestawu ustawionego ręcznie przez użytkownika nigdy nie ruszamy.
 */
export function resolveDayTypeMacros(
  goals: GoalLike[],
  settings?: Parameters<typeof fromSettings>[0],
): DayTypeMacros {
  const trainingExplicit = fromSettings(settings, true);
  const restExplicit = fromSettings(settings, false);
  let training = trainingExplicit ?? macrosFromGoals(goals, true);
  let rest = restExplicit ?? macrosFromGoals(goals, false);

  if (!training && rest) training = shiftKcal(rest, DEFAULT_TRAINING_BONUS_KCAL);
  if (!rest && training) rest = shiftKcal(training, -DEFAULT_TRAINING_BONUS_KCAL);

  // Oba typy wyszły tak samo — rozsuń je o domyślny bonus treningowy, żeby
  // przełącznik miał co zmieniać. Ręcznie zapisany zestaw zostaje nietknięty.
  if (training && rest && sameMacros(training, rest)) {
    if (!restExplicit) rest = shiftKcal(training, -DEFAULT_TRAINING_BONUS_KCAL);
    else if (!trainingExplicit) training = shiftKcal(rest, DEFAULT_TRAINING_BONUS_KCAL);
  }

  return { training: training ?? EMPTY, rest: rest ?? EMPTY };
}

/** Makro dla wskazanego typu dnia (pusty zestaw = brak danych). */
export function macrosForDayType(macros: DayTypeMacros, training: boolean): MacroSet {
  return training ? macros.training : macros.rest;
}

/** Czy dla danego typu dnia mamy w ogóle jakieś makro do zastosowania? */
export function hasMacros(macro: MacroSet | null | undefined): boolean {
  return !isEmpty(macro);
}

export { isEmpty as isEmptyMacroSet, normalize as normalizeMacroSet };
