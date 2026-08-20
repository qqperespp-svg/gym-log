"use server";

import { db } from "@/db";
import { magicTokens, users } from "@/db/schema";
import { ensureDbSchema } from "@/db/schema-sync";
import { ensureDemoUser, ensureExerciseCatalog, seedStarterData } from "@/db/seed";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { sendMagicLinkEmail } from "@/lib/mail";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export type AuthState =
  | {
      error?: string;
      email?: string;
      emailNotFound?: boolean;
    }
  | undefined;

export async function registerAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (name.length < 2) return { error: "Podaj imię i nazwisko (min. 2 znaki)." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Podaj poprawny adres e-mail." };
  if (password.length < 8) return { error: "Hasło musi mieć co najmniej 8 znaków." };

  // Samonaprawa schematu bazy przed zapisem (np. brakujący weekly_goal).
  await ensureDbSchema().catch(() => {});

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return {
      email,
      error:
        "Konto z tym adresem e-mail już istnieje — zaloguj się na nie, zamiast tworzyć nowe.",
    };
  }

  const [user] = await db
    .insert(users)
    .values({ name, email, password: await hashPassword(password) })
    .onConflictDoNothing()
    .returning();
  if (!user) {
    return {
      email,
      error:
        "Konto z tym adresem e-mail już istnieje — zaloguj się na nie, zamiast tworzyć nowe.",
    };
  }

  try {
    await ensureExerciseCatalog(user.id);
    await seedStarterData(user.id);
  } catch (error) {
    // Starter data is a bonus — the account itself works without it.
    console.error("seeding failed for new user:", error);
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rawPassword = String(formData.get("password") ?? "");

  // Samonaprawa schematu bazy przed zapytaniem (np. brakujący weekly_goal).
  await ensureDbSchema().catch(() => {});

  // Celowo wybieramy tylko stabilne kolumny — starsze bazy produkcyjne nie
  // miały kolumny users.weekly_goal, a pełny SELECT (`db.select().from(users)`)
  // kończył się wtedy błędem i uniemożliwiał zalogowanie na istniejące konto.
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      password: users.password,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) {
    return {
      email,
      emailNotFound: true,
      error: `Nie znaleziono konta z adresem ${email || "(brak adresu)"}.`,
    };
  }

  // Konta utworzone w starszych wersjach aplikacji mogły zapisać hasło z
  // przypadkowymi spacjami (np. przy wklejaniu). Sprawdzamy najpierw hasło
  // dokładnie tak, jak je wpisano, a potem wersję przyciętą.
  const trimmed = rawPassword.trim();
  const exactOk = await verifyPassword(rawPassword, user.password);
  const trimmedOk =
    trimmed !== rawPassword && (await verifyPassword(trimmed, user.password));
  if (!exactOk && !trimmedOk) {
    return {
      email,
      error:
        "Nieprawidłowe hasło dla tego konta. Sprawdź poprawność i spróbuj ponownie.",
    };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function demoLoginAction(): Promise<void> {
  // Jedno kliknięcie = pewne logowanie na konto demo z prawidłowym hasłem.
  await ensureDbSchema().catch(() => {});
  const userId = await ensureDemoUser();
  if (!userId) redirect("/login");
  await createSession(userId);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}


// ---------- Logowanie bez hasła (magic link) ----------

export type MagicState =
  | { error?: string; success?: boolean; loginUrl?: string; email?: string }
  | undefined;

const MAGIC_TTL_MS = 15 * 60 * 1000; // 15 minut

export async function sendMagicLinkAction(_: MagicState, formData: FormData): Promise<MagicState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Podaj poprawny adres e-mail.", email };
  }
  await ensureDbSchema().catch(() => {});
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) return { error: "Nie znaleziono konta z tym adresem e-mail.", email };

  await db.delete(magicTokens).where(eq(magicTokens.userId, user.id));
  const token = randomBytes(32).toString("hex");
  await db.insert(magicTokens).values({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + MAGIC_TTL_MS),
  });
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const path = `/login/magic/${token}`;
  const result = await sendMagicLinkEmail(email, `${origin}${path}`);
  if (result.sent) return { success: true, email };
  return { success: true, email, loginUrl: path }; // tryb demo: link na ekranie
}

/** Potwierdza magic link: sprawdza token i tworzy sesję (akcja — może ustawić ciasteczko). */
export async function completeMagicLoginAction(
  token: string,
  _: { error?: string } | undefined,
): Promise<{ error?: string } | undefined> {
  await ensureDbSchema().catch(() => {});
  const [row] = await db
    .select({ userId: magicTokens.userId, expiresAt: magicTokens.expiresAt })
    .from(magicTokens)
    .where(eq(magicTokens.token, token))
    .limit(1);
  if (!row || row.expiresAt.getTime() < Date.now()) {
    return { error: "Link wygasł lub jest nieprawidłowy." };
  }
  await createSession(row.userId);
  await db.delete(magicTokens).where(eq(magicTokens.token, token));
  redirect("/dashboard");
}
