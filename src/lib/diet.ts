export const WEEKDAYS = [
  { n: 1, label: "Poniedziałek", short: "Pon" },
  { n: 2, label: "Wtorek", short: "Wt" },
  { n: 3, label: "Środa", short: "Śr" },
  { n: 4, label: "Czwartek", short: "Czw" },
  { n: 5, label: "Piątek", short: "Pt" },
  { n: 6, label: "Sobota", short: "Sob" },
  { n: 7, label: "Niedziela", short: "Nd" },
] as const;

/** Poniedziałek 00:00 dla danego dnia — tydzień liczony od poniedziałku do niedzieli. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = niedziela
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Dzień tygodnia ISO: 1 = poniedziałek ... 7 = niedziela. */
export function weekdayOf(date: Date): number {
  const day = date.getDay(); // 0 = niedziela
  return day === 0 ? 7 : day;
}

/** kcal wyliczone z makroskładników: białko 4, węglowodany 4, tłuszcze 9 kcal/g. */
export function kcalFromMacros(protein: number, fat: number, carbs: number): number {
  const clamp = (v: number) => Math.max(0, Math.min(9999, Math.round(Number.isFinite(v) ? v : 0)));
  return clamp(protein) * 4 + clamp(carbs) * 4 + clamp(fat) * 9;
}
