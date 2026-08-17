import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { ensureDemoUser } from "@/db/seed";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  await ensureDemoUser();
  return <div className="w-full max-w-md"><AuthForm mode="login" /><div className="mt-7 rounded-2xl border border-lime-400/15 bg-lime-400/[.06] px-4 py-3 text-center text-xs leading-5 text-slate-400"><b className="text-lime-300">Konto demo jest już wpisane.</b><br />Kliknij „Wejdź na trening”, aby zobaczyć pełną aplikację.</div></div>;
}
