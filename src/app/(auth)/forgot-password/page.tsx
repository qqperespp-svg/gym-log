import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { getSessionUser } from "@/lib/auth";

export default async function ForgotPasswordPage() {
  if (await getSessionUser()) redirect("/dashboard");
  return <ForgotPasswordForm />;
}
