// Wyszukiwanie po słowach: dzielimy zapytanie na słowa i sprawdzamy, czy KAŻDE
// z nich „pasuje" do nazwy (kolejność nieistotna). Słowa muszą realnie występować
// w nazwie — bez fałszywych trafień przez pojedyncze litery (np. „o", „w", „z").
// Np. „twaróg chudy" znajdzie „Chudy twaróg wiejski", a „sztanga" znajdzie
// „Wyciskanie sztangi leżąc" (lekka obsługa odmiany).

/** Normalizuje tekst: małe litery, bez polskich znaków, rozbity na słowa.
 *  Uwaga: polskie „ł/Ł" NIE ma rozkładu nawet w NFKD (Unicode) — zamieniamy je
 *  ręcznie, inaczej „masło" rozpadałoby się na „mas"+"o" i wyszukiwarka by gubiła. */
export function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function commonPrefixLen(a: string, b: string): number {
  let k = 0;
  const max = Math.min(a.length, b.length);
  while (k < max && a[k] === b[k]) k++;
  return k;
}

/**
 * Czy słowo zapytania pasuje do słowa z nazwy?
 * 1) słowo zapytania jest fragmentem słowa nazwy („twarog" → „twarogowy"),
 * 2) słowo nazwy (min. 4 litery) jest fragmentem słowa zapytania,
 * 3) konserwatywna odmiana: oba mają ≥ 4 litery i wspólny rdzeń ≥ 4 litery
 *    („sztanga" ~ „sztangi", „jajko" ~ „jajka").
 */
function wordMatch(q: string, nt: string): boolean {
  if (nt.includes(q)) return true;
  if (nt.length >= 4 && q.includes(nt)) return true;
  if (q.length >= 4 && nt.length >= 4 && commonPrefixLen(q, nt) >= 4) return true;
  return false;
}

/**
 * Czy wszystkie słowa zapytania pasują do tekstu? Puste zapytanie → true.
 */
export function matchesWords(text: string, query: string): boolean {
  const nameTokens = tokens(text);
  const qTokens = tokens(query);
  if (qTokens.length === 0) return true;
  return qTokens.every((q) => nameTokens.some((nt) => wordMatch(q, nt)));
}
