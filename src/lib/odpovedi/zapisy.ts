// Dotazy na „poslední zasedání“ (Tomáš 14. 11. 2026): o tom, co se řešilo naposledy, nerozhoduje význam textu, ale datum
// zasedání. Hledání podle podobnosti na takový dotaz vrací zápisy ze všech let. Proto se nejnovější zápis rady nebo
// zastupitelstva najde podle data v názvu a model z něj udělá souhrn stejnou cestou jako jindy: věty s doslovnou citací.
import type { NalezenyUsek } from './typy';
import { hlavickaUseku } from './zdroje';

export type OrganObce = 'rada' | 'zastupitelstvo';

// \b u českých písmen nefunguje (slovo končí na „í“), proto se hranice slova hlídá přes \p{L}.
const POSLEDNI = /(?<![\p{L}])(posledn[\p{L}]*|nejnov[\p{L}]*|naposledy|minul[\p{L}]*)(?![\p{L}])/iu;
const UDALOST = /(zasedání|zasedani|jednání|jednani|schůz|schuz|zápis|zapis|usnesení|usneseni)/iu;
const ZASTUPITELSTVO = /zastupitelstv/iu;
const RADA = /(^|[^\p{L}])(rad[aěyuo]|radou)([^\p{L}]|$)/iu;

// Který orgán dotaz míní. Bez označení orgánu platí oba, když se dotaz ptá na „zápis“.
export function rozpoznatPosledniZapis(dotaz: string): OrganObce[] | null {
  if (!POSLEDNI.test(dotaz) || !UDALOST.test(dotaz)) return null;
  const organy: OrganObce[] = [];
  if (RADA.test(dotaz)) organy.push('rada');
  if (ZASTUPITELSTVO.test(dotaz)) organy.push('zastupitelstvo');
  if (organy.length) return organy;
  return /zápis|zapis/iu.test(dotaz) ? ['rada', 'zastupitelstvo'] : null;
}

// Datum zasedání z názvu zápisu: „Zápis č. 14/2026 z jednání rady obce konaného dne 07.10.2026“. Vrací RRRR-MM-DD.
export function datumZasedani(nazev: string): string | null {
  const shody = [...nazev.matchAll(/dne\s+(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/giu)];
  const posledni = shody.at(-1);
  return posledni ? `${posledni[3]}-${posledni[2].padStart(2, '0')}-${posledni[1].padStart(2, '0')}` : null;
}

// Vzor názvu zápisu pro SQL LIKE a pro paměťový index.
export const VZOR_NAZVU_ZAPISU: Record<OrganObce, string> = {
  rada: '%rady obce%',
  zastupitelstvo: '%zastupitelstva obce%',
};

export function jeZapisOrganu(nazev: string, organ: OrganObce) {
  return /^Zápis/u.test(nazev) && nazev.toLowerCase().includes(VZOR_NAZVU_ZAPISU[organ].replaceAll('%', ''));
}

// Usnesení zápisu doslova, bez hlasování: „Usnesení UZ č. 58/2026 – Zastupitelstvo obce volí místostarostou …“.
const USNESENI = /Usnesení\s+U[RZ]\s*č\.\s*(\d+\/\d{4})\s*[–-][\s\S]*?(?=\n\s*Hlasování|\n\s*Usnesení\s+U[RZ]|$)/gu;
const MAX_ZNAKU_USNESENI = 400;
const MAX_ZNAKU_PREHLEDU = 6000;

// Souhrn zasedání (14. 11. 2026, Tomáš: „tam se probíralo víc věcí“): začátek zápisu má jen formality (zahájení, slib,
// ověřovatelé), důležité je až v usneseních rozesetých po celém zápisu. Model proto dostane první úsek (hlavička
// a program) a k němu úsek se všemi usneseními zápisu. Každé usnesení je doslovný výňatek ze zápisu, citace tedy
// projde stejnou kontrolou jako jinde. Úseky se překrývají, stejné usnesení se vezme jednou (nejdelší výňatek).
export function vybratProSouhrn(useky: NalezenyUsek[]): NalezenyUsek[] {
  if (!useky.length) return [];
  const serazene = [...useky].sort((a, b) => a.poradi - b.poradi);
  const usneseni = new Map<string, string>();
  for (const usek of serazene) {
    for (const shoda of usek.text.matchAll(USNESENI)) {
      const text = shoda[0].trim().slice(0, MAX_ZNAKU_USNESENI);
      if (text.length > (usneseni.get(shoda[1])?.length ?? 0)) usneseni.set(shoda[1], text);
    }
  }
  const prvni = serazene[0];
  if (!usneseni.size) return serazene.slice(0, 3);
  let text = '';
  for (const u of usneseni.values()) {
    if (text.length + u.length > MAX_ZNAKU_PREHLEDU) break;
    text += `${text ? '\n\n' : ''}${u}`;
  }
  const prehled: NalezenyUsek = { ...prvni, id: `${prvni.dokumentId}-usneseni`, strana: null, hlavicka: hlavickaUseku(prvni.dokument, null), text };
  return [prvni, prehled];
}

// Z názvů vybere nejnovější podle data zasedání.
export function nejnovejsiZapis<T extends { nazev: string }>(zapisy: T[]): T | null {
  return zapisy
    .flatMap((z) => {
      const datum = datumZasedani(z.nazev);
      return datum ? [{ z, datum }] : [];
    })
    .sort((a, b) => b.datum.localeCompare(a.datum))[0]?.z ?? null;
}
