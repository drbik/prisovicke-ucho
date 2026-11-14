// Přehled témat na stránce ucha (předstupeň kroku 11, F-44). Dokud se vzkazy neukládají, ukazuje jen ukázková
// témata od týmu (rozhodnutí z 9. 11. 2026): jasně označená, bez vymyšlených autorů, hlasů a dat podání,
// s odpověďmi, které ucho skutečně vybralo ze zdrojů. Až přibude ukládání, nahradí soubor s ukázkami databáze.
import { OBLASTI, TYPY_PODNETU, jeOblast, jeTyp, type SlugOblasti, type TypPodnetu } from '../oblasti';
import type { CitovanyZdroj } from '../odpovedi/odpoved';
import { proHledani } from './normalizace';
import ukazky from './ukazky.json';

// Stavy tématu podle F-52. Ukázky používají jen dva z nich.
export const STAVY_TEMATU = {
  'zodpovezeno-z-webu': 'Zodpovězeno z webu',
  'ceka-na-spravce': 'Čeká na zastupitele',
} as const;

export type StavTematu = keyof typeof STAVY_TEMATU;

export interface OdpovedTematu {
  vety: { text: string; zdroj: number }[];
  zdroje: CitovanyZdroj[];
  oznaceni: string[];
}

export interface UkazkoveTema {
  id: string;
  nazev: string;
  // Text dotazu po AI úpravě a potvrzení autorem.
  text: string;
  typ: TypPodnetu;
  oblast: SlugOblasti;
  stav: StavTematu;
  odpoved?: OdpovedTematu;
  // Jen u čekajícího dotazu: vzory bez diakritiky, které v indexu zdrojů nesmí nic najít. Čekat smí jen dotaz,
  // ke kterému index opravdu nic nemá (pokyn z 11. 11. 2026). Hlídá to nastroje/index/kontrola-ukazek.ts.
  hlidat?: string[];
  // Adresy dokumentů, které tým prověřil: vzor v nich je, ale na dotaz neodpovídají (třeba jen žádost, kterou rada
  // neschválila). Kontrola je přeskočí. Tomáš 14. 11. 2026: dotaz čeká, dokud odpověď na webu opravdu není.
  hlidatKrome?: string[];
}

const POVOLENY_ZDROJ = /^https:\/\/(?:prisovice\.cz|nezavisli-prisovice\.cz)\//;
const KLICE_TEMATU = new Set(['id', 'nazev', 'text', 'typ', 'oblast', 'stav', 'odpoved', 'hlidat', 'hlidatKrome']);
const KLICE_ZDROJE = new Set(['cislo', 'url', 'nazev', 'datum', 'web', 'oznaceni', 'uryvek', 'misto']);

const jeText = (hodnota: unknown): hodnota is string => typeof hodnota === 'string' && hodnota.trim().length > 0;

function overitOdpoved(id: string, data: unknown): OdpovedTematu {
  const o = (data ?? {}) as Record<string, unknown>;
  const zdroje = Array.isArray(o.zdroje) ? o.zdroje as Record<string, unknown>[] : [];
  const vety = Array.isArray(o.vety) ? o.vety as Record<string, unknown>[] : [];
  const oznaceni = Array.isArray(o.oznaceni) ? o.oznaceni : [];
  if (!zdroje.length || !vety.length || !oznaceni.length || !oznaceni.every(jeText)) throw new Error(`Ukázka ${id}: odpověď nemá věty, zdroje nebo označení.`);
  for (const zdroj of zdroje) {
    const navic = Object.keys(zdroj).filter((klic) => !KLICE_ZDROJE.has(klic));
    if (navic.length) throw new Error(`Ukázka ${id}: zdroj má neznámá pole ${navic.join(', ')}.`);
    if (!Number.isInteger(zdroj.cislo) || !jeText(zdroj.url) || !POVOLENY_ZDROJ.test(zdroj.url)
      || !jeText(zdroj.nazev) || !jeText(zdroj.datum) || !jeText(zdroj.oznaceni) || !jeText(zdroj.uryvek)
      || typeof zdroj.misto !== 'string' || (zdroj.web !== 'prisovice.cz' && zdroj.web !== 'nezavisli-prisovice.cz')) {
      throw new Error(`Ukázka ${id}: zdroj nemá adresu z povoleného webu, název, datum nebo citaci.`);
    }
  }
  const cisla = new Set(zdroje.map((zdroj) => zdroj.cislo));
  for (const veta of vety) {
    if (!jeText(veta.text) || !cisla.has(veta.zdroj)) throw new Error(`Ukázka ${id}: věta nemá text nebo odkazuje na zdroj, který chybí.`);
  }
  return { vety, zdroje, oznaceni } as unknown as OdpovedTematu;
}

