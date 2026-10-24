import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { MagicLoginForm } from "@/components/magic-login-form";
import { demoLoginAction } from "@/actions/auth";
import { ensureDemoUser } from "@/db/seed";
import { getSessionUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  if (await getSessionUser()) redirect("/dashboard");
  await ensureDemoUser();
  const query = await searchParams;
  const motivation = ["Nie musisz być idealny. Wystarczy, że dziś zrobisz kolejny krok.", "Każda seria buduje silniejszą wersję Ciebie.", "Plan na dziś: wejść na siłownię i zrobić swoje.", "Wyniki zaczynają się od powtórzenia, którego nie chciało Ci się zrobić.", "Twoja przyszła forma podziękuje Ci za dzisiejszy trening."][new Date().getDate() % 5];
  return (
    <div className="w-full max-w-md">
      {query.reset === "1" && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-lime-400/20 bg-lime-400/[.08] px-4 py-3 text-sm text-lime-200">
          <CheckCircle2 size={18} /> Hasło zostało zmienione. Zaloguj się nowym hasłem.
        </div>
      )}
      <p className="mb-5 text-center text-sm font-bold text-lime-300">{motivation}</p>
      <AuthForm mode="login" />
      <MagicLoginForm />
      <div className="mt-7 rounded-2xl border border-lime-400/15 bg-lime-400/[.06] px-4 py-4 text-center text-xs leading-5 text-slate-400">
        <b className="text-lime-300">Konto demo:</b> demo@gymrat.pl · demo1234
        <br />
        Albo kliknij przycisk, aby od razu wejść na pełne konto demo.
        <form action={demoLoginAction} className="mt-3">
          <button
            type="submit"
            className="button-primary w-full justify-center py-2.5 text-sm"
          >
            Wejdź na trening (konto demo)
          </button>
        </form>
      </div>
    </div>
  );
}
