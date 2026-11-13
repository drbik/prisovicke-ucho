import { jeTyp, type TypPodnetu } from '../oblasti';
import { ChybaPodani } from '../podani/chyby';
import { MAX_VELIKOST_TEXTU_B, MAX_ZNAKU_UPRAVY, MIN_ZNAKU_TEXTU } from '../podani/limity';
import { precistTelo } from '../podani/ochrana';
import { overitPotvrzeni } from '../podani/potvrzeni';
import { overitNavrh, zakladniTyp, zkontrolovatPozadavek, type NavrhPodani, type ZavislostiPodani } from '../podani/zpracovani';
import { UKAZKOVA_TEMATA } from '../temata/temata';
import { kandidatiUkazek, nejpodobnejsi } from '../vzkazy/podobnost';
import type { NovyVzkaz, OdpovedVzkazu, PolozkaFeedu, StavVzkazu, UlozisteVzkazu } from '../vzkazy/typy';
import { LIMIT_CASTI_MS, odpovedetPoCastech, type PrubehOdpovedi } from './casti';
import { jeStyl, type KlicStylu } from './mluvci';
import type { TechnickeOdpovedi, VysledekOdpovedi } from './odpoved';
import type { IndexZdroju } from './rozhrani';
import {
  TEXT_BEZ_ODPOVEDI,
  overitStylVzkazu,
  podepsatPodklad,
  podkladOdpovedi,
  podkladZpravy,
  type PodepsanyPodklad,
  type PodkladPrevypraveni,
} from './styl';

// Když hledání a oba modely nestihnou odpovědět na část dotazu do té doby, převezmou ji lidé (PRD, Rychlost).
export const LIMIT_ODPOVEDI_MS = LIMIT_CASTI_MS;
// Tělo nese i návrh AI úpravy (surový text a úprava) a text postavy, proto víc místa než napsaný vzkaz.
export const MAX_VELIKOST_DOTAZU_B = MAX_VELIKOST_TEXTU_B * 4;

export interface ZavislostiDotazu extends ZavislostiPodani {
  index?: IndexZdroju;
  limitOdpovediMs?: number;
  prahPodobnosti?: number;
  // Klíč pro podpis toho, co pak smí stránka nechat převyprávět mluvčím (13. 11. 2026).
  klicPodpisu?: string;
  // Úložiště vzkazů pro feed vedle ucha (13. 11. 2026). Bez něj se vzkaz neuloží, jen se hledá odpověď.
  uloziste?: UlozisteVzkazu;
}

// prevypraveni: co smí stránka nechat převyprávět mluvčím, s podpisem serveru. Má ho odpověď i dotaz bez odpovědi
// (13. 11. 2026). Chybí u výpadku AI a když server nemá klíč.
// vzkaz: uložený vzkaz, jak ho stránka přidá na začátek feedu.
export type VysledekDotazu = (
  | { vysledek: 'nehleda'; typ: TypPodnetu }
  | (VysledekOdpovedi & { celkemMs: number; prevypraveni?: PodepsanyPodklad })
  | { vysledek: 'zastupitelum'; duvod: 'chyba-ai'; celkemMs: number; technicke?: TechnickeOdpovedi }
) & { vzkaz?: PolozkaFeedu };

// Průběžné zprávy pro stránku, poslední z nich nese výsledek. Posílají se po řádcích JSON (NDJSON).
// podobne: na podobný dotaz už je odpověď (uložený vzkaz nebo ukázka), stránka nabídne skok na ni.
export type UdalostPrubehu = PrubehOdpovedi | { udalost: 'podobne'; tema: { id: string; nazev: string } };
export type UdalostDotazu = UdalostPrubehu | { udalost: 'vysledek'; vysledek: VysledekDotazu };

type PripraveneUlozeni = Omit<NovyVzkaz, 'podobnyId' | 'vektor'>;

export interface PripravenyDotaz {
  text: string;
  typ: TypPodnetu;
  ulozeni?: PripraveneUlozeni;
}

async function precistTeloDotazu(request: Request) {
  const telo = await precistTelo(request, MAX_VELIKOST_DOTAZU_B);
  try {
    return (JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(telo)) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ChybaPodani('spatny-text');
  }
}

function jeNavrh(hodnota: unknown): hodnota is NavrhPodani {
  const n = (hodnota ?? {}) as Record<string, unknown>;
  const u = (n.uprava ?? {}) as Record<string, unknown>;
  return (n.vstup === 'hlas' || n.vstup === 'text') && typeof n.surovyText === 'string'
    && ['text', 'nazev', 'typ', 'oblast'].every((pole) => typeof u[pole] === 'string');
}

