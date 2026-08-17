import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { demoLoginAction } from "@/actions/auth";
import { ensureDemoUser } from "@/db/seed";
import { getSessionUser } from "@/lib/auth";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/dashboard");
  await ensureDemoUser();
  return (
    <div className="w-full max-w-md">
      <AuthForm mode="login" />
      <div className="mt-7 rounded-2xl border border-lime-400/15 bg-lime-400/[.06] px-4 py-4 text-center text-xs leading-5 text-slate-400">
        <b className="text-lime-300">Konto demo jest gotowe.</b>
        <br />
        Kliknij przycisk, aby od razu wejść na pełne konto demo.
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
