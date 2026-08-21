// Wyszukiwanie po słowach: zamiast wymagać dokładnego ciągu znaków w nazwie,
// dzielimy zapytanie na słowa i sprawdzamy, czy KAŻDE z nich występuje
// (kolejność nieistotna, dopasowanie częściowe + lekka odmiana polska).
// Np. „twaróg chudy" znajdzie „Chudy twaróg wiejski", a „sztanga" znajdzie
// „Wyciskanie sztangi leżąc".

/** Normalizuje tekst: małe litery, bez polskich znaków, rozbity na słowa. */
export function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Czy dwa słowa mają wspólny rdzeń (ten sam początek o sensownej długości)?
 * Radzi sobie z odmianą: „sztanga" ~ „sztangi", „pomidor" ~ „pomidory".
 */
function stemMatch(a: string, b: string): boolean {
  if (a.length < 4 || b.length < 4) return false;
  let k = 0;
  const max = Math.min(a.length, b.length);
  while (k < max && a[k] === b[k]) k++;
  return k >= 4 && k >= Math.min(a.length, b.length) * 0.6;
}

/**
 * Czy wszystkie słowa zapytania „pasują" do tekstu?
 * Słowo pasuje, gdy występuje w tekście (jako fragment słowa) albo ma wspólny
 * rdzeń z którymś słowem tekstu. Puste zapytanie → true (pokazuje wszystko).
 */
export function matchesWords(text: string, query: string): boolean {
  const nameTokens = tokens(text);
  const qTokens = tokens(query);
  if (qTokens.length === 0) return true;
  return qTokens.every((q) =>
    nameTokens.some((nt) => nt.includes(q) || q.includes(nt) || stemMatch(q, nt)),
  );
}
