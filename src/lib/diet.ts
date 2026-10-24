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

/** Atwater: kcal na gram. Kolejność wyświetlania T → W → B nie zmienia mnożników —
 *  liczymy po nazwie składnika (tłuszcz 9, węglowodany 4, białko 4). */
export const KCAL_PER_GRAM = { fat: 9, carbs: 4, protein: 4 } as const;

function clampMacro(v: number): number {
  return Math.max(0, Math.min(9999, Number.isFinite(v) ? v : 0));
}

/** kcal z gramów makro: tłuszcze×9 + węglowodany×4 + białko×4 (zaokrąglenie do całości). */
export function kcalFromMacros(protein: number, fat: number, carbs: number): number {
  return Math.round(
    clampMacro(fat) * KCAL_PER_GRAM.fat +
      clampMacro(carbs) * KCAL_PER_GRAM.carbs +
      clampMacro(protein) * KCAL_PER_GRAM.protein,
  );
}

/** Gramy makro z udziału % w kaloriach (TDEE): T = kcal×T%/9, W = kcal×W%/4, B = kcal×B%/4. */
export function gramsFromKcalPercents(
  kcal: number,
  percents: { protein: number; fat: number; carbs: number },
): { protein: number; fat: number; carbs: number } {
  const proteinPct = Math.max(0, percents.protein);
  const fatPct = Math.max(0, percents.fat);
  const carbsPct = Math.max(0, percents.carbs);
  const total = proteinPct + fatPct + carbsPct || 1;
  const energy = Math.max(0, kcal);
  return {
    fat: Math.round((energy * (fatPct / total)) / KCAL_PER_GRAM.fat),
    carbs: Math.round((energy * (carbsPct / total)) / KCAL_PER_GRAM.carbs),
    protein: Math.round((energy * (proteinPct / total)) / KCAL_PER_GRAM.protein),
  };
}

/** Formatuje makroskładnik z jedną cyfrą po przecinku (np. 6,1 g / 46 g). */
export function formatMacro(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("pl-PL", { maximumFractionDigits: 1 });
}

/** Kolejność jak na etykiecie produktu: tłuszcz → węglowodany → białko. */
export function formatMacroTriplet(
  protein: number | null | undefined,
  fat: number | null | undefined,
  carbs: number | null | undefined,
  opts?: { unit?: boolean },
): string {
  const u = opts?.unit === false ? "" : " g";
  return `T ${formatMacro(fat)}${u} · W ${formatMacro(carbs)}${u} · B ${formatMacro(protein)}${u}`;
}

/** Zwięzły zapis makro na listach produktów (T/W/B). */
export function formatMacroCompact(
  protein: number | null | undefined,
  fat: number | null | undefined,
  carbs: number | null | undefined,
): string {
  return `T${formatMacro(fat)} W${formatMacro(carbs)} B${formatMacro(protein)}`;
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

/** Zakres urlopu dietetycznego (daty lokalne; po hydracji klienta mogą być ISO stringami). */
export type VacationRange = { startDate: Date | string; endDate: Date | string };

function asLocalDate(value: Date | string): Date {
  const d = value instanceof Date ? value : new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Czy dany dzień (lokalna data) wypada w którymkolwiek urlopie. */
export function isVacationDay(date: Date | string, vacations: VacationRange[]): boolean {
  const t = asLocalDate(date).getTime();
  return vacations.some((v) => {
    const s = asLocalDate(v.startDate).getTime();
    const e = asLocalDate(v.endDate).getTime();
    return t >= s && t <= e;
  });
}

/** Urlopy nachodzące na podany okres raportu (brak granic = cały czas). */
export function vacationsOverlapping<T extends VacationRange>(
  vacations: T[],
  from: Date | null,
  to: Date | null,
): T[] {
  const fromT = from ? asLocalDate(from).getTime() : Number.NEGATIVE_INFINITY;
  const toT = to ? asLocalDate(to).getTime() : Number.POSITIVE_INFINITY;
  return vacations.filter((v) => {
    const s = asLocalDate(v.startDate).getTime();
    const e = asLocalDate(v.endDate).getTime();
    return s <= toT && e >= fromT;
  });
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
