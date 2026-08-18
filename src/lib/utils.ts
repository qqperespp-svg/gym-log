import type { WorkoutSet } from "@/db/schema";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(iso: Date | string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateLong(iso: Date | string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function volumeOfSets(sets: WorkoutSet[]): number {
  return sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export function completedSets(sets: WorkoutSet[]): number {
  return sets.filter((s) => s.completed === 1).length;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const MUSCLE_GROUP_STYLES: Record<string, string> = {
  Klatka: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  Plecy: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  Nogi: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  Barki: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  Biceps: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  Triceps: "bg-teal-500/15 text-teal-300 ring-teal-500/30",
  Brzuch: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  Łydki: "bg-yellow-500/15 text-yellow-300 ring-yellow-500/30",
  Przedramiona: "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30",
  Cardio: "bg-lime-500/15 text-lime-300 ring-lime-500/30",
  Inne: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
};

export function muscleGroupClass(group: string): string {
  return MUSCLE_GROUP_STYLES[group] ?? MUSCLE_GROUP_STYLES.Inne;
}
