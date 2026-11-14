import type { SluzbaAi } from '../ai/rozhrani';
import { PRAH_PODOBNOSTI, hledatUseky, type VysledekHledani } from './hledani';
import { oddilCitace } from './misto';
import {
  ZamitnutaOdpoved,
  jeTextVUseku,
  overeneVetySouhrnu,
  overitKodem,
  overitKodemSouhrn,
  precistNezodpovezeno,
  precistOdpoved,
  precistOvereni,
  type DuvodZamitnuti,
} from './overeni';
import { MAX_VET, MAX_VET_SOUHRNU, VERZE_PROMPTU_ODPOVEDI, datumDnes, zpravyOdpovedi, zpravyOvereni } from './prompt-odpovedi';
import type { IndexZdroju } from './rozhrani';
import type { NalezenyUsek, WebZdroje } from './typy';
import { OZNACENI_ZDROJE, UPOZORNENI, datumZdroje, odkazNaZdroj } from './zdroje';
import { rozpoznatPosledniZapis, vybratProSouhrn } from './zapisy';

export interface CitovanyZdroj {
  cislo: number;
  url: string;
  nazev: string;
  datum: string;
  web: WebZdroje;
  oznaceni: string;
  uryvek: string;
  // Kde v dokumentu citace stojí: „strana 5, čl. 9“. U stránek webu a karet prázdné.
  misto: string;
}

export interface VetaZobrazene {
  text: string;
  zdroj: number;
}

// Zodpovězená část dotazu, který se ptal na víc věcí. Stránka ukáže otázku a pod ní její věty.
export interface ZodpovezenaCast {
  otazka: string;
  vety: VetaZobrazene[];
  // Část odpovědi tématu, kterou právě doplnil poddotaz (13. 11. 2026, F-37).
  nova?: boolean;
}

export interface ZobrazenaOdpoved {
  // Všechny věty odpovědi v pořadí. U dotazu na víc věcí jsou navíc rozdělené podle částí v poli casti.
  vety: VetaZobrazene[];
  casti?: ZodpovezenaCast[];
  zdroje: CitovanyZdroj[];
  // Části dotazu, na které zdroje neodpovídají. Odpověď je tak částečná a zbytek převezmou zastupitelé.
  nezodpovezeno: string[];
  oznaceni: string[];
  upozorneni: string;
}

export type DuvodPredani =
  | 'nic-nenalezeno'
  | 'model-nevi'
  | 'chyba-ai'
  | DuvodZamitnuti;

export interface TechnickeOdpovedi {
  useku: number;
  nejlepsiPodobnost: number;
  // Kolik úseků šlo do modelu díky přeřazení.
  prerazeno: number;
  hledaniMs: number;
  odpovedMs?: number;
  overeniMs?: number;
  model: string;
  verzePromptu: number;
  // Dotaz rozdělený na části: kolik jich bylo, kolik dostalo odpověď a proč ostatní ne. Bez textu dotazu.
  casti?: number;
  castiZodpovezeno?: number;
  duvodyCasti?: DuvodPredani[];
  rozdeleniMs?: number;
  // Kolik citací model neopsal doslova a kód je nahradil přesným zněním zdroje.
  opravenoCitaci?: number;
  // Kolikrát se odpověď zkusila znovu po technické chybě modelu (bez textu, jen počet).
  opakovano?: number;
}

export type VysledekOdpovedi =
  | { vysledek: 'odpoved'; odpoved: ZobrazenaOdpoved; technicke: TechnickeOdpovedi }
  | { vysledek: 'zastupitelum'; duvod: DuvodPredani; technicke: TechnickeOdpovedi };

export interface ZavislostiOdpovedi {
  ai: SluzbaAi;
  index: IndexZdroju;
  ted?: () => number;
  prahPodobnosti?: number;
  // Jen pro vyhodnocení (8.8): které úseky hledání našlo. Do logu nic z toho nejde.
  naHledani?: (useky: NalezenyUsek[], nejlepsiPodobnost: number) => void;
}

