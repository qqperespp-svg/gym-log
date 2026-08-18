import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getSessionUser } from "@/lib/auth";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  if (await getSessionUser()) redirect("/dashboard");
  const query = await searchParams;
  return <AuthForm mode="register" prefilledEmail={query.email ?? ""} />;
}
