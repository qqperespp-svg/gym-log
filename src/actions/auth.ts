"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureDemoUser, ensureExerciseCatalog, seedStarterData } from "@/db/seed";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export type AuthState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

export async function registerAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (name.length < 2) return { error: "Podaj imię i nazwisko (min. 2 znaki)." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Podaj poprawny adres e-mail." };
  if (password.length < 8) return { error: "Hasło musi mieć co najmniej 8 znaków." };

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: "Konto z tym adresem e-mail już istnieje. Zaloguj się lub użyj konta demo." };

  const [user] = await db
    .insert(users)
    .values({ name, email, password: await hashPassword(password) })
    .onConflictDoNothing()
    .returning();
  if (!user) return { error: "Konto z tym adresem e-mail już istnieje. Zaloguj się lub użyj konta demo." };

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
  const password = String(formData.get("password") ?? "").trim();

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !(await verifyPassword(password, user.password))) {
    return {
      error:
        "Nieprawidłowy e-mail lub hasło. Sprawdź dane albo skorzystaj z konta demo poniżej.",
    };
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function demoLoginAction(): Promise<void> {
  // Jedno kliknięcie = pewne logowanie na konto demo z prawidłowym hasłem.
  const userId = await ensureDemoUser();
  if (!userId) redirect("/login");
  await createSession(userId);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
