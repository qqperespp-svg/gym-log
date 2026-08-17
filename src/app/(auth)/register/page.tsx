import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getSessionUser } from "@/lib/auth";

export default async function RegisterPage() {
  if (await getSessionUser()) redirect("/dashboard");
  return <AuthForm mode="register" />;
}
