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

/** kcal wyliczone z makroskładników: białko 4, węglowodany 4, tłuszcze 9 kcal/g.
 *  Makro mogą mieć jedną cyfrę po przecinku (np. 6.1 g); kcal zaokrąglamy do całości. */
export function kcalFromMacros(protein: number, fat: number, carbs: number): number {
  const clamp = (v: number) => Math.max(0, Math.min(9999, Number.isFinite(v) ? v : 0));
  return Math.round(clamp(protein) * 4 + clamp(carbs) * 4 + clamp(fat) * 9);
}

/** Formatuje makroskładnik z jedną cyfrą po przecinku (np. 6,1 g / 46 g). */
export function formatMacro(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("pl-PL", { maximumFractionDigits: 1 });
}

/** Zaokrągla do jednej cyfry po przecinku z zabezpieczeniem przed błędami
 *  zmiennoprzecinkowymi (np. 6.1 * 1.5 = 9.149999… -> 9.2). */
export function round1(n: number): number {
  return Math.round((n + 1e-9) * 10) / 10;
}

const DEFAULT_MEAL_NAMES = [
  "Śniadanie",
  "Drugie śniadanie",
  "Obiad",
  "Podwieczorek",
  "Kolacja",
];

/** Domyślna nazwa posiłku dla numeru 1..N. */
export function defaultMealName(n: number): string {
  return DEFAULT_MEAL_NAMES[n - 1] ?? `Posiłek ${n}`;
}

/** Bezpieczne sparsowanie nazw posiłków z JSON (kolumna meal_names). */
export function parseMealNames(raw: string | null, count: number): string[] {
  let names: string[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) names = parsed.map((x) => String(x ?? "").trim());
    } catch {
      names = [];
    }
  }
  return Array.from({ length: count }, (_, i) => names[i] || defaultMealName(i + 1));
}