// Potvrzený vzkaz k uložení (F-14): návrh AI úpravy musí nést podpis serveru, potvrzení projde stejnou kontrolou
// jako v prohlížeči a text postavy se uloží, jen když ho server sám napsal k tomuto spisovnému znění.
async function pripravitUlozeni(data: unknown, text: string, typ: TypPodnetu, z: ZavislostiDotazu): Promise<PripraveneUlozeni | undefined> {
  if (data === undefined || !z.uloziste || !z.klicPodpisu) return undefined;
  const u = (data ?? {}) as Record<string, unknown>;
  if (!jeNavrh(u.navrh) || !(await overitNavrh(u.navrh, u.podpis, z.klicPodpisu))) throw new ChybaPodani('neplatny-podklad');
  const potvrzeni = overitPotvrzeni({ text, nazev: typeof u.nazev === 'string' ? u.nazev : '', typ, oblast: typeof u.oblast === 'string' ? u.oblast : '' });
  if (!potvrzeni.platne) throw new ChybaPodani('spatny-text');
  const styl: KlicStylu = jeStyl(u.styl) ? u.styl : 'spisovne';
  const textStylu = styl !== 'spisovne' && typeof u.textStylu === 'string'
    && await overitStylVzkazu(styl, text, u.textStylu, u.podpisStylu, z.klicPodpisu) ? u.textStylu : null;
  return {
    klicNavrhu: u.podpis as string,
    vstup: u.navrh.vstup,
    surovyText: u.navrh.surovyText,
    navrhText: u.navrh.uprava.text,
    text,
    nazev: potvrzeni.vzkaz.nazev,
    typ,
    oblast: potvrzeni.vzkaz.oblast,
    styl,
    textStylu,
  };
}

// Kontrola původu, limitu a těla. Chyby z ní jdou jako HTTP chyby ještě předtím, než se začne posílat průběh.
export async function pripravitDotaz(request: Request, z: ZavislostiDotazu): Promise<PripravenyDotaz> {
  if (zakladniTyp(request.headers.get('content-type')) !== 'application/json') throw new ChybaPodani('spatny-typ');
  await zkontrolovatPozadavek(request, z);
  const data = await precistTeloDotazu(request);
  const { text, typ } = data;
  if (typeof text !== 'string' || !jeTyp(typ)) throw new ChybaPodani('spatny-text');
  const cisty = text.trim();
  if (cisty.length < MIN_ZNAKU_TEXTU || cisty.length > MAX_ZNAKU_UPRAVY) throw new ChybaPodani('spatny-text');
  if (typ === 'dotaz' && !z.index) throw new ChybaPodani('nedostupne');
  const ulozeni = await pripravitUlozeni(data.ulozit, cisty, typ, z);
  return { text: cisty, typ, ...(ulozeni ? { ulozeni } : {}) };
}

async function podepsat(podklad: PodkladPrevypraveni, klic?: string): Promise<{ prevypraveni?: PodepsanyPodklad }> {
  return klic ? { prevypraveni: { podklad, podpis: await podepsatPodklad(podklad, klic) } } : {};
}

interface UlozenyVzkaz {
  id: string;
  vytvoreno: string;
  podobny: { id: string; nazev: string } | null;
}

function hlaskaChyby(chyba: unknown) {
  return chyba instanceof Error ? chyba.message.slice(0, 200) : 'neznámá chyba';
}

// Uloží vzkaz a u dotazu najde dříve zodpovězený podobný. Výpadek úložiště odpověď nezastaví, jen se vzkaz neuloží.
async function ulozitVzkaz(dotaz: PripravenyDotaz, z: ZavislostiDotazu, priPrubehu?: (udalost: UdalostPrubehu) => void): Promise<UlozenyVzkaz | null> {
  if (!dotaz.ulozeni || !z.uloziste) return null;
  const log = z.log ?? console.log;
  const uloziste = z.uloziste;
  const ted = new Date((z.ted ?? Date.now)());
  try {
    const vektor = dotaz.typ === 'dotaz' ? (await z.ai.vektory([dotaz.text]))[0] : null;
    const { id, vytvoreno } = await uloziste.ulozit({ ...dotaz.ulozeni, podobnyId: null, vektor }, ted);
    let podobny: UlozenyVzkaz['podobny'] = null;
    let podobnost: number | undefined;
    if (vektor) {
      const kandidati = [
        ...(await uloziste.zodpovezene()).filter((k) => k.id !== `v-${id}`),
        ...await kandidatiUkazek(UKAZKOVA_TEMATA, uloziste, z.ai),
      ];
      const nalezeny = nejpodobnejsi(vektor, kandidati);
      if (nalezeny) {
        podobny = { id: nalezeny.id, nazev: nalezeny.nazev };
        podobnost = Math.round(nalezeny.podobnost * 1000) / 1000;
        priPrubehu?.({ udalost: 'podobne', tema: podobny });
      }
    }
    log({ udalost: 'ulozeno', typ: dotaz.typ, styl: dotaz.ulozeni.styl, podobnost });
    return { id, vytvoreno, podobny };
  } catch (chyba) {
    log({ udalost: 'ulozeni-selhalo', hlaska: hlaskaChyby(chyba) });
    return null;
  }
}

function odpovedVzkazu(vysledek: VysledekOdpovedi): OdpovedVzkazu | null {
  if (vysledek.vysledek !== 'odpoved') return null;
  const { vety, casti, zdroje, oznaceni } = vysledek.odpoved;
  return { vety, ...(casti?.length ? { casti } : {}), zdroje, oznaceni };
}

