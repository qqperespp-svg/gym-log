import { eq } from "drizzle-orm";
import { SidebarNav } from "@/components/sidebar-nav";
import { OfflineSync } from "@/components/offline-sync";
import { ThemeProvider } from "@/components/theme-provider";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { ensureExerciseCatalog } from "@/db/seed";
import { requireUser } from "@/lib/auth";
import type { Lang } from "@/lib/i18n";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await ensureExerciseCatalog(user.id);
  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, user.id)).limit(1);
  const lang: Lang = settings?.lang === "en" ? "en" : "pl";
  const theme = settings?.theme === "light" ? "light" : "dark";
  const accent = (["lime", "sky", "violet", "rose", "amber", "emerald"] as const).includes(settings?.accent as never)
    ? (settings?.accent as "lime" | "sky" | "violet" | "rose" | "amber" | "emerald")
    : "lime";
  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200">
      <SidebarNav user={{ name: user.name, email: user.email }} lang={lang} theme={theme} accent={accent} />
      <main className="min-h-screen px-4 pb-12 pt-20 sm:px-7 lg:ml-72 lg:px-10 lg:pt-9 xl:px-12">
        <div className="mx-auto max-w-[1380px]">{children}</div>
      </main>
      <OfflineSync />
      <ThemeProvider theme={theme} accent={accent} />
    </div>
  );
}
