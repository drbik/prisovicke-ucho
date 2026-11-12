// Dotaz po částech (12. 11. 2026). AI dotaz rozdělí na samostatné otázky a každá projde hledáním, odpovědí
// a ověřením zvlášť. Část dotazu tak nepřehluší ostatní a chyba v jedné části nezahodí odpovědi na ostatní.
// Průběh (rozdělení, hotová část) se hlásí stránce, aby autor viděl, co se děje.
import type { SluzbaAi } from '../ai/rozhrani';
import { sLimitem } from '../podani/zpracovani';
import {
  odpovedetNaDotaz,
  type CitovanyZdroj,
  type DuvodPredani,
  type TechnickeOdpovedi,
  type VetaZobrazene,
  type VysledekOdpovedi,
  type ZavislostiOdpovedi,
  type ZodpovezenaCast,
} from './odpoved';
import { cislaVTextu, vyjmoutJson } from './overeni';
import { MAX_CASTI, MAX_ZNAKU_CASTI, VERZE_PROMPTU_ODPOVEDI, zpravyRozdeleni } from './prompt-odpovedi';
import { UPOZORNENI } from './zdroje';

// Jedna část dotazu má na hledání, odpověď a ověření stejný čas jako dřív celý dotaz (PRD, Rychlost).
export const LIMIT_CASTI_MS = 25_000;
// Rozdělení je krátké volání (obvykle 1 až 2 s). Když nestihne, platí celý dotaz jako jedna část, jehož hledání
// už běží. Dotaz na jednu věc tak na rozdělení čeká nejvýš 3 s (ve 3. běhu sady 12. 11. 2026 čekala Q18 na
// rozdělení 5 s, i když odpověď měla za 1,1 s).
export const LIMIT_ROZDELENI_MS = 3_000;
const MAX_TOKENU_ROZDELENI = 400;
// Kolik nezodpovězených částí stránka ukáže u dotazu na víc věcí.
const MAX_NEZODPOVEZENO_CELKEM = 6;

export type PrubehOdpovedi =
  | { udalost: 'casti'; casti: string[] }
  | { udalost: 'cast'; cislo: number; vysledek: 'odpoved' | 'zastupitelum' };

export interface ZavislostiCasti extends ZavislostiOdpovedi {
  limitCastiMs?: number;
  limitRozdeleniMs?: number;
  // Výpadek AI u jedné části. Jde jen do logu, stránka se dozví jen to, že část odpověď nemá.
  priChybe?: (chyba: unknown) => void;
}

const bezMezer = (text: string) => text.replace(/\s+/g, ' ').trim();

// Výstup rozdělení se čte kódem. Null znamená, že rozdělení neplatí a hledá se celý dotaz.
// Otázka nesmí přinést číslo, které v dotazu není: rozdělení nesmí nic přidat.
export function precistCasti(vystup: string, dotaz: string): string[] | null {
  let data: Record<string, unknown>;
  try {
    data = vyjmoutJson(vystup);
  } catch {
    return null;
  }
  if (!Array.isArray(data.casti)) return null;
  const casti = data.casti
    .filter((cast): cast is string => typeof cast === 'string')
    .map(bezMezer)
    .filter((cast, i, vse) => cast.length >= 5 && vse.indexOf(cast) === i);
  if (!casti.length || casti.length > MAX_CASTI || casti.some((cast) => cast.length > MAX_ZNAKU_CASTI)) return null;
  const cislaDotazu = cislaVTextu(dotaz);
  if (casti.some((cast) => [...cislaVTextu(cast)].some((cislo) => !cislaDotazu.has(cislo)))) return null;
  return casti;
}

