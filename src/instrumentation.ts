/**
 * Next.js instrumentation — uruchamiane raz przy starcie serwera
 * (na Vercelu: przy zimnym starcie funkcji serverless).
 *
 * Naprawia rozjazd schematu bazy (np. brakująca kolumna users.weekly_goal)
 * zanim pierwsze żądanie dotknie logowania.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL) return;

  try {
    const { ensureDbSchema } = await import("@/db/schema-sync");
    await ensureDbSchema();
    console.log("[instrumentation] Schemat bazy zsynchronizowany.");
  } catch (error) {
    // Nie wywracaj startu — logowanie i sesje mają własny mechanizm naprawczy.
    console.error("[instrumentation] Synchronizacja schematu nie powiodła się:", error);
  }
}
