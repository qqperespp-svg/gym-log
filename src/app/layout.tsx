import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { initDb } from "@/lib/init";

export const metadata: Metadata = {
  title: "Gym Log — Workout Tracker",
  description: "Track workouts, exercises, sets and programs for serious lifters.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Idempotent: creates tables + seeds demo data on the very first request.
  await initDb();
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
