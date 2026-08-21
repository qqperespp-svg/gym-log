// Wyszukiwanie produktu po kodzie kreskowym/QR — najpierw w lokalnym katalogu,
// potem w Open Food Facts. Używane przez skaner w Dzienniku spożycia oraz pole
// kodu przy dodawaniu produktów.

import type { FoodProduct } from "@/db/schema";

export type LookupProduct = {
  code: string;
  name: string;
  protein: number; // na 100 g
  fat: number;
  carbs: number;
  kcal: number;
};

function round1Raw(n: number | undefined): number {
  return Number.isFinite(n) ? Math.round((n ?? 0) * 10) / 10 : 0;
}

/** Szuka produktu po kodzie: lokalny katalog, potem Open Food Facts. Zwraca null, gdy brak. */
export async function lookupProductByCode(
  code: string,
  products: FoodProduct[],
): Promise<LookupProduct | null> {
  const clean = code.trim();
  if (!clean) return null;

  // 1) Lokalny katalog (własne + globalne produkty).
  const local = products.find((p) => p.barcode === clean);
  if (local) {
    return {
      code: clean,
      name: local.name,
      protein: local.protein,
      fat: local.fat,
      carbs: local.carbs,
      kcal: local.kcal,
    };
  }

  // 2) Open Food Facts.
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}.json`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        generic_name?: string;
        brands?: string;
        nutriments?: Record<string, number>;
      };
    };
    if (data?.status !== 1 || !data.product) return null;
    const n = data.product.nutriments ?? {};
    const kcal =
      n["energy-kcal_100g"] ??
      (n["energy-kj_100g"] != null ? Math.round((n["energy-kj_100g"] / 4.184) * 10) / 10 : 0);
    return {
      code: clean,
      name:
        data.product.product_name ||
        data.product.generic_name ||
        data.product.brands ||
        `Produkt (${clean})`,
      protein: round1Raw(n.proteins_100g ?? n.protein_100g),
      fat: round1Raw(n.fat_100g ?? n.fats_100g),
      carbs: round1Raw(n.carbohydrates_100g ?? n.carbs_100g),
      kcal: Math.round(Number(kcal) || 0),
    };
  } catch {
    return null;
  }
}
