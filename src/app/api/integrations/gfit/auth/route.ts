import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Start przepływu OAuth Google Fit — przekierowanie na zgodę Google. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
  if (!clientId) {
    redirect("/settings?fit_error=1");
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const redirectUri = `${origin}/api/integrations/gfit/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read",
    access_type: "offline",
    prompt: "consent",
    state: String(user.id),
  });
  redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