// Dotaz na jednu věc se hledá v autorově znění. Přeformulovaná otázka hledala v sadě typových otázek hůř
// (Q10, Q15) a jednou do ní model vložil cizí slovo (12. 11. 2026).
export async function rozdelitDotaz(dotaz: string, ai: SluzbaAi, limitMs = LIMIT_ROZDELENI_MS): Promise<string[]> {
  try {
    const vystup = await sLimitem(ai.generovat(zpravyRozdeleni(dotaz), { maxTokenu: MAX_TOKENU_ROZDELENI }), limitMs);
    const casti = precistCasti(vystup, dotaz);
    return casti && casti.length > 1 ? casti : [dotaz];
  } catch {
    return [dotaz];
  }
}

function prazdneTechnicke(ai: SluzbaAi): TechnickeOdpovedi {
  return { useku: 0, nejlepsiPodobnost: 0, prerazeno: 0, hledaniMs: 0, model: ai.modelOdpovedi, verzePromptu: VERZE_PROMPTU_ODPOVEDI };
}

// Když žádná část odpověď nemá: výpadek AI dovolí hledat znovu, zamítnutá odpověď říká, že něco související
// na webu je, jinak web odpověď nemá.
function duvodCelku(duvody: DuvodPredani[]): DuvodPredani {
  if (duvody.includes('chyba-ai')) return 'chyba-ai';
  return duvody.find((d) => d !== 'nic-nenalezeno' && d !== 'model-nevi') ?? (duvody.includes('model-nevi') ? 'model-nevi' : 'nic-nenalezeno');
}

function spojitMisto(a: string, b: string) {
  return [...new Set([...a.split(', '), ...b.split(', ')].filter(Boolean))].join(', ');
}

export function spojitVysledky(casti: string[], vysledky: VysledekOdpovedi[], rozdeleniMs: number): VysledekOdpovedi {
  const duvodyCasti = vysledky.flatMap((v) => (v.vysledek === 'zastupitelum' ? [v.duvod] : []));
  const souhrn = {
    casti: casti.length,
    castiZodpovezeno: vysledky.filter((v) => v.vysledek === 'odpoved').length,
    duvodyCasti,
    rozdeleniMs,
  };
  if (vysledky.length === 1) return { ...vysledky[0], technicke: { ...vysledky[0].technicke, ...souhrn } };

  const vse = vysledky.map((v) => v.technicke);
  const nejvic = (pole: (t: TechnickeOdpovedi) => number | undefined) => Math.max(0, ...vse.map((t) => pole(t) ?? 0));
  const technicke: TechnickeOdpovedi = {
    useku: vse.reduce((soucet, t) => soucet + t.useku, 0),
    nejlepsiPodobnost: nejvic((t) => t.nejlepsiPodobnost),
    prerazeno: vse.reduce((soucet, t) => soucet + t.prerazeno, 0),
    hledaniMs: nejvic((t) => t.hledaniMs),
    odpovedMs: nejvic((t) => t.odpovedMs),
    overeniMs: nejvic((t) => t.overeniMs),
    model: vse[0].model,
    verzePromptu: vse[0].verzePromptu,
    ...souhrn,
  };
  if (!souhrn.castiZodpovezeno) return { vysledek: 'zastupitelum', duvod: duvodCelku(duvodyCasti), technicke };

  // Zdroje se číslují znovu přes všechny části. Stejný odkaz z více částí je jeden zdroj.
  const zdroje: CitovanyZdroj[] = [];
  const cisloOdkazu = new Map<string, number>();
  const zodpovezene: ZodpovezenaCast[] = [];
  const vety: VetaZobrazene[] = [];
  const nezodpovezeno: string[] = [];
  vysledky.forEach((vysledek, i) => {
    if (vysledek.vysledek !== 'odpoved') {
      nezodpovezeno.push(casti[i]);
      return;
    }
    const prevod = new Map<number, number>();
    for (const zdroj of vysledek.odpoved.zdroje) {
      let cislo = cisloOdkazu.get(zdroj.url);
      if (cislo === undefined) {
        cislo = zdroje.length + 1;
        cisloOdkazu.set(zdroj.url, cislo);
        zdroje.push({ ...zdroj, cislo });
      } else {
        const puvodni = zdroje[cislo - 1];
        if (!puvodni.uryvek.includes(zdroj.uryvek)) puvodni.uryvek = `${puvodni.uryvek} … ${zdroj.uryvek}`;
        puvodni.misto = spojitMisto(puvodni.misto, zdroj.misto);
      }
      prevod.set(zdroj.cislo, cislo);
    }
    const vetyCasti = vysledek.odpoved.vety.map((veta) => ({ text: veta.text, zdroj: prevod.get(veta.zdroj) ?? veta.zdroj }));
    zodpovezene.push({ otazka: casti[i], vety: vetyCasti });
    vety.push(...vetyCasti);
    nezodpovezeno.push(...vysledek.odpoved.nezodpovezeno);
  });
  return {
    vysledek: 'odpoved',
    odpoved: {
      vety,
      casti: zodpovezene,
      zdroje,
      nezodpovezeno: [...new Set(nezodpovezeno)].slice(0, MAX_NEZODPOVEZENO_CELKEM),
      oznaceni: [...new Set(zdroje.map((z) => z.oznaceni))],
      upozorneni: UPOZORNENI,
    },
    technicke,
  };
}

