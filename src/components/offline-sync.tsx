"use client";

import { useEffect } from "react";
import { setupOfflineSync } from "@/lib/offline-queue";

/** Podpina synchronizację kolejki offline + odznakę (badge) przy celu kcal. */
export function OfflineSync() {
  useEffect(() => {
    const cleanup = setupOfflineSync();
    // badge: pozostałe kcal dnia (Chrome/Android PWA)
    try {
      const el = document.querySelector('[data-kcal-remaining]');
      if (el && navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "set-badge",
          count: Number(el.getAttribute("data-kcal-remaining")) || 0,
        });
      }
    } catch {
      // ignoruj
    }
    return cleanup;
  }, []);
  return null;
}
