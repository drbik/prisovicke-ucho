import { MAX_NEZODPOVEZENO, MAX_VET, MAX_ZNAKU_CITACE, MAX_ZNAKU_NEZODPOVEZENO } from './prompt-odpovedi';
import type { NalezenyUsek } from './typy';

export interface VetaOdpovedi {
  veta: string;
  // Pořadí úseku v seznamu, který dostal model (od 1).
  usek: number;
  citace: string;
}

// Důvod jde do logu a do vyhodnocení, proto v něm nesmí být text dotazu ani odpovědi.
export type DuvodZamitnuti =
  | 'neplatny-json'
  | 'chybi-citace'
  | 'spatny-usek'
  | 'citace-neni-v-useku'
  | 'cislo-neni-v-citaci'
  | 'neplyne-z-citace'
  | 'soukroma-osoba';

export class ZamitnutaOdpoved extends Error {
  readonly duvod: DuvodZamitnuti;

  constructor(duvod: DuvodZamitnuti) {
    super(`Odpověď neprošla ověřením (${duvod}).`);
    this.duvod = duvod;
  }
}

// První celý objekt JSON ve výstupu. Model občas přidá ohraničení ```json nebo přebytečné závorky za objekt.
export function vyjmoutJson(vystup: string) {
  const zacatek = vystup.indexOf('{');
  if (zacatek === -1) throw new ZamitnutaOdpoved('neplatny-json');
  let hloubka = 0;
  let vRetezci = false;
  for (let i = zacatek; i < vystup.length; i += 1) {
    const znak = vystup[i];
    if (vRetezci) {
      if (znak === '\\') i += 1;
      else if (znak === '"') vRetezci = false;
    } else if (znak === '"') {
      vRetezci = true;
    } else if (znak === '{') {
      hloubka += 1;
    } else if (znak === '}' && --hloubka === 0) {
      try {
        return JSON.parse(vystup.slice(zacatek, i + 1)) as Record<string, unknown>;
      } catch {
        break;
      }
    }
  }
  throw new ZamitnutaOdpoved('neplatny-json');
}

// Výstup modelu se vždy čte kódem. Workers AI platný JSON nezaručuje.
export function precistOdpoved(vystup: string): VetaOdpovedi[] {
  const data = vyjmoutJson(vystup);
  if (!Array.isArray(data.vety)) throw new ZamitnutaOdpoved('neplatny-json');
  const vety = data.vety.map((polozka): VetaOdpovedi => {
    const p = (polozka ?? {}) as Record<string, unknown>;
    return {
      veta: typeof p.veta === 'string' ? p.veta.trim() : '',
      usek: typeof p.usek === 'number' ? p.usek : Number(p.usek),
      citace: typeof p.citace === 'string' ? p.citace.trim() : '',
    };
  }).filter((v) => v.veta);
  // Delší odpověď se zkrátí na první věty. Každá zbylá věta projde stejným ověřením.
  return vety.slice(0, MAX_VET);
}

// Části dotazu, na které model odpověď nenašel. Nejsou to tvrzení ze zdroje, jen oznámení, že odpověď chybí, takže se
// neověřují proti úryvkům. Z ostrých stránek se ale nesmí dostat nic, co by vypadalo jako údaj nebo odkaz.
export function precistNezodpovezeno(vystup: string): string[] {
  let data: Record<string, unknown>;
  try {
    data = vyjmoutJson(vystup);
  } catch {
    return [];
  }
  if (!Array.isArray(data.nezodpovezeno)) return [];
  return data.nezodpovezeno
    .filter((polozka): polozka is string => typeof polozka === 'string')
    .map((polozka) => polozka.replace(/\s+/g, ' ').trim())
    .filter((polozka) => polozka.length >= 3 && !/[\d@]|https?:|www\./iu.test(polozka))
    .map((polozka) => polozka.slice(0, MAX_ZNAKU_NEZODPOVEZENO))
    .filter((polozka, i, vse) => vse.indexOf(polozka) === i)
    .slice(0, MAX_NEZODPOVEZENO);
}

