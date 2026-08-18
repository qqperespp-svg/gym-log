import { SidebarNav } from "@/components/sidebar-nav";
import { ensureExerciseCatalog } from "@/db/seed";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await ensureExerciseCatalog(user.id);
  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200">
      <SidebarNav user={{ name: user.name, email: user.email }} />
      <main className="min-h-screen px-4 pb-12 pt-20 sm:px-7 lg:ml-72 lg:px-10 lg:pt-9 xl:px-12">
        <div className="mx-auto max-w-[1380px]">{children}</div>
      </main>
    </div>
  );
}
