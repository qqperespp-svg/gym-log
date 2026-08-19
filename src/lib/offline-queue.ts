"use client";

// Kolejka offline: wpisy spożycia i wody zapisane w IndexedDB,
// wysyłane do /api/sync po powrocie połączenia (lub przy starcie).

type QueueItem =
  | { kind: "diet"; date: string; protein: number; fat: number; carbs: number; kcal: number; mealNumber: number | null; note: string | null }
  | { kind: "water"; date: string; liters: number };

const DB = "gymrat-offline";
const STORE = "queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(item: QueueItem & { id?: number }): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).add(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // brak IndexedDB — ignoruj
  }
}

export async function flushQueue(): Promise<number> {
  let sent = 0;
  try {
    const db = await openDb();
    const store = db.transaction(STORE, "readonly").objectStore(STORE);
    const all = await new Promise<QueueItem[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as QueueItem[]);
      req.onerror = () => reject(req.error);
    });
    if (!all.length) {
      db.close();
      return 0;
    }
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: all.filter((i) => i.kind === "diet"),
        water: all.filter((i) => i.kind === "water"),
      }),
    });
    if (res.ok) {
      const tx = db.transaction(STORE, "readwrite");
      const s = tx.objectStore(STORE);
      all.forEach((item) => s.delete((item as { id?: number }).id as number));
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
      sent = all.length;
    }
    db.close();
  } catch {
    // offline / błąd — zostaje w kolejce
  }
  return sent;
}

/** Podpinanie globalne: flush po powrocie online + przy starcie. */
export function setupOfflineSync(): () => void {
  const onOnline = () => {
    void flushQueue().then((n) => {
      if (n > 0) window.dispatchEvent(new CustomEvent("gymrat:synced", { detail: n }));
    });
  };
  window.addEventListener("online", onOnline);
  onOnline();
  return () => window.removeEventListener("online", onOnline);
}
