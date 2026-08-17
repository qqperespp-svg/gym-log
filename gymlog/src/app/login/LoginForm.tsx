"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Dumbbell, Loader2 } from "lucide-react";
import { loginAction, type LoginState } from "./actions";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 px-6">
      <form action={formAction} className="w-full max-w-md space-y-6 bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-3xl p-10 shadow-2xl shadow-amber-900/20">
        <div className="space-y-2 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-600/20 flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Gym Log</h1>
          <p className="text-slate-400 text-sm">For serious lifters.</p>
        </div>

        {state.error && (
          <div className="rounded-xl bg-rose-950/60 border border-rose-800/50 text-rose-200 text-sm px-4 py-3">{state.error}</div>
        )}

        <div className="space-y-4">
          <input name="email" type="email" placeholder="Email" required className="w-full rounded-xl bg-slate-800/60 border border-slate-600 text-white px-5 py-3 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition" />
          <input name="password" type="password" placeholder="Password" required className="w-full rounded-xl bg-slate-800/60 border border-slate-600 text-white px-5 py-3 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition" />
          <button type="submit" disabled={pending} className="w-full rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white font-bold py-3 transition shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Log In
          </button>
        </div>

        <div className="text-xs text-center text-slate-500">
          <p>Demo: rat@gym.com / gymrat99</p>
          <p className="mt-2 text-sm">No account yet?{" "}
            <Link href="/register" className="text-amber-400 font-semibold hover:underline">Sign up</Link>
          </p>
        </div>
      </form>
    </main>
  );
}
