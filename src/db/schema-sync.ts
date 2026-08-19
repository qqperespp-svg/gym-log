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
    // Tabele zakładki „Micha” — dzienne cele kcal (z makro) i dziennik spożycia.
    [
      "diet_goals",
      sql`
        CREATE TABLE IF NOT EXISTS diet_goals (
          id serial PRIMARY KEY,
          user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          weekday integer NOT NULL,
          protein integer NOT NULL DEFAULT 0,
          fat integer NOT NULL DEFAULT 0,
          carbs integer NOT NULL DEFAULT 0,
          kcal_goal integer NOT NULL DEFAULT 0,
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `,
    ],
    [
      "diet_goals.user_id index",
      sql`CREATE INDEX IF NOT EXISTS diet_goals_user_idx ON diet_goals (user_id)`,
    ],
    [
      "diet_goals.user_id+weekday unique",
      sql`CREATE UNIQUE INDEX IF NOT EXISTS diet_goals_user_weekday_idx ON diet_goals (user_id, weekday)`,
    ],
    [
      "diet_logs",
      sql`
        CREATE TABLE IF NOT EXISTS diet_logs (
          id serial PRIMARY KEY,
          user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          date timestamp NOT NULL,
          protein integer NOT NULL DEFAULT 0,
          fat integer NOT NULL DEFAULT 0,
          carbs integer NOT NULL DEFAULT 0,
          kcal integer NOT NULL DEFAULT 0,
          note text,
          created_at timestamp NOT NULL DEFAULT now()
        )
      `,
    ],
    [
      "diet_logs.user_id+date index",
      sql`CREATE INDEX IF NOT EXISTS diet_logs_user_date_idx ON diet_logs (user_id, date)`,
    ],
    // Makroskładniki w dzienniku spożycia (kcal liczone z białka/tłuszczy/węglowodanów).
    [
      "diet_logs.protein",
      sql`ALTER TABLE diet_logs ADD COLUMN IF NOT EXISTS protein integer NOT NULL DEFAULT 0`,
    ],
    [
      "diet_logs.fat",
      sql`ALTER TABLE diet_logs ADD COLUMN IF NOT EXISTS fat integer NOT NULL DEFAULT 0`,
    ],
    [
      "diet_logs.carbs",
      sql`ALTER TABLE diet_logs ADD COLUMN IF NOT EXISTS carbs integer NOT NULL DEFAULT 0`,
    ],
    // Oznaczenie dnia treningowego / wolnego w celach dziennych.
    [
      "diet_goals.training_day",
      sql`ALTER TABLE diet_goals ADD COLUMN IF NOT EXISTS training_day integer NOT NULL DEFAULT 0`,
    ],
    // Liczba posiłków w danym dniu.
    [
      "diet_goals.meals",
      sql`ALTER TABLE diet_goals ADD COLUMN IF NOT EXISTS meals integer NOT NULL DEFAULT 3`,
    ],
    // Nazwy posiłków (JSON) — np. ["Śniadanie","Obiad","Kolacja"].
    [
      "diet_goals.meal_names",
      sql`ALTER TABLE diet_goals ADD COLUMN IF NOT EXISTS meal_names text`,
    ],
    // Numer posiłku (1..N), do którego przypisany jest wpis spożycia.
    [
      "diet_logs.meal_number",
      sql`ALTER TABLE diet_logs ADD COLUMN IF NOT EXISTS meal_number integer`,
    ],
    // Katalog produktów spożywczych (globalny + własne użytkownika).
    [
      "food_products",
      sql`
        CREATE TABLE IF NOT EXISTS food_products (
          id serial PRIMARY KEY,
          user_id integer REFERENCES users(id) ON DELETE CASCADE,
          name varchar(255) NOT NULL,
          barcode varchar(64),
          protein integer NOT NULL DEFAULT 0,
          fat integer NOT NULL DEFAULT 0,
          carbs integer NOT NULL DEFAULT 0,
          kcal integer NOT NULL DEFAULT 0,
          is_custom integer NOT NULL DEFAULT 0,
          created_at timestamp NOT NULL DEFAULT now()
        )
      `,
    ],
    [
      "food_products.user_id index",
      sql`CREATE INDEX IF NOT EXISTS food_products_user_idx ON food_products (user_id)`,
    ],
    [
      "food_products.name index",
      sql`CREATE INDEX IF NOT EXISTS food_products_name_idx ON food_products (name)`,
    ],
    [
      "food_products.user_id+barcode unique",
      sql`CREATE UNIQUE INDEX IF NOT EXISTS food_products_user_barcode_idx ON food_products (user_id, barcode)`,
    ],
    // Makroskładniki z jedną cyfrą po przecinku (np. 6.1 g) — zmiana typu integer -> double precision.
    [
      "diet_goals.protein (double precision)",
      sql`ALTER TABLE diet_goals ALTER COLUMN protein TYPE double precision`,
    ],
    [
      "diet_goals.fat (double precision)",
      sql`ALTER TABLE diet_goals ALTER COLUMN fat TYPE double precision`,
    ],
    [
      "diet_goals.carbs (double precision)",
      sql`ALTER TABLE diet_goals ALTER COLUMN carbs TYPE double precision`,
    ],
    [
      "diet_goals.kcal_goal (double precision)",
      sql`ALTER TABLE diet_goals ALTER COLUMN kcal_goal TYPE double precision`,
    ],
    [
      "diet_logs.protein (double precision)",
      sql`ALTER TABLE diet_logs ALTER COLUMN protein TYPE double precision`,
    ],
    [
      "diet_logs.fat (double precision)",
      sql`ALTER TABLE diet_logs ALTER COLUMN fat TYPE double precision`,
    ],
    [
      "diet_logs.carbs (double precision)",
      sql`ALTER TABLE diet_logs ALTER COLUMN carbs TYPE double precision`,
    ],
    [
      "diet_logs.kcal (double precision)",
      sql`ALTER TABLE diet_logs ALTER COLUMN kcal TYPE double precision`,
    ],
    [
      "food_products.protein (double precision)",
      sql`ALTER TABLE food_products ALTER COLUMN protein TYPE double precision`,
    ],
    [
      "food_products.fat (double precision)",
      sql`ALTER TABLE food_products ALTER COLUMN fat TYPE double precision`,
    ],
    [
      "food_products.carbs (double precision)",
      sql`ALTER TABLE food_products ALTER COLUMN carbs TYPE double precision`,
    ],
    [
      "food_products.kcal (double precision)",
      sql`ALTER TABLE food_products ALTER COLUMN kcal TYPE double precision`,
    ],
    // ---- Rozszerzone funkcje: offline/sync, woda, przepisy, zdjęcia, ustawienia, superserie ----
    [
      "food_products.is_favorite",
      sql`ALTER TABLE food_products ADD COLUMN IF NOT EXISTS is_favorite integer NOT NULL DEFAULT 0`,
    ],
    [
      "exercises.grp",
      sql`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS grp varchar(8)`,
    ],
    [
      "water_logs",
      sql`
        CREATE TABLE IF NOT EXISTS water_logs (
          id serial PRIMARY KEY,
          user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          date timestamp NOT NULL,
          liters double precision NOT NULL DEFAULT 0,
          created_at timestamp NOT NULL DEFAULT now()
        )
      `,
    ],
    [
      "water_logs.user_id+date index",
      sql`CREATE INDEX IF NOT EXISTS water_logs_user_date_idx ON water_logs (user_id, date)`,
    ],
    [
      "recipes",
      sql`
        CREATE TABLE IF NOT EXISTS recipes (
          id serial PRIMARY KEY,
          user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name varchar(160) NOT NULL,
          items text,
          protein double precision NOT NULL DEFAULT 0,
          fat double precision NOT NULL DEFAULT 0,
          carbs double precision NOT NULL DEFAULT 0,
          kcal double precision NOT NULL DEFAULT 0,
          created_at timestamp NOT NULL DEFAULT now()
        )
      `,
    ],
    [
      "recipes.user_id index",
      sql`CREATE INDEX IF NOT EXISTS recipes_user_idx ON recipes (user_id)`,
    ],
    [
      "progress_photos",
      sql`
        CREATE TABLE IF NOT EXISTS progress_photos (
          id serial PRIMARY KEY,
          user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          date timestamp NOT NULL DEFAULT now(),
          photo text,
          note text,
          created_at timestamp NOT NULL DEFAULT now()
        )
      `,
    ],
    [
      "progress_photos.user_id index",
      sql`CREATE INDEX IF NOT EXISTS progress_photos_user_idx ON progress_photos (user_id)`,
    ],
    [
      "user_settings",
      sql`
        CREATE TABLE IF NOT EXISTS user_settings (
          user_id integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          lang varchar(8) NOT NULL DEFAULT 'pl',
          water_goal double precision NOT NULL DEFAULT 2.5,
          reminders text,
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `,
    ],
    [
      "user_favorites",
      sql`
        CREATE TABLE IF NOT EXISTS user_favorites (
          id serial PRIMARY KEY,
          user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          product_id integer NOT NULL REFERENCES food_products(id) ON DELETE CASCADE
        )
      `,
    ],
    [
      "user_favorites unique",
      sql`CREATE UNIQUE INDEX IF NOT EXISTS user_favorites_user_product_idx ON user_favorites (user_id, product_id)`,
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
