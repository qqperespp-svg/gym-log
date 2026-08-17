import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return <RegisterForm />;
}
