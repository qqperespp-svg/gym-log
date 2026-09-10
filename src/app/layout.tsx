import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: { default: "GYMRAT — Twój dziennik treningowy", template: "%s | GYMRAT" },
  description: "Zapisuj treningi, śledź objętość i buduj własną bibliotekę ćwiczeń.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-512.png", sizes: "512x512" }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <body className={`${geist.variable} bg-[#0b0f14] text-slate-200 antialiased`}>
        {children}
        <ServiceWorkerRegister />
        <SpeedInsights />
      </body>
    </html>
  );
}
