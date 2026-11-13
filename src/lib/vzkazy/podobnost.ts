// Podobná témata (F-34, 13. 11. 2026). Po potvrzení ucho nabídne nejvýš 3 témata stejného typu a autor rozhodne,
// jestli je to totéž, poddotaz, nebo jiné téma (F-35). Nic se nesloučí samo.
import type { SluzbaAi } from '../ai/rozhrani';
import type { TypPodnetu } from '../oblasti';
import type { UkazkoveTema } from '../temata/temata';
import type { UlozisteVzkazu, VektorUkazky } from './typy';

// Měření ve fázi A (docs/temata-feedu.md): žádný práh stejná a jiná témata neoddělí (správné téma nejníž 0,71,
// záludné jiné téma nejvýš 0,76), správné téma ale bylo vždy mezi třemi nejbližšími. Proto nabídka, ne sloučení.
export const PRAH_NABIDKY = 0.65;
export const MAX_NABIDKY = 3;

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

// Podobnost dvou vzkazů: vyšší z text proti textu a název proti názvu (měření: největší odstup správného tématu).
export function podobnostVzkazu(
  novy: { vektor: ArrayLike<number>; vektorNazvu: ArrayLike<number> | null },
  clen: { vektor: ArrayLike<number>; vektorNazvu: ArrayLike<number> | null },
) {
  const nazvy = novy.vektorNazvu && clen.vektorNazvu ? kosinus(novy.vektorNazvu, clen.vektorNazvu) : 0;
  return Math.max(kosinus(novy.vektor, clen.vektor), nazvy);
}

async function otisk(text: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash).slice(0, 8), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Ukázky dostanou embedding textu a názvu při prvním hledání a uloží se. Změněná ukázka se spočítá znovu.
export async function vektoryUkazek(ukazky: UkazkoveTema[], uloziste: UlozisteVzkazu, ai: SluzbaAi): Promise<Map<string, VektorUkazky>> {
  const ulozene = await uloziste.vektoryUkazek();
  const otisky = await Promise.all(ukazky.map((t) => otisk(`${t.text}\n${t.nazev}`)));
  const chybi = ukazky.map((t, i) => ({ t, otisk: otisky[i] }))
    .filter(({ t, otisk: o }) => ulozene.get(t.id)?.otisk !== o || !ulozene.get(t.id)?.vektorNazvu);
  if (chybi.length) {
    const vektory = await ai.vektory(chybi.flatMap(({ t }) => [t.text, t.nazev]));
    await Promise.all(chybi.map(({ t, otisk: o }, i) => {
      const [vektor, vektorNazvu] = [vektory[2 * i], vektory[2 * i + 1]];
      ulozene.set(t.id, { otisk: o, vektor: new Float32Array(vektor), vektorNazvu: new Float32Array(vektorNazvu) });
      return uloziste.ulozitVektorUkazky(t.id, o, vektor, vektorNazvu);
    }));
  }
  return new Map(ukazky.flatMap((t) => (ulozene.has(t.id) ? [[t.id, ulozene.get(t.id)!]] : [])));
}

export interface PodobneTema {
  id: string;
  podobnost: number;
}

// Nejbližší témata stejného typu. Podobnost tématu je nejvyšší podobnost s některým jeho vzkazem nebo s ukázkou,
// takže téma s víc vzkazy pozná víc formulací. Téma, ve kterém už vzkaz je (autor se vrátil k úpravám), se nenabídne.
export async function najitPodobnaTemata(
  novy: { vektor: number[]; vektorNazvu: number[] | null },
  typ: TypPodnetu,
  z: { uloziste: UlozisteVzkazu; ai: SluzbaAi; ukazky: UkazkoveTema[] },
  vyloucitVzkaz?: string,
  prah = PRAH_NABIDKY,
): Promise<PodobneTema[]> {
  const { clenove, vyloucena } = await z.uloziste.vektoryTemat(typ);
  const zakazana = new Set(vyloucena);
  for (const c of clenove) if (c.vzkazId === vyloucitVzkaz) zakazana.add(c.temaId);
  const skore = new Map<string, number>();
  const zapsat = (id: string, podobnost: number) => skore.set(id, Math.max(skore.get(id) ?? 0, podobnost));
  for (const c of clenove) zapsat(c.temaId, podobnostVzkazu(novy, c));
  const ukazky = await vektoryUkazek(z.ukazky.filter((t) => t.typ === typ && !zakazana.has(t.id)), z.uloziste, z.ai);
  for (const [id, v] of ukazky) zapsat(id, podobnostVzkazu(novy, v));
  return [...skore]
    .filter(([id, podobnost]) => !zakazana.has(id) && podobnost >= prah)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_NABIDKY)
    .map(([id, podobnost]) => ({ id, podobnost: Math.round(podobnost * 1000) / 1000 }));
}
