// Etykiety dietetyczne liczone z makro na 100 g.
export type DietLabel = { key: string; pl: string; en: string; color: string };

export function productLabels(protein: number, fat: number, carbs: number): DietLabel[] {
  const out: DietLabel[] = [];
  if (protein >= 15) out.push({ key: "hp", pl: "wysokobiałkowe", en: "high protein", color: "bg-sky-400/15 text-sky-300" });
  if (carbs <= 10 && protein >= 10) out.push({ key: "lc", pl: "niskowęglowodanowe", en: "low carb", color: "bg-amber-400/15 text-amber-300" });
  if (protein >= 20 && fat <= 8) out.push({ key: "lf", pl: "chude", en: "lean", color: "bg-emerald-400/15 text-emerald-300" });
  if (carbs >= 40) out.push({ key: "hc", pl: "wysokowęglowodanowe", en: "high carb", color: "bg-rose-400/15 text-rose-300" });
  if (fat >= 25) out.push({ key: "hf", pl: "tłuste", en: "high fat", color: "bg-orange-400/15 text-orange-300" });
  return out;
}