const MAX_TOKENU_ODPOVEDI = 900;
const MAX_POKUSU_ODPOVEDI = 2;
// Souhrn zasedání: kolik ověřených bodů musí zůstat a víc tokenů na ověření sedmi vět.
const MIN_VET_SOUHRNU = 2;
const MAX_TOKENU_OVERENI_SOUHRNU = 400;
const TEPLOTA_OPAKOVANI = 0.3;
// Jen chyby, které vznikají tvarem výstupu modelu, ne obsahem: neplatný JSON, špatně opsaná citace, špatné číslo úseku
// a falešný poplach ověření u firmy nebo podnikatele. Rozpor se zdrojem (neplyne-z-citace) se neopakuje.
const DUVODY_K_OPAKOVANI = new Set<DuvodZamitnuti>(['neplatny-json', 'chybi-citace', 'spatny-usek', 'citace-neni-v-useku', 'cislo-neni-v-citaci', 'soukroma-osoba']);
const MAX_TOKENU_OVERENI = 200;

// Odpověď ukáže citace v pořadí prvního použití. Jeden odkaz (dokument, u PDF strana) je jeden zdroj,
// i když z něj čerpá víc vět nebo víc úseků.
function sestavitOdpoved(vety: { veta: string; usek: number; citace: string }[], useky: NalezenyUsek[], nezodpovezeno: string[]): ZobrazenaOdpoved {
  const poradi = new Map<string, number>();
  const zdroje: CitovanyZdroj[] = [];
  // Oddíly dokumentu (čl. 9, § 12), ve kterých citace stojí. Odvozuje je kód z textu úseku.
  const oddily = new Map<number, string[]>();
  const vystup = vety.map((veta) => {
    const usek = useky[veta.usek - 1];
    const url = odkazNaZdroj(usek.dokument, usek.strana);
    let cislo = poradi.get(url);
    if (cislo === undefined) {
      cislo = zdroje.length + 1;
      poradi.set(url, cislo);
      zdroje.push({
        cislo,
        url,
        nazev: usek.dokument.nazev,
        datum: datumZdroje(usek.dokument),
        web: usek.dokument.web,
        oznaceni: OZNACENI_ZDROJE[usek.dokument.web],
        uryvek: veta.citace,
        misto: '',
      });
    } else if (!zdroje[cislo - 1].uryvek.includes(veta.citace)) {
      // Citace dvou vět ze stejného úseku: když v něm jdou za sebou, spojí se bez výpustky.
      const souvisla = `${zdroje[cislo - 1].uryvek} ${veta.citace}`;
      zdroje[cislo - 1].uryvek = jeTextVUseku(souvisla, usek) ? souvisla : `${zdroje[cislo - 1].uryvek} … ${veta.citace}`;
    }
    const oddil = oddilCitace(usek, veta.citace);
    if (oddil) oddily.set(cislo, [...new Set([...(oddily.get(cislo) ?? []), oddil])]);
    return { text: veta.veta, zdroj: cislo };
  });
  for (const zdroj of zdroje) {
    const usek = useky.find((u) => odkazNaZdroj(u.dokument, u.strana) === zdroj.url);
    zdroj.misto = [usek?.dokument.typ === 'pdf' && usek.strana ? `strana ${usek.strana}` : null, ...(oddily.get(zdroj.cislo) ?? [])]
      .filter(Boolean)
      .join(', ');
  }
  return {
    vety: vystup,
    zdroje,
    nezodpovezeno,
    oznaceni: [...new Set(zdroje.map((z) => z.oznaceni))],
    upozorneni: UPOZORNENI,
  };
}

// Nejvíc úseků jednoho zápisu, ze kterých se sbírají usnesení. Ustavující zasedání zastupitelstva 4. 11. 2026 jich má 31.
const MAX_USEKU_ZAPISU = 80;

// Nejnovější zápis každého orgánu, na který se dotaz ptá: začátek s programem a přehled všech usnesení (vybratProSouhrn).
async function hledatNejnovejsiZapis(dotaz: string, index: IndexZdroju): Promise<VysledekHledani | null> {
  const organy = rozpoznatPosledniZapis(dotaz);
  if (!organy || !index.nejnovejsiZapis) return null;
  const useky = (await Promise.all(organy.map(async (organ) => vybratProSouhrn(await index.nejnovejsiZapis!(organ, MAX_USEKU_ZAPISU))))).flat();
  return useky.length ? { useky, nejlepsiPodobnost: 1, shodVektoru: 0, shodSlov: 0, prerazeno: 0 } : null;
}

