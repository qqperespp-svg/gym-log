import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";

/**
 * Samonaprawa schematu bazy danych.
 *
 * Aplikacja ewoluowała: w kodzie pojawiły się nowe kolumny i tabele
 * (users.weekly_goal, password_reset_tokens, …), ale starsze bazy danych
 * (np. Neon użyty na produkcji) nie miały tych zmian wypchniętych przez
 * `drizzle-kit push`. Z tego powodu zapytania `select().from(users)` —
 * w tym logowanie — kończyły się błędem „column users.weekly_goal does not
 * exist” i nie dało się zalogować na istniejące konto.
 *
 * Ta funkcja wykonuje wyłącznie *addytywne* i idempotentne operacje
 * (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`), więc jest
 * bezpieczna w każdej wersji bazy i niczego nie usuwa ani nie nadpisuje.
 * Uruchamiana jest raz na proces (memoizacja), przy starcie serwera przez
 * `src/instrumentation.ts` oraz leniwie w ścieżkach uwierzytelniania.
 */

let schemaSyncPromise: Promise<void> | null = null;

export function ensureDbSchema(): Promise<void> {
  if (!schemaSyncPromise) {
    schemaSyncPromise = runSchemaSync().catch((error) => {
      // Nie blokuj aplikacji na stałe — następne żądanie spróbuje ponownie.
      console.error("[schema-sync] Nie udało się zsynchronizować schematu:", error);
      schemaSyncPromise = null;
      throw error;
    });
  }
  return schemaSyncPromise;
}

async function runSchemaSync(): Promise<void> {
  // Każda operacja osobno — awaria jednej nie przerywa pozostałych.
  const steps: Array<[string, SQL]> = [
    // Kolumna dodana w nowszej wersji aplikacji; starsze bazy jej nie mają.
    [
      "users.weekly_goal",
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_goal integer NOT NULL DEFAULT 4`,
    ],
    [
      "sessions.created_at",
      sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now()`,
    ],
    [
      "password_reset_tokens",
      sql`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          token varchar(64) PRIMARY KEY,
          user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at timestamp NOT NULL,
          created_at timestamp NOT NULL DEFAULT now()
        )
      `,
    ],
    [
      "password_reset_tokens.user_id index",
      sql`CREATE INDEX IF NOT EXISTS password_reset_user_idx ON password_reset_tokens (user_id)`,
    ],
    [
      "sessions.user_id index",
      sql`CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)`,
    ],
    [
      "workout_programs.description",
      sql`ALTER TABLE workout_programs ADD COLUMN IF NOT EXISTS description text`,
    ],
    [
      "workout_programs.updated_at",
      sql`ALTER TABLE workout_programs ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now()`,
    ],
    [
      "workouts.status",
      sql`ALTER TABLE workouts ADD COLUMN IF NOT EXISTS status varchar(24) NOT NULL DEFAULT 'completed'`,
    ],
    [
      "workouts.updated_at",
      sql`ALTER TABLE workouts ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now()`,
    ],
    [
      "exercises.rest_seconds",
      sql`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS rest_seconds integer NOT NULL DEFAULT 90`,
    ],
    [
      "program_exercises.rest_seconds",
      sql`ALTER TABLE program_exercises ADD COLUMN IF NOT EXISTS rest_seconds integer NOT NULL DEFAULT 90`,
    ],
    [
      "exercise_definitions.equipment",
      sql`ALTER TABLE exercise_definitions ADD COLUMN IF NOT EXISTS equipment varchar(80) NOT NULL DEFAULT 'Inne'`,
    ],
    [
      "exercise_definitions.is_custom",
      sql`ALTER TABLE exercise_definitions ADD COLUMN IF NOT EXISTS is_custom integer NOT NULL DEFAULT 0`,
    ],
    [
      "exercise_sets.rir",
      sql`ALTER TABLE exercise_sets ADD COLUMN IF NOT EXISTS rir integer`,
    ],
    [
      "exercise_sets.completed",
      sql`ALTER TABLE exercise_sets ADD COLUMN IF NOT EXISTS completed integer NOT NULL DEFAULT 0`,
    ],
    // Ciężary jako liczby dziesiętne (np. 30.5 kg) — zmiana typu jest
    // bezpieczna (integer -> double precision) i idempotentna.
    [
      "program_exercises.target_weight (double precision)",
      sql`ALTER TABLE program_exercises ALTER COLUMN target_weight TYPE double precision`,
    ],
    [
      "exercises.weight (double precision)",
      sql`ALTER TABLE exercises ALTER COLUMN weight TYPE double precision`,
    ],
    [
      "exercise_sets.weight (double precision)",
      sql`ALTER TABLE exercise_sets ALTER COLUMN weight TYPE double precision`,
    ],
    // Notatka do każdej serii w planie treningowym.
    [
      "exercise_sets.note",
      sql`ALTER TABLE exercise_sets ADD COLUMN IF NOT EXISTS note text`,
    ],
  ];

  for (const [label, statement] of steps) {
    try {
      await db.execute(statement);
    } catch (error) {
      // Loguj i leć dalej — pozostałe kroki mogą się udać, a tabela mogła
      // zostać utworzona w międzyczasie przez inny proces.
      console.error(`[schema-sync] Pominięto krok „${label}”:`, error);
    }
  }
}
