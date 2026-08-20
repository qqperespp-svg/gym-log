import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { MagicConfirm } from "@/components/magic-confirm";

export const dynamic = "force-dynamic";

export default async function MagicLoginPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const token = (await params).token;
  if (await getSessionUser()) redirect("/dashboard");

  return (
    <div className="w-full max-w-md">
      <MagicConfirm token={token} />
    </div>
  );
}