// Porovnání bez ohledu na mezery, velikost písmen a typografické varianty uvozovek a pomlček.
export function normalizovat(text: string) {
  return text
    .normalize('NFC')
    .replace(/[\u00ad\u200b]/g, '')
    .replace(/[„“”"«»]/g, '"')
    .replace(/[‚‘’']/g, "'")
    .replace(/[–—−‐‑]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, '')
    .toLowerCase();
}

// Čísla jako hodnoty: „4 000“, „4.000“ a „4000“ jsou totéž, úvodní nuly se nepočítají („07:30“ = „7:30“).
export function cislaVTextu(text: string) {
  const cisla = new Set<string>();
  const pridat = (cislo: string) => cisla.add(cislo.replace(/^0+(?=\d)/, ''));
  for (const skupina of text.matchAll(/\d{1,3}(?:[ \u00a0.]\d{3})+(?!\d)/g)) pridat(skupina[0].replace(/[ \u00a0.]/g, ''));
  for (const cislo of text.matchAll(/\d+/g)) pridat(cislo[0]);
  return cisla;
}

// Čísla věty: tisíce oddělené mezerou nebo tečkou se nejdřív spojí, aby „4 000“ nehledalo zvlášť 4 a 000.
// Samé nuly se nekontrolují: „11:00“ ve větě odpovídá „11 hod.“ ve zdroji.
function cislaVety(veta: string) {
  const spojene = veta.replace(/\d{1,3}(?:[ \u00a0.]\d{3})+(?!\d)/g, (skupina) => skupina.replace(/[ \u00a0.]/g, ''));
  return [...spojene.matchAll(/\d+/g)].map((m) => m[0].replace(/^0+(?=\d)/, '')).filter((cislo) => cislo !== '0');
}

// Citaci model občas složí ze dvou nesousedních vět téhož úseku. Části se pak hledají každá zvlášť,
// bez tečky nebo čárky na konci, kterou model za useknutou větu přidá. Výpustku mezi částmi (záhlaví tabulky … řádek)
// model píše sám, ta se do částí nepočítá.
const HRANICE_CASTI = /(?<=[.!?:;])\s+|\s*…\s*|\s+\.{3}\s+|\n+/;
const bezKoncoveInterpunkce = (text: string) => text.replace(/[.,;:]+$/, '');

function castiCitace(citace: string) {
  return citace.split(HRANICE_CASTI).map((cast) => cast.trim()).filter((cast) => normalizovat(cast).length >= 3);
}

// Je text (bez tečky na konci) doslova v úseku? Bez ohledu na mezery a velikost písmen.
export function jeTextVUseku(text: string, usek: NalezenyUsek) {
  return normalizovat(`${usek.hlavicka}\n${usek.text}`).includes(normalizovat(bezKoncoveInterpunkce(text)));
}

// Řádek tabulky s jejím záhlavím: model napíše záhlaví a řádek za sebou, i když jsou mezi nimi jiné řádky
// („Ceny pronájmu Vratná kauce o Přísálí 2.000 Kč…“). Citace se pak rozdělí na dvě části, z nichž první končí
// na konci řádku úseku a druhá začíná na začátku pozdějšího řádku. Kus řádku se s kusem jiného řádku spojit nedá.
const MIN_ZNAKU_RADKU = 5;

function zahlaviARadek(citace: string, usek: NalezenyUsek): string | null {
  let zdroj = '';
  const hranice = new Set<number>([0]);
  for (const radek of `${usek.hlavicka}\n${usek.text}`.split('\n')) {
    zdroj += normalizovat(radek);
    hranice.add(zdroj.length);
  }
  const vyskyty = (text: string) => {
    const mista: number[] = [];
    for (let i = zdroj.indexOf(text); i !== -1; i = zdroj.indexOf(text, i + 1)) mista.push(i);
    return mista;
  };
  const slova = citace.split(/\s+/);
  for (let k = 1; k < slova.length; k += 1) {
    const zahlavi = slova.slice(0, k).join(' ');
    const radek = slova.slice(k).join(' ');
    const nZahlavi = normalizovat(zahlavi);
    const nRadek = normalizovat(bezKoncoveInterpunkce(radek));
    if (nZahlavi.length < MIN_ZNAKU_RADKU || nRadek.length < MIN_ZNAKU_RADKU) continue;
    const konce = vyskyty(nZahlavi).map((i) => i + nZahlavi.length).filter((konec) => hranice.has(konec));
    if (!konce.length) continue;
    const prvniKonec = Math.min(...konce);
    if (vyskyty(nRadek).some((i) => i >= prvniKonec && hranice.has(i))) return `${zahlavi} … ${radek}`;
  }
  return null;
}

// Citace v podobě pro zobrazení: celá, když je v úseku doslova, jinak souvislé skupiny částí oddělené výpustkou.
// Null, když v úseku není.
function citaceVUseku(citace: string, usek: NalezenyUsek) {
  const zdroj = normalizovat(`${usek.hlavicka}\n${usek.text}`);
  const ocistena = citace.trim().replace(/^(?:\.{3}|…)\s*|\s*(?:\.{3}|…)$/g, '');
  const cela = normalizovat(ocistena);
  if (cela && zdroj.includes(cela)) return ocistena;
  const jeVUseku = (text: string) => zdroj.includes(normalizovat(bezKoncoveInterpunkce(text)));
  const casti = castiCitace(ocistena);
  if (casti.length < 2 || !casti.every(jeVUseku)) return zahlaviARadek(ocistena, usek);
  const skupiny: string[] = [];
  for (const cast of casti) {
    const posledni = skupiny[skupiny.length - 1];
    // Tečka na hranici může být ve zdroji (č. 179), nebo ji přidal model (kauce. Ve výši).
    const spojena = posledni === undefined
      ? undefined
      : [`${posledni} ${cast}`, `${bezKoncoveInterpunkce(posledni)} ${cast}`].find(jeVUseku);
    if (spojena) skupiny[skupiny.length - 1] = spojena;
    else skupiny.push(cast);
  }
  return skupiny.join(' … ');
}

// F-75, první vrstva: kód. Každá věta má citaci, citace je doslova v úseku a každé číslo věty je v citaci.
// Když je citace doslova v jiném nalezeném úseku, než model uvedl, zdroj se opraví na ten úsek.
export function overitKodem(vety: VetaOdpovedi[], useky: NalezenyUsek[]): VetaOdpovedi[] {
  return vety.map((veta) => {
    if (!veta.citace) throw new ZamitnutaOdpoved('chybi-citace');
    if (!Number.isInteger(veta.usek) || !useky[veta.usek - 1]) throw new ZamitnutaOdpoved('spatny-usek');
    if (veta.citace.length > MAX_ZNAKU_CITACE * 2) throw new ZamitnutaOdpoved('citace-neni-v-useku');
    const poradi = [veta.usek - 1, ...useky.keys()].filter((i, j, vse) => vse.indexOf(i) === j);
    let nalezeno: { index: number; citace: string } | null = null;
    for (const index of poradi) {
      const citace = citaceVUseku(veta.citace, useky[index]);
      if (citace) {
        nalezeno = { index, citace };
        break;
      }
    }
    if (!nalezeno) throw new ZamitnutaOdpoved('citace-neni-v-useku');
    // Číslo smí být i v názvu citovaného dokumentu, třeba datum zasedání v názvu zápisu. Datum zveřejnění ne.
    const povolena = new Set([...cislaVTextu(veta.citace), ...cislaVTextu(useky[nalezeno.index].dokument.nazev)]);
    if (cislaVety(veta.veta).some((cislo) => !povolena.has(cislo))) throw new ZamitnutaOdpoved('cislo-neni-v-citaci');
    return { veta: veta.veta, usek: nalezeno.index + 1, citace: nalezeno.citace };
  });
}

export function precistOvereni(vystup: string, pocetVet: number) {
  const data = vyjmoutJson(vystup);
  if (!Array.isArray(data.vysledky)) throw new ZamitnutaOdpoved('neplatny-json');
  const plyne = new Map<number, boolean>();
  for (const polozka of data.vysledky) {
    const p = (polozka ?? {}) as Record<string, unknown>;
    plyne.set(Number(p.cislo), p.plyne === true);
    // Jméno žadatele, nájemce a jiné soukromé osoby do odpovědi nepatří, i když ve zdroji je (12. 11. 2026).
    // Pole u každé věty: tvar se seznamem čísel vět psal model kratší, ale pak zamítal i věty bez jména.
    if (p.soukroma_osoba === true) throw new ZamitnutaOdpoved('soukroma-osoba');
  }
  // Věta bez výsledku se počítá jako neověřená.
  for (let cislo = 1; cislo <= pocetVet; cislo += 1) {
    if (plyne.get(cislo) !== true) throw new ZamitnutaOdpoved('neplyne-z-citace');
  }
}
