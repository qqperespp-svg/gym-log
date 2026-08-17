"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

export type RegisterState = { error?: string; success?: boolean };

export async function registerAction(prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!name || !email || !password) return { error: "Please fill in all fields." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) return { error: "An account with this email already exists." };

  const [user] = await db.insert(users).values({ name, email, passwordHash: hashPassword(password) }).returning();

  (await cookies()).set(
    "session",
    JSON.stringify({ id: user.id, email: user.email, name: user.name }),
    { path: "/", maxAge: 60 * 60 * 24 * 7, httpOnly: true },
  );

  redirect("/dashboard");
}
