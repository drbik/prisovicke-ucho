import { MAX_NEZODPOVEZENO, MAX_VET, MAX_ZNAKU_CITACE, MAX_ZNAKU_NEZODPOVEZENO } from './prompt-odpovedi';
import type { NalezenyUsek } from './typy';

export interface VetaOdpovedi {
  veta: string;
  // Pořadí úseku v seznamu, který dostal model (od 1).
  usek: number;
  citace: string;
  // Model citaci neopsal doslova a kód ji nahradil přesným zněním zdroje (citaceSOdchylkou).
  opravenaCitace?: boolean;
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
// Výpustku v závorce („[...]“) píše model taky (12. 11. 2026, seznam pozemků k pronájmu).
const HRANICE_CASTI = /(?<=[.!?:;])\s+|\s*[[(](?:…|\.{3})[\])]\s*|\s*…\s*|\s+\.{3}\s+|\n+/;
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

// Citace s odchylkou (12. 11. 2026). Model při opisu občas změní koncovku slova, třeba „vratné kauce“ místo
// „vratná kauce“, a kontrola by zahodila celou část dotazu. Když citace doslova v úseku není, hledá se po slovech:
// stejný počet slov za sebou, čísla a slova kratší než 4 znaky přesně, delší slovo se smí lišit jen koncovkou
// (společný začátek aspoň 3 znaky, koncovka nejvýš 3 znaky) a takových slov je nejvýš jedno na 8 slov citace.
// Interpunkce se nepočítá a číslo se od písmen odděluje („4987m2“ = „4987 m2“). Do odpovědi, k ověření modelem
// i ke kontrole čísel jde přesné znění zdroje, ne opis modelu.
const SLOVO = /[\p{L}\u00ad\u200b]+|\p{N}+/gu;
// Kratší citace (a kratší část citace) musí sedět slovo po slově přesně.
const MIN_SLOV_S_ODCHYLKOU = 4;
const MIN_ZNAKU_SLOVA_S_ODCHYLKOU = 4;
const MIN_KMENE = 3;
const MAX_KONCOVKY = 3;
const SLOV_NA_ODCHYLKU = 8;
const MAX_ODCHYLEK = 3;

interface SlovoTextu {
  slovo: string;
  od: number;
  do: number;
}

function slovaTextu(text: string): SlovoTextu[] {
  return [...text.matchAll(SLOVO)]
    .map((m) => ({ slovo: m[0].replace(/[\u00ad\u200b]/g, '').toLowerCase(), od: m.index, do: m.index + m[0].length }))
    .filter((s) => s.slovo);
}

function lisiSeKoncovkou(a: string, b: string) {
  if (/\d/.test(a) || /\d/.test(b)) return false;
  if (a.length < MIN_ZNAKU_SLOVA_S_ODCHYLKOU || b.length < MIN_ZNAKU_SLOVA_S_ODCHYLKOU) return false;
  let kmen = 0;
  while (kmen < a.length && kmen < b.length && a[kmen] === b[kmen]) kmen += 1;
  return kmen >= MIN_KMENE && a.length - kmen <= MAX_KONCOVKY && b.length - kmen <= MAX_KONCOVKY;
}

// Úsek zdroje, který se s textem shoduje slovo po slově s nejmenším počtem povolených odchylek.
function najitPoSlovech(text: string, slovaZdroje: SlovoTextu[]) {
  const slova = slovaTextu(text).map((s) => s.slovo);
  if (!slova.length) return null;
  const povoleno = slova.length < MIN_SLOV_S_ODCHYLKOU ? 0 : Math.min(MAX_ODCHYLEK, Math.max(1, Math.floor(slova.length / SLOV_NA_ODCHYLKU)));
  let nejlepsi: { prvni: number; odchylek: number } | null = null;
  for (let prvni = 0; prvni + slova.length <= slovaZdroje.length; prvni += 1) {
    let odchylek = 0;
    for (let i = 0; i < slova.length && odchylek <= povoleno; i += 1) {
      const zdroj = slovaZdroje[prvni + i].slovo;
      if (zdroj === slova[i]) continue;
      odchylek = lisiSeKoncovkou(zdroj, slova[i]) ? odchylek + 1 : povoleno + 1;
    }
    if (odchylek <= povoleno && (!nejlepsi || odchylek < nejlepsi.odchylek)) nejlepsi = { prvni, odchylek };
  }
  return nejlepsi && { prvni: nejlepsi.prvni, posledni: nejlepsi.prvni + slova.length - 1 };
}

function citaceSOdchylkou(citace: string, usek: NalezenyUsek): string | null {
  const zdroj = `${usek.hlavicka}\n${usek.text}`.normalize('NFC');
  const slovaZdroje = slovaTextu(zdroj);
  const ocistena = citace.normalize('NFC').trim().replace(/^(?:\.{3}|…)\s*|\s*(?:\.{3}|…)$/g, '');
  const cela = najitPoSlovech(ocistena, slovaZdroje);
  const casti = castiCitace(ocistena);
  const nalezene = cela ? [cela] : casti.length >= 2 ? casti.map((cast) => najitPoSlovech(cast, slovaZdroje)) : [];
  if (!nalezene.length || nalezene.some((n) => !n)) return null;
  // Části, které ve zdroji jdou hned za sebou, se spojí do jedné citace bez výpustky.
  const skupiny: { prvni: number; posledni: number }[] = [];
  for (const n of nalezene as { prvni: number; posledni: number }[]) {
    const posledni = skupiny[skupiny.length - 1];
    if (posledni && n.prvni === posledni.posledni + 1) posledni.posledni = n.posledni;
    else skupiny.push({ ...n });
  }
  // Zalomení řádků z PDF by stránka ukázala uprostřed věty (citace má white-space: pre-line).
  return skupiny.map((s) => zdroj.slice(slovaZdroje[s.prvni].od, slovaZdroje[s.posledni].do).replace(/\s+/g, ' ')).join(' … ');
}

// F-75, první vrstva: kód. Každá věta má citaci, citace je v úseku a každé číslo věty je v citaci.
// Když je citace v jiném nalezeném úseku, než model uvedl, zdroj se opraví na ten úsek. Doslovná shoda má přednost
// před shodou s odchylkou v kterémkoli úseku.
export function overitKodem(vety: VetaOdpovedi[], useky: NalezenyUsek[]): VetaOdpovedi[] {
  return vety.map((veta) => {
    if (!veta.citace) throw new ZamitnutaOdpoved('chybi-citace');
    if (!Number.isInteger(veta.usek) || !useky[veta.usek - 1]) throw new ZamitnutaOdpoved('spatny-usek');
    if (veta.citace.length > MAX_ZNAKU_CITACE * 2) throw new ZamitnutaOdpoved('citace-neni-v-useku');
    const poradi = [veta.usek - 1, ...useky.keys()].filter((i, j, vse) => vse.indexOf(i) === j);
    let nalezeno: { index: number; citace: string; opravena: boolean } | null = null;
    for (const [hledat, opravena] of [[citaceVUseku, false], [citaceSOdchylkou, true]] as const) {
      for (const index of poradi) {
        const citace = hledat(veta.citace, useky[index]);
        if (citace) {
          nalezeno = { index, citace, opravena };
          break;
        }
      }
      if (nalezeno) break;
    }
    if (!nalezeno) throw new ZamitnutaOdpoved('citace-neni-v-useku');
    // Číslo smí být i v názvu citovaného dokumentu, třeba datum zasedání v názvu zápisu. Datum zveřejnění ne.
    const povolena = new Set([...cislaVTextu(nalezeno.citace), ...cislaVTextu(useky[nalezeno.index].dokument.nazev)]);
    if (cislaVety(veta.veta).some((cislo) => !povolena.has(cislo))) throw new ZamitnutaOdpoved('cislo-neni-v-citaci');
    return {
      veta: veta.veta,
      usek: nalezeno.index + 1,
      citace: nalezeno.citace,
      ...(nalezeno.opravena ? { opravenaCitace: true } : {}),
    };
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