// Zapíše výsledek k uloženému vzkazu a vrátí ho, jak ho stránka přidá na začátek feedu.
async function dokoncitUlozeni(
  ulozeny: UlozenyVzkaz | null,
  dotaz: PripravenyDotaz,
  stav: StavVzkazu,
  odpoved: OdpovedVzkazu | null,
  z: ZavislostiDotazu,
): Promise<{ vzkaz?: PolozkaFeedu }> {
  if (!ulozeny || !dotaz.ulozeni || !z.uloziste) return {};
  try {
    await z.uloziste.zapsatVysledek(ulozeny.id, stav, odpoved, ulozeny.podobny?.id ?? null, new Date((z.ted ?? Date.now)()));
  } catch (chyba) {
    (z.log ?? console.log)({ udalost: 'ulozeni-selhalo', hlaska: hlaskaChyby(chyba) });
  }
  const u = dotaz.ulozeni;
  return {
    vzkaz: {
      id: `v-${ulozeny.id}`,
      ukazka: false,
      nazev: u.nazev,
      text: u.text,
      typ: u.typ,
      oblast: u.oblast,
      stav,
      datum: ulozeny.vytvoreno.slice(0, 10),
      styl: u.styl,
      ...(u.textStylu ? { textStylu: u.textStylu } : {}),
      ...(odpoved ? { odpoved } : {}),
      ...(ulozeny.podobny ? { podobny: ulozeny.podobny } : {}),
    },
  };
}

// Potvrzený vzkaz (krok 8.6). Uloží se do feedu a u dotazu se hledá odpověď. Obojí běží souběžně.
// Do logu jdou jen časy, počty, model a verze promptu, nikdy text.
export async function odpovedetNaPripraveny(
  dotaz: PripravenyDotaz,
  z: ZavislostiDotazu,
  priPrubehu?: (udalost: UdalostPrubehu) => void,
): Promise<VysledekDotazu> {
  const { text, typ } = dotaz;
  const log = z.log ?? console.log;
  const ted = z.ted ?? Date.now;
  const ukladani = ulozitVzkaz(dotaz, z, priPrubehu);

  // F-72: návrhy, stížnosti a pochvaly se nehledají.
  if (typ !== 'dotaz') {
    log({ udalost: 'dotaz', vysledek: 'nehleda', typ });
    return { vysledek: 'nehleda', typ, ...(await dokoncitUlozeni(await ukladani, dotaz, 'ceka', null, z)) };
  }
  if (!z.index) throw new ChybaPodani('nedostupne');

  const zacatek = ted();
  const hlasky: string[] = [];
  try {
    const vysledek = await odpovedetPoCastech(text, {
      ai: z.ai,
      index: z.index,
      ted,
      prahPodobnosti: z.prahPodobnosti,
      limitCastiMs: z.limitOdpovediMs,
      priChybe: (chyba) => hlasky.push(hlaskaChyby(chyba)),
    }, priPrubehu);
    const celkemMs = ted() - zacatek;
    log({
      udalost: 'dotaz',
      vysledek: vysledek.vysledek,
      duvod: vysledek.vysledek === 'zastupitelum' ? vysledek.duvod : undefined,
      vet: vysledek.vysledek === 'odpoved' ? vysledek.odpoved.vety.length : 0,
      zdroju: vysledek.vysledek === 'odpoved' ? vysledek.odpoved.zdroje.length : 0,
      ...vysledek.technicke,
      celkemMs,
      znakuDotazu: text.length,
      hlaska: hlasky.length ? hlasky.join(' | ') : undefined,
    });
    // Výpadek AI mluvčí nepřevypráví: autor má hledat znovu, ne se bavit.
    const podklad = vysledek.vysledek === 'odpoved'
      ? podkladOdpovedi(text, vysledek.odpoved)
      : vysledek.duvod !== 'chyba-ai' ? podkladZpravy(text, TEXT_BEZ_ODPOVEDI) : null;
    const odpoved = odpovedVzkazu(vysledek);
    return {
      ...vysledek,
      celkemMs,
      ...(podklad ? await podepsat(podklad, z.klicPodpisu) : {}),
      ...(await dokoncitUlozeni(await ukladani, dotaz, odpoved ? 'zodpovezeno' : 'ceka', odpoved, z)),
    };
  } catch (chyba) {
    const celkemMs = ted() - zacatek;
    log({
      udalost: 'dotaz',
      vysledek: 'zastupitelum',
      duvod: 'chyba-ai',
      celkemMs,
      znakuDotazu: text.length,
      hlaska: hlaskaChyby(chyba),
    });
    return { vysledek: 'zastupitelum', duvod: 'chyba-ai', celkemMs, ...(await dokoncitUlozeni(await ukladani, dotaz, 'ceka', null, z)) };
  }
}

export async function zpracovatDotaz(request: Request, z: ZavislostiDotazu, priPrubehu?: (udalost: UdalostPrubehu) => void) {
  return odpovedetNaPripraveny(await pripravitDotaz(request, z), z, priPrubehu);
}
