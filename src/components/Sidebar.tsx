import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Dumbbell, BarChart3, Repeat, LogOut, ClipboardList, Activity } from "lucide-react";
import { getCurrentUser } from "@/lib/session";

export default async function Sidebar() {
  const user = await getCurrentUser();

  return (
    <aside className="w-64 shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3 text-amber-400 font-extrabold text-2xl tracking-tight">
          <Dumbbell className="w-8 h-8" /> Gym Log
        </Link>
        <p className="text-xs text-slate-500 mt-1">Track. Lift. Repeat.</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <NavLink href="/dashboard" label="Dashboard" icon={<BarChart3 className="w-4 h-4" />} />
        <NavLink href="/workouts" label="Workouts" icon={<Repeat className="w-4 h-4" />} />
        <NavLink href="/programs" label="Programs" icon={<ClipboardList className="w-4 h-4" />} />
        <NavLink href="/body" label="Ciało" icon={<Activity className="w-4 h-4" />} />
        <NavLink href="/exercises" label="Exercises" icon={<Dumbbell className="w-4 h-4" />} />
      </nav>

      <div className="p-4 border-t border-slate-800">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <form action={logout}>
          <button type="submit" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm font-medium">
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </form>
      </div>
    </aside>
  );
}

async function logout() {
  "use server";
  (await cookies()).delete("session");
  redirect("/login");
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition text-sm font-medium">{icon}<span>{label}</span></Link>
  );
}
