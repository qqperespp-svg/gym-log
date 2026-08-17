import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth";

export async function getCurrentUser() {
  const store = await cookies();
  const session = store.get("session")?.value;
  if (!session) return null;
  try {
    const user = JSON.parse(session);
    const dbUser = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    return dbUser[0] ?? null;
  } catch {
    return null;
  }
}
