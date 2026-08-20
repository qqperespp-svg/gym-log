import { db } from "@/db";
import { integrations } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** OAuth callback Google Fit — wymiana kodu na tokeny i zapis integracji. */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code || Number(state) !== user.id) {
    redirect("/settings?fit_error=1");
  }

  const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) redirect("/settings?fit_error=1");

  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${origin}/api/integrations/gfit/callback`,
    }),
  });
  if (!res.ok) redirect("/settings?fit_error=1");
  const data = (await res.json()) as { access_token?: string; refresh_token?: string; scope?: string };

  const existing = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(eq(integrations.provider, "google_fit"))
    .limit(1);
  if (existing.length) {
    await db
      .update(integrations)
      .set({
        accessToken: data.access_token ?? null,
        refreshToken: data.refresh_token ?? undefined,
        scope: data.scope ?? null,
        connectedAt: new Date(),
      })
      .where(eq(integrations.id, existing[0].id));
  } else {
    await db.insert(integrations).values({
      userId: user.id,
      provider: "google_fit",
      accessToken: data.access_token ?? null,
      refreshToken: data.refresh_token ?? null,
      scope: data.scope ?? null,
    });
  }

  redirect("/settings?saved=1");
}
