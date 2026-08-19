"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { logWaterAction } from "@/actions/water";
import { enqueue, flushQueue } from "@/lib/offline-queue";

export function WaterOffline() {
  const [custom, setCustom] = useState("0.25");
  const [offlineNote, setOfflineNote] = useState<string | null>(null);

  useEffect(() => {
    const onSynced = () => setOfflineNote("Zsynchronizowano wpisy offline. ✅");
    window.addEventListener("gymrat:synced", onSynced);
    return () => window.removeEventListener("gymrat:synced", onSynced);
  }, []);

  async function quickAdd(formData: FormData) {
    if (!navigator.onLine) {
      const date = String(formData.get("date") ?? "");
      const liters = Number(formData.get("liters")) || 0;
      await enqueue({ kind: "water", date, liters });
      setOfflineNote("Brak internetu — wpis zapisany lokalnie, zsynchronizuje się później. 📶");
      return;
    }
    await logWaterAction(formData);
  }

  return (
    <div className="mt-6">
      <form action={quickAdd} className="flex flex-wrap items-end gap-3">
        <label className="field-label">
          Inna ilość (l)
          <input
            className="input w-28"
            type="number"
            min="0"
            step="0.05"
            value={custom}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setCustom(e.target.value)}
          />
        </label>
        <input type="hidden" name="date" value={new Date().toISOString().slice(0, 10)} />
        <input type="hidden" name="liters" value={custom} />
        <button type="submit" className="button-secondary">
          <Plus size={16} /> Dodaj
        </button>
      </form>
      {offlineNote && <p className="mt-2 text-xs text-sky-300">{offlineNote}</p>}
    </div>
  );
}
