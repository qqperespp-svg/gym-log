// Etykiety dietetyczne liczone z makro na 100 g.
export type DietLabel = { key: string; pl: string; en: string; color: string };

/** Wszystkie możliwe etykiety — używane też do filtrowania katalogu. */
export const DIET_LABELS: DietLabel[] = [
  { key: "hp", pl: "wysokobiałkowe", en: "high protein", color: "bg-sky-400/15 text-sky-300" },
  { key: "lc", pl: "niskowęglowodanowe", en: "low carb", color: "bg-amber-400/15 text-amber-300" },
  { key: "lf", pl: "chude", en: "lean", color: "bg-emerald-400/15 text-emerald-300" },
  { key: "hc", pl: "wysokowęglowodanowe", en: "high carb", color: "bg-rose-400/15 text-rose-300" },
  { key: "hf", pl: "tłuste", en: "high fat", color: "bg-orange-400/15 text-orange-300" },
];

export function productLabels(protein: number, fat: number, carbs: number): DietLabel[] {
  const out: DietLabel[] = [];
  if (protein >= 15) out.push(DIET_LABELS[0]); // wysokobiałkowe
  if (carbs <= 10 && protein >= 10) out.push(DIET_LABELS[1]); // niskowęglowodanowe
  if (protein >= 20 && fat <= 8) out.push(DIET_LABELS[2]); // chude
  if (carbs >= 40) out.push(DIET_LABELS[3]); // wysokowęglowodanowe
  if (fat >= 25) out.push(DIET_LABELS[4]); // tłuste
  return out;
}