// Ukázky se při sestavení stránky kontrolují. Neznámé pole (třeba autor nebo počet hlasů) je chyba,
// stejně jako odpověď bez citace nebo zdroj mimo web obce a web Nezávislých.
export function overitUkazky(data: unknown): UkazkoveTema[] {
  if (!Array.isArray(data)) throw new Error('Ukázky nejsou seznam.');
  const pouzita = new Set<string>();
  return data.map((polozka): UkazkoveTema => {
    const t = (polozka ?? {}) as Record<string, unknown>;
    const id = jeText(t.id) ? t.id : '?';
    const navic = Object.keys(t).filter((klic) => !KLICE_TEMATU.has(klic));
    if (navic.length) throw new Error(`Ukázka ${id}: neznámá pole ${navic.join(', ')}.`);
    if (!jeText(t.id) || pouzita.has(t.id)) throw new Error(`Ukázka ${id}: chybí nebo se opakuje id.`);
    pouzita.add(t.id);
    if (!jeText(t.nazev) || !jeText(t.text) || !jeTyp(t.typ) || !jeOblast(t.oblast)) throw new Error(`Ukázka ${id}: chybí název, text, typ nebo oblast.`);
    if (typeof t.stav !== 'string' || !Object.hasOwn(STAVY_TEMATU, t.stav)) throw new Error(`Ukázka ${id}: neznámý stav.`);
    const zaklad = { id: t.id, nazev: t.nazev, text: t.text, typ: t.typ, oblast: t.oblast, stav: t.stav as StavTematu };
    if (zaklad.stav === 'zodpovezeno-z-webu') {
      // Z webu se hledá odpověď jen na dotaz (F-72).
      if (zaklad.typ !== 'dotaz') throw new Error(`Ukázka ${id}: odpověď z webu může mít jen dotaz.`);
      if (t.hlidat !== undefined) throw new Error(`Ukázka ${id}: hlídané vzory patří jen k čekajícímu dotazu.`);
      return { ...zaklad, odpoved: overitOdpoved(id, t.odpoved) };
    }
    if (t.odpoved !== undefined) throw new Error(`Ukázka ${id}: čekající téma nesmí mít odpověď.`);
    // Návrh a stížnost se na webu nehledají. Čekající dotaz musí říct, podle čeho se pozná, že index odpověď nemá.
    if (zaklad.typ !== 'dotaz') {
      if (t.hlidat !== undefined) throw new Error(`Ukázka ${id}: hlídané vzory patří jen k čekajícímu dotazu.`);
      return zaklad;
    }
    const hlidat = Array.isArray(t.hlidat) ? t.hlidat : [];
    if (!hlidat.length || !hlidat.every(jeText)) throw new Error(`Ukázka ${id}: čekající dotaz nemá hlídané vzory.`);
    for (const vzor of hlidat) {
      try {
        new RegExp(vzor, 'u');
      } catch {
        throw new Error(`Ukázka ${id}: hlídaný vzor ${vzor} není platný.`);
      }
    }
    const krome = t.hlidatKrome === undefined ? [] : Array.isArray(t.hlidatKrome) ? t.hlidatKrome : null;
    if (!krome || !krome.every((url) => jeText(url) && POVOLENY_ZDROJ.test(url) || (jeText(url) && url.startsWith('https://prisovice.e-obec.cz/')))) {
      throw new Error(`Ukázka ${id}: výjimky hlídaných vzorů musí být adresy zdrojů.`);
    }
    return { ...zaklad, hlidat, ...(krome.length ? { hlidatKrome: krome as string[] } : {}) };
  });
}

export const UKAZKOVA_TEMATA: UkazkoveTema[] = overitUkazky(ukazky.temata);

export function rozdelitTemata(temata: UkazkoveTema[]) {
  return {
    zodpovezena: temata.filter((t) => t.stav === 'zodpovezeno-z-webu'),
    cekajici: temata.filter((t) => t.stav === 'ceka-na-spravce'),
  };
}

export function nazevOblasti(slug: SlugOblasti) {
  return OBLASTI.find((oblast) => oblast.slug === slug)?.nazev ?? slug;
}

// Kde všude se v tématu hledá: název, text dotazu, typ, oblast a věty odpovědi.
export function textProHledani(tema: UkazkoveTema) {
  return proHledani([
    tema.nazev,
    tema.text,
    TYPY_PODNETU[tema.typ],
    nazevOblasti(tema.oblast),
    ...(tema.odpoved?.vety.map((veta) => veta.text) ?? []),
  ].join(' '));
}
