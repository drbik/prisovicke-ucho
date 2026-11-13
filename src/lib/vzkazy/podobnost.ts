// Opakovaný dotaz (13. 11. 2026, Tomáš): když se někdo zeptá na to, co už má odpověď, ucho ukáže odkaz na ni.
// Porovnávají se embeddingy (bge-m3) nového dotazu se zodpovězenými uloženými dotazy a zodpovězenými ukázkami.
import type { SluzbaAi } from '../ai/rozhrani';
import type { UkazkoveTema } from '../temata/temata';
import type { KandidatPodobnosti, UlozisteVzkazu } from './typy';

// Kosinová podobnost, od které je dotaz „totéž“. Na dvanácti párech dotazů (13. 11. 2026, bge-m3) měly stejné otázky
// jinými slovy 0,88 až 0,94, různé otázky nejvýš 0,79 (psi v Písečácích a koupaliště v Písečácích). Výjimkou byl
// „starosta a místostarosta“ proti „nový starosta“ (0,58), ten se nespojí. Podrobnosti v docs/feed-vzkazu.md.
export const PRAH_STEJNEHO_DOTAZU = 0.85;

export function kosinus(a: ArrayLike<number>, b: ArrayLike<number>) {
  if (a.length !== b.length || !a.length) return 0;
  let soucin = 0;
  let delkaA = 0;
  let delkaB = 0;
  for (let i = 0; i < a.length; i += 1) {
    soucin += a[i] * b[i];
    delkaA += a[i] * a[i];
    delkaB += b[i] * b[i];
  }
  return delkaA && delkaB ? soucin / Math.sqrt(delkaA * delkaB) : 0;
}

export function nejpodobnejsi(vektor: number[], kandidati: KandidatPodobnosti[], prah = PRAH_STEJNEHO_DOTAZU) {
  let nejlepsi: { id: string; nazev: string; podobnost: number } | null = null;
  for (const k of kandidati) {
    const podobnost = kosinus(vektor, k.vektor);
    if (podobnost >= prah && (!nejlepsi || podobnost > nejlepsi.podobnost)) nejlepsi = { id: k.id, nazev: k.nazev, podobnost };
  }
  return nejlepsi;
}

async function otisk(text: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash).slice(0, 8), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Zodpovězené ukázky dostanou embedding při prvním hledání a uloží se. Změněný text ukázky se spočítá znovu.
export async function kandidatiUkazek(ukazky: UkazkoveTema[], uloziste: UlozisteVzkazu, ai: SluzbaAi): Promise<KandidatPodobnosti[]> {
  const zodpovezene = ukazky.filter((t) => t.odpoved && t.typ === 'dotaz');
  const ulozene = await uloziste.vektoryUkazek();
  const otisky = await Promise.all(zodpovezene.map((t) => otisk(t.text)));
  const chybi = zodpovezene.filter((t, i) => ulozene.get(t.id)?.otisk !== otisky[i]);
  if (chybi.length) {
    const vektory = await ai.vektory(chybi.map((t) => t.text));
    await Promise.all(chybi.map((t, i) => {
      ulozene.set(t.id, { otisk: otisky[zodpovezene.indexOf(t)], vektor: new Float32Array(vektory[i]) });
      return uloziste.ulozitVektorUkazky(t.id, otisky[zodpovezene.indexOf(t)], vektory[i]);
    }));
  }
  return zodpovezene.flatMap((t) => {
    const ulozeny = ulozene.get(t.id);
    return ulozeny ? [{ id: t.id, nazev: t.nazev, vektor: ulozeny.vektor }] : [];
  });
}