// Části běží souběžně. Stránka se o každé dozví, jakmile je hotová, nezávisle na ostatních.
// Celý dotaz se začne hledat hned, souběžně s rozdělením. Dotaz na jednu věc (většina dotazů) tak na rozdělení
// nečeká. Když se dotaz rozdělí, výsledek celku se zahodí a hledají se části (sada typových otázek 12. 11. 2026:
// čekání na rozdělení snížilo podíl odpovědí do 10 s z 93 % na 69 %).
export async function odpovedetPoCastech(
  dotaz: string,
  z: ZavislostiCasti,
  priPrubehu: (udalost: PrubehOdpovedi) => void = () => {},
): Promise<VysledekOdpovedi> {
  const ted = z.ted ?? Date.now;
  const zacatek = ted();
  const odpovedet = async (cast: string, zavislosti: ZavislostiCasti): Promise<VysledekOdpovedi> => {
    try {
      return await sLimitem(odpovedetNaDotaz(cast, zavislosti), z.limitCastiMs ?? LIMIT_CASTI_MS);
    } catch (chyba) {
      zavislosti.priChybe?.(chyba);
      return { vysledek: 'zastupitelum', duvod: 'chyba-ai', technicke: prazdneTechnicke(z.ai) };
    }
  };
  // Nalezené úseky a chyba celku se ohlásí (vyhodnocení 8.8, log), jen když se celek opravdu použije.
  let usekyCelku: Parameters<NonNullable<ZavislostiOdpovedi['naHledani']>> | null = null;
  let chybaCelku: { chyba: unknown } | null = null;
  const celek = odpovedet(dotaz, {
    ...z,
    naHledani: (...argumenty) => { usekyCelku = argumenty; },
    priChybe: (chyba) => { chybaCelku = { chyba }; },
  });

  const casti = await rozdelitDotaz(dotaz, z.ai, z.limitRozdeleniMs);
  const rozdeleniMs = ted() - zacatek;
  priPrubehu({ udalost: 'casti', casti });
  const vysledky = await Promise.all(casti.map(async (cast, i): Promise<VysledekOdpovedi> => {
    let vysledek: VysledekOdpovedi;
    if (casti.length === 1) {
      vysledek = await celek;
      if (usekyCelku) z.naHledani?.(...usekyCelku);
      if (chybaCelku) z.priChybe?.(chybaCelku.chyba);
    } else {
      vysledek = await odpovedet(cast, z);
    }
    priPrubehu({ udalost: 'cast', cislo: i + 1, vysledek: vysledek.vysledek });
    return vysledek;
  }));
  return spojitVysledky(casti, vysledky, rozdeleniMs);
}
