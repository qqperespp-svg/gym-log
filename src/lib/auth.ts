import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { ensureDbSchema } from "@/db/schema-sync";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "gl_session";
const SESSION_DAYS = 30;

// ---------- Password hashing (scrypt) ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    if (candidate.length !== expected.length) return false;
    return timingSafeEqual(candidate, expected);
  } catch {
    // Malformed or legacy hash format — never crash the login flow.
    return false;
  }
}

// ---------- Sessions ----------

export async function createSession(userId: number): Promise<void> {
  // Upewnij się, że tabela sesji i jej kolumny istnieją (samonaprawa bazy),
  // zanim cokolwiek zapiszemy.
  await ensureDbSchema().catch((error) => {
    console.error("[auth] Synchronizacja schematu nie powiodła się:", error);
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token)).catch(() => {});
  }
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // Samonaprawa schematu: starsze bazy mogą nie mieć kolumny users.weekly_goal,
  // przez co pełny SELECT kończył się błędem i logowanie/sesje padały.
  await ensureDbSchema().catch((error) => {
    console.error("[auth] Synchronizacja schematu nie powiodła się:", error);
  });

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);
  if (!session || session.expiresAt.getTime() < Date.now()) return null;

  return getUserById(session.userId);
}

/**
 * Odczyt użytkownika odporny na rozjazd schematu.
 * Najpierw pełny wiersz (z weekly_goal); gdy baza jest starsza i kolumny
 * brakuje, wybierane są wyłącznie stabilne kolumny i zwracana jest
 * wartość domyślna celu tygodniowego.
 */
async function getUserById(userId: number): Promise<User | null> {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user ?? null;
  } catch (error) {
    console.error(
      "[auth] Pełny odczyt użytkownika nie powiódł się (starszy schemat bazy?).",
      error,
    );
    try {
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          password: users.password,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!user) return null;
      return { ...user, weeklyGoal: 4 };
    } catch {
      return null;
    }
  }
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
