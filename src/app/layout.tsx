import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: { default: "GYMRAT — Twój dziennik treningowy", template: "%s | GYMRAT" },
  description: "Zapisuj treningi, śledź objętość i buduj własną bibliotekę ćwiczeń.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="pl"><body className={`${geist.variable} bg-[#0b0f14] text-slate-200 antialiased`}>{children}</body></html>;
}
