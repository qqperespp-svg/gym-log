"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { seedStarterData } from "@/db/seed";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";

export type AuthState = { error?: string } | undefined;

export async function registerAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2) return { error: "Podaj imię (minimum 2 znaki)." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Podaj poprawny adres e-mail." };
  if (password.length < 8) return { error: "Hasło musi mieć co najmniej 8 znaków." };

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: "Konto z tym adresem już istnieje." };

  const hashedPassword = await hashPassword(password);
  const [user] = await db.insert(users).values({ name, email, password: hashedPassword }).returning();
  await seedStarterData(user.id);
  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user || !(await verifyPassword(password, user.password))) {
    return { error: "Nieprawidłowy e-mail lub hasło." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
