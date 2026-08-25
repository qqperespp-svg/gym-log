import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const RATE_MS = 5000;
const lastCall = new Map<number, number>();

const PROMPT = `Jesteś dietetykiem. Użytkownikowi pozostało do końca dnia określone makro (białko, tłuszcze, węglowodany, kcal) i ma dostępne produkty z katalogu. Zaproponuj 1-3 posiłki, które najlepiej wypełnią pozostałe zapotrzebowanie, używając dostępnych produktów (możesz też zaproponować dowolne składniki, jeśli katalog jest ograniczony). Dla każdego posiłku podaj składniki (nazwa, szacunkowa gramatura w gramach) oraz makro NA 100 GRAMÓW (jak w Open Food Facts). Odpowiedz WYŁĄCZNIE poprawnym JSON (bez żadnego dodatkowego tekstu), w formacie:
[{"nazwa":"Pierś z kurczaka","gramy":150,"bialko_na_100g":30,"tluszcze_na_100g":3,"weglowodany_na_100g":0,"kcal_na_100g":140}]
Wymagania:
- Wypisz tylko składniki posiłku (osobno każdy).
- "gramy" = szacunkowa ilość w posiłku.
- Makro i kcal podaj NA 100 GRAMÓW.
- Używaj polskich nazw produktów.`;

type EstimateItem = {
  name: string;
  grams: number;
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
};

function clamp(v: unknown, max = 999): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
}

function parseItems(text: string): EstimateItem[] {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  let arr: unknown;
  try {
    arr = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\[[\s\S]*\]/);
    if (!m) return [];
    try {
      arr = JSON.parse(m[0]);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((it) => {
      const o = it as Record<string, unknown>;
      return {
        name: String(o.nazwa ?? o.name ?? "Produkt").slice(0, 120),
        grams: Math.round(clamp(o.gramy ?? o.grams, 2000)),
        protein: Math.round(clamp(o.bialko_na_100g ?? o.protein, 100) * 10) / 10,
        fat: Math.round(clamp(o.tluszcze_na_100g ?? o.fat, 100) * 10) / 10,
        carbs: Math.round(clamp(o.weglowodany_na_100g ?? o.carbs, 100) * 10) / 10,
        kcal: Math.round(clamp(o.kcal_na_100g ?? o.kcal, 900)),
      };
    })
    .filter((it) => it.name && it.grams > 0);
}

const PRIORITY = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-pro",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-1.5-pro-latest",
];

async function listCandidateModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      { headers: { "Content-Type": "application/json" } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { models?: Array<{ name?: string; supportedGenerationMethods?: string[] }> };
    const names = (data.models ?? [])
      .map((m) => String(m.name ?? "").replace(/^models\//, ""))
      .filter((n) => n.startsWith("gemini-"))
      .filter((n) => !/thinking|embedding|imagen|tts|tuning/i.test(n));
    const ordered: string[] = [];
    for (const p of PRIORITY) if (names.includes(p)) ordered.push(p);
    for (const n of names) if (!ordered.includes(n)) ordered.push(n);
    return ordered;
  } catch {
    return [];
  }
}

async function callGemini(model: string, apiKey: string, textPrompt: string): Promise<Response> {
  const body = JSON.stringify({
    contents: [
      { parts: [{ text: textPrompt + "\n" + PROMPT }] },
    ],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
  });
  for (const version of ["v1beta", "v1"]) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/${version}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body },
    );
    if (res.ok || res.status !== 404) return res;
  }
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body },
  );
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const now = Date.now();
  const last = lastCall.get(user.id) ?? 0;
  if (now - last < RATE_MS) {
    return Response.json({ error: "Poczekaj chwilę przed kolejnym zapytaniem." }, { status: 429 });
  }
  lastCall.set(user.id, now);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI nie jest skonfigurowane — dodaj GEMINI_API_KEY." },
      { status: 503 },
    );
  }

  let remainingText = "";
  let productsText = "";
  try {
    const body = await request.json();
    remainingText = String(body.remaining ?? "Brak danych o pozostałych makro.");
    productsText = String(body.products ?? "Brak katalogu produktów.");
  } catch {
    return Response.json({ error: "Nieprawidłowe dane wejściowe." }, { status: 400 });
  }

  const textPrompt = `Pozostałe makro użytkownika: ${remainingText}\nDostępne produkty: ${productsText}\n`;

  let candidates: string[] = [];
  if (process.env.GEMINI_MODEL) {
    candidates = [process.env.GEMINI_MODEL.trim()];
  } else {
    candidates = await listCandidateModels(apiKey);
  }
  if (!candidates.length) candidates = ["gemini-2.0-flash", "gemini-2.5-flash-lite", "gemini-1.5-flash"];

  let lastDetail = "";
  for (const model of candidates) {
    let res: Response;
    try {
      res = await callGemini(model, apiKey, textPrompt);
    } catch {
      lastDetail = "Brak połączenia z AI — spróbuj ponownie.";
      continue;
    }

    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      const items = parseItems(text);
      if (!items.length) {
        return Response.json({ error: "Nie udało się wygenerować propozycji." }, { status: 422 });
      }
      return Response.json({ items, model });
    }

    const detail = await res.text().catch(() => "");
    lastDetail = `Model ${model}: ${detail.slice(0, 140)}`;

    const notFound = res.status === 404 || /no longer available|not found|not supported/i.test(detail);
    const overloaded = res.status === 429 || res.status === 503 || /high demand|quota|resource exhausted|overloaded|rate limit|temporary/i.test(detail);

    if (notFound) continue;

    if (overloaded) {
      await new Promise((r) => setTimeout(r, 1200));
      const retryRes = await callGemini(model, apiKey, textPrompt).catch(() => null);
      if (retryRes && retryRes.ok) {
        const data = (await retryRes.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
        const items = parseItems(text);
        if (!items.length) {
          return Response.json({ error: "Nie udało się wygenerować propozycji." }, { status: 422 });
        }
        return Response.json({ items, model });
      }
      if (retryRes) {
        const d2 = await retryRes.text().catch(() => "");
        lastDetail = `Model ${model}: ${d2.slice(0, 140)}`;
      }
      continue;
    }
    break;
  }

  const overloadAll = /high demand|quota|resource exhausted|overloaded|rate limit|temporary/i.test(lastDetail);
  return Response.json(
    {
      error: overloadAll
        ? "AI jest chwilowo przeciążone. Poczekaj kilkanaście sekund i spróbuj ponownie."
        : "AI nie odpowiedziało poprawnie. " + lastDetail,
    },
    { status: overloadAll ? 503 : 502 },
  );
}