// F-73 až F-76: hledání, odpověď jen z úryvků a ověření. Když cokoli neprojde, dotaz jde zastupitelům.
export async function odpovedetNaDotaz(dotaz: string, z: ZavislostiOdpovedi): Promise<VysledekOdpovedi> {
  const ted = z.ted ?? Date.now;
  const zacatek = ted();
  // „Co se řešilo na posledním zasedání rady?“: nejnovější zápis se najde podle data, ne podle podobnosti (14. 11. 2026).
  const zapis = await hledatNejnovejsiZapis(dotaz, z.index);
  const souhrn = zapis !== null;
  const hledani = zapis ?? await (async () => {
    const [vektor] = await z.ai.vektory([dotaz]);
    const preradit = z.ai.preradit ? (text: string, texty: string[]) => z.ai.preradit!(text, texty) : undefined;
    return hledatUseky(z.index, vektor, dotaz, undefined, preradit);
  })();
  z.naHledani?.(hledani.useky, hledani.nejlepsiPodobnost);
  const technicke: TechnickeOdpovedi = {
    useku: hledani.useky.length,
    nejlepsiPodobnost: Math.round(hledani.nejlepsiPodobnost * 1000) / 1000,
    prerazeno: hledani.prerazeno,
    hledaniMs: ted() - zacatek,
    model: z.ai.modelOdpovedi,
    verzePromptu: VERZE_PROMPTU_ODPOVEDI,
  };
  if (!hledani.useky.length || hledani.nejlepsiPodobnost < (z.prahPodobnosti ?? PRAH_PODOBNOSTI)) {
    return { vysledek: 'zastupitelum', duvod: 'nic-nenalezeno', technicke };
  }

  // Technická chyba modelu (poškozený JSON, citace neopsaná doslova) nebo falešný poplach u dodavatele s IČ se zkusí jednou
  // znovu s mírně vyšší teplotou (14. 11. 2026: sedm z patnácti správných odpovědí o zápisech rady se zahodilo kvůli tomu).
  // Každý pokus prochází celým ověřením, opakování tedy nic nepouští bez opory ve zdroji.
  for (let pokus = 1; ; pokus += 1) {
    const predOdpovedi = ted();
    const vystup = await z.ai.generovat(zpravyOdpovedi(dotaz, hledani.useky, datumDnes(ted()), souhrn), {
      maxTokenu: MAX_TOKENU_ODPOVEDI,
      ...(pokus > 1 ? { teplota: TEPLOTA_OPAKOVANI } : {}),
    });
    technicke.odpovedMs = (technicke.odpovedMs ?? 0) + (ted() - predOdpovedi);
    try {
      const navrzene = precistOdpoved(vystup, souhrn ? MAX_VET_SOUHRNU : MAX_VET);
      if (!navrzene.length) return { vysledek: 'zastupitelum', duvod: 'model-nevi', technicke };
      // Souhrn zasedání vynechá jednotlivé neověřené body, běžná odpověď při jakékoli chybě jde zastupitelům (F-75).
      let vety = souhrn ? overitKodemSouhrn(navrzene, hledani.useky) : overitKodem(navrzene, hledani.useky);
      if (souhrn && vety.length < MIN_VET_SOUHRNU) throw new ZamitnutaOdpoved('citace-neni-v-useku');
      technicke.opravenoCitaci = vety.filter((v) => v.opravenaCitace).length;
      const predOverenim = ted();
      const kOvereni = vety.map((v) => ({ ...v, zdroj: hledani.useky[v.usek - 1].hlavicka }));
      const overeni = await z.ai.generovat(zpravyOvereni(dotaz, kOvereni, datumDnes(ted())), { maxTokenu: souhrn ? MAX_TOKENU_OVERENI_SOUHRNU : MAX_TOKENU_OVERENI });
      technicke.overeniMs = (technicke.overeniMs ?? 0) + (ted() - predOverenim);
      if (souhrn) {
        const prosla = overeneVetySouhrnu(overeni, vety.length);
        if (prosla.length < MIN_VET_SOUHRNU) throw new ZamitnutaOdpoved('neplyne-z-citace');
        vety = prosla.map((i) => vety[i]);
      } else {
        precistOvereni(overeni, vety.length);
      }
      return { vysledek: 'odpoved', odpoved: sestavitOdpoved(vety, hledani.useky, precistNezodpovezeno(vystup)), technicke };
    } catch (chyba) {
      if (!(chyba instanceof ZamitnutaOdpoved)) throw chyba;
      if (pokus < MAX_POKUSU_ODPOVEDI && DUVODY_K_OPAKOVANI.has(chyba.duvod)) {
        technicke.opakovano = pokus;
        continue;
      }
      return { vysledek: 'zastupitelum', duvod: chyba.duvod, technicke };
    }
  }
}
