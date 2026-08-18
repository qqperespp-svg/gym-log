import Link from "next/link";
import { and, eq, gt } from "drizzle-orm";
import { KeyRound, XCircle } from "lucide-react";
import { resetPasswordAction } from "@/actions/password-reset";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { db } from "@/db";
import { passwordResetTokens } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(eq(passwordResetTokens.token, token), gt(passwordResetTokens.expiresAt, new Date())),
    )
    .limit(1);
  const valid = Boolean(row);

  return (
    <div className="w-full max-w-md">
      <Link href="/" className="mb-10 inline-flex items-center gap-3 text-white">
        <span className="grid size-11 place-items-center rounded-2xl bg-lime-400 text-slate-950 shadow-[0_0_28px_rgba(163,230,53,.24)]">
          <KeyRound size={23} />
        </span>
        <span className="text-xl font-black tracking-[-0.04em]">
          GYM<span className="text-lime-400">RAT</span>
        </span>
      </Link>

      {valid ? (
        <>
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-lime-400">
              Ostatni krok
            </p>
            <h1 className="text-4xl font-black tracking-[-0.045em] text-white">
              Ustaw nowe hasło
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Wpisz nowe hasło — od razu po zapisaniu zalogujesz się nim.
            </p>
          </div>
          <ResetPasswordForm action={resetPasswordAction.bind(null, token)} />
        </>
      ) : (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[.06] p-6 text-center">
          <XCircle size={32} className="mx-auto text-rose-300" />
          <h2 className="mt-4 text-lg font-extrabold text-white">
            Link jest nieprawidłowy lub wygasł
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Linki do resetu hasła są ważne 60 minut i jednorazowe. Wyślij nową
            prośbę o reset.
          </p>
          <Link href="/forgot-password" className="button-primary mt-5 w-full justify-center">
            Wyślij nowy link
          </Link>
        </div>
      )}
    </div>
  );
}
