import type { DietGoal } from "@/db/schema";

/** Pola celu potrzebne do podmiany makro dnia treningowego / wolnego. */
export type TrainingGoal = Pick<
  DietGoal,
  "weekday" | "protein" | "fat" | "carbs" | "kcalGoal" | "trainingDay" | "meals" | "mealNames"
>;

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Trening w planie, w toku albo ukończony — odwołany nie liczy się. */
export function isActiveScheduledWorkout(status: string | null | undefined): boolean {
  return !!status && status !== "cancelled";
}

/** Zbiór lokalnych dat, w których jest aktywny (nieodwołany) trening. */
export function scheduledTrainingDayKeys(rows: Array<{ date: Date; status: string }>): Set<string> {
  const keys = new Set<string>();
  for (const row of rows) {
    if (isActiveScheduledWorkout(row.status)) keys.add(localDayKey(row.date));
  }
  return keys;
}

export function dayHasScheduledTraining(date: Date, trainingDays: Set<string>): boolean {
  return trainingDays.has(localDayKey(date));
}

/**
 * Dzień jest treningowy, gdy:
 *  - jest zaplanowany trening (harmonogram ma pierwszeństwo nad dniem wolnym),
 *  - albo dzień tygodnia jest oznaczony jako treningowy w planie diety.
 */
export function isTrainingDayDesired(hasScheduledTraining: boolean, storedTrainingDay?: number | null): boolean {
  return hasScheduledTraining || storedTrainingDay === 1;
}

/**
 * Cel makro na dany dzień tygodnia z korelacją harmonogramu.
 * Zachowuje posiłki z tego dnia, a B/T/W bierze z najbliższego dnia planu
 * o właściwym typie (treningowy / wolny).
 */
export function resolveGoalForDay<T extends TrainingGoal>(
  goals: T[],
  weekday: number,
  hasScheduledTraining: boolean,
): T | undefined {
  const stored = goals.find((goal) => goal.weekday === weekday);
  const desiredTraining = isTrainingDayDesired(hasScheduledTraining, stored?.trainingDay) ? 1 : 0;
  if (!stored) return goals.find((goal) => goal.trainingDay === desiredTraining);
  if (stored.trainingDay === desiredTraining) return stored;
  const planned = goals.find((goal) => goal.trainingDay === desiredTraining);
  if (!planned) return { ...stored, trainingDay: desiredTraining };
  return {
    ...planned,
    weekday: stored.weekday,
    meals: stored.meals,
    mealNames: stored.mealNames,
  };
}
