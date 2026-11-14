// Stará úřední deska na prisovice.e-obec.cz (Tomáš 14. 11. 2026, mění rozhodnutí z 24. 10. 2026, že se nesleduje).
// Deska má dvě stránky: aktuálně vyvěšené dokumenty a archiv. Každý dokument je blok s názvem, daty vyvěšení a sejmutí
// a odkazem urednideska.php?soubor=ID, který přesměruje na soubor v /storage/uredni_deska/.
export interface PolozkaEobec {
  id: string;
  nazev: string;
  // Data jako RRRR-MM-DD.
  vyveseno: string | null;
  sejmuto: string | null;
}

const bezZnacek = (html: string) =>
  html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

function naIso(text: string | undefined) {
  const shoda = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(text ?? '');
  return shoda ? `${shoda[3]}-${shoda[2].padStart(2, '0')}-${shoda[1].padStart(2, '0')}` : null;
}

export function precistDeskuEobec(html: string): PolozkaEobec[] {
  const polozky: PolozkaEobec[] = [];
  for (const blok of html.matchAll(/<div class="block_deska">([\s\S]*?)<div class="text_uredni_deska">([\s\S]*?)<\/div>/g)) {
    const id = /urednideska\.php\?soubor=(\d+)/.exec(blok[1])?.[1];
    // První odkaz je ikona typu souboru, název je v dalším odkazu na stejný soubor.
    const nazev = [...blok[1].matchAll(/<a [^>]*>([\s\S]*?)<\/a>/g)].map((m) => bezZnacek(m[1])).find(Boolean);
    if (!id || !nazev) continue;
    const data = [...blok[2].matchAll(/<strong>([^<]+)<\/strong>/g)].map((m) => naIso(bezZnacek(m[1])));
    polozky.push({ id, nazev, vyveseno: data[0] ?? null, sejmuto: data[1] ?? null });
  }
  return polozky;
}
