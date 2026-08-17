"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) return { error: "Please enter your email and password." };

  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!found.length || !verifyPassword(password, found[0].passwordHash)) {
    return { error: "Invalid email or password." };
  }

  const user = found[0];
  (await cookies()).set(
    "session",
    JSON.stringify({ id: user.id, email: user.email, name: user.name }),
    { path: "/", maxAge: 60 * 60 * 24 * 7, httpOnly: true },
  );

  redirect("/dashboard");
}
