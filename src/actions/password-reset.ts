"use server";

import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/mail";
import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ForgotPasswordState =
  | {
      error?: string;
      success?: boolean;
      resetUrl?: string;
      email?: string;
    }
  | undefined;

const RESET_TTL_MS = 60 * 60 * 1000; // 60 minut

export async function requestPasswordResetAction(
  _: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Podaj poprawny adres e-mail.", email };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    return {
      email,
      error:
        "Nie znaleziono konta z tym adresem e-mail. Załóż nowe konto na stronie rejestracji.",
    };
  }

  // Usuń stare tokeny tego użytkownika, wygeneruj nowy.
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
  const token = randomBytes(32).toString("hex");
  await db.insert(passwordResetTokens).values({
    token,
    userId: user.id,
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });

  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const resetPath = `/reset-password/${token}`;
  const result = await sendPasswordResetEmail(email, `${origin}${resetPath}`);

  if (result.sent) {
    return {
      success: true,
      email,
      error: undefined,
    };
  }

  // Tryb demo (brak SMTP): pokaż link do resetu bezpośrednio.
  return { success: true, email, resetUrl: resetPath };
}

export async function resetPasswordAction(
  token: string,
  _: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const password = String(formData.get("password") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();

  if (password.length < 8) return { error: "Hasło musi mieć co najmniej 8 znaków." };
  if (password !== confirm) return { error: "Hasła nie są identyczne." };

  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(eq(passwordResetTokens.token, token), gt(passwordResetTokens.expiresAt, new Date())),
    )
    .limit(1);
  if (!row) {
    return { error: "Link do resetu hasła wygasł lub jest nieprawidłowy. Wyślij prośbę ponownie." };
  }

  await db.update(users).set({ password: await hashPassword(password) }).where(eq(users.id, row.userId));
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));

  revalidatePath("/login");
  redirect("/login?reset=1");
}
