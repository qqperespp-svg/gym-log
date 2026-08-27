import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const rawDatabaseUrl = process.env.DATABASE_URL;

if (!rawDatabaseUrl) {
  throw new Error("DATABASE_URL is required");
}

/**
 * pg-connection-string ostrzega, że stare tryby SSL będą miały inną
 * semantykę w kolejnej głównej wersji pg. Zachowujemy dotychczasowe,
 * bezpieczne zachowanie (weryfikacja certyfikatu i hosta) jawnie jako
 * `verify-full`, dzięki czemu ostrzeżenie znika także bez zmiany sekretu
 * DATABASE_URL w panelu wdrożeniowym.
 *
 * Jeśli użytkownik jawnie ustawi `uselibpqcompat=true`, respektujemy jego
 * wybór standardowej semantyki libpq i nie nadpisujemy sslmode=require.
 */
function normalizeDatabaseUrl(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode")?.toLowerCase();
    const useLibpqCompat = url.searchParams.get("uselibpqcompat")?.toLowerCase() === "true";
    if (!useLibpqCompat && sslMode && ["prefer", "require", "verify-ca"].includes(sslMode)) {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
    return connectionString;
  } catch {
    // Awaryjnie obsłuż także keyword/value DSN lub nietypowy URL.
    if (/uselibpqcompat\s*=\s*true/i.test(connectionString)) return connectionString;
    return connectionString.replace(
      /(^|[?&\s])sslmode=(prefer|require|verify-ca)(?=(&|\s|$))/i,
      "$1sslmode=verify-full",
    );
  }
}

const databaseUrl = normalizeDatabaseUrl(rawDatabaseUrl);

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
