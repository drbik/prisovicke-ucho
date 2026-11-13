import { jeTyp, type TypPodnetu } from '../oblasti';
import { ChybaPodani } from '../podani/chyby';
import { MAX_VELIKOST_TEXTU_B, MAX_ZNAKU_UPRAVY, MIN_ZNAKU_TEXTU } from '../podani/limity';
import { precistTelo } from '../podani/ochrana';
import { zakladniTyp, zkontrolovatPozadavek, type ZavislostiPodani } from '../podani/zpracovani';
import { LIMIT_CASTI_MS, odpovedetPoCastech, type PrubehOdpovedi } from './casti';
import type { TechnickeOdpovedi, VysledekOdpovedi } from './odpoved';
import type { IndexZdroju } from './rozhrani';
import { TEXT_BEZ_ODPOVEDI, podepsatPodklad, podkladOdpovedi, podkladZpravy, type PodepsanyPodklad, type PodkladPrevypraveni } from './styl';

// Když hledání a oba modely nestihnou odpovědět na část dotazu do té doby, převezmou ji zastupitelé (PRD, Rychlost).
export const LIMIT_ODPOVEDI_MS = LIMIT_CASTI_MS;

export interface ZavislostiDotazu extends ZavislostiPodani {
  index?: IndexZdroju;
  limitOdpovediMs?: number;
  prahPodobnosti?: number;
  // Klíč pro podpis toho, co pak smí stránka nechat převyprávět mluvčím (13. 11. 2026).
  klicPodpisu?: string;
}

// prevypraveni: co smí stránka nechat převyprávět mluvčím, s podpisem serveru. Má ho odpověď i dotaz bez odpovědi
// (13. 11. 2026). Chybí u výpadku AI a když server nemá klíč.
export type VysledekDotazu =
  | { vysledek: 'nehleda'; typ: TypPodnetu }
  | (VysledekOdpovedi & { celkemMs: number; prevypraveni?: PodepsanyPodklad })
  | { vysledek: 'zastupitelum'; duvod: 'chyba-ai'; celkemMs: number; technicke?: TechnickeOdpovedi };

// Průběžné zprávy pro stránku, poslední z nich nese výsledek. Posílají se po řádcích JSON (NDJSON).
export type UdalostDotazu = PrubehOdpovedi | { udalost: 'vysledek'; vysledek: VysledekDotazu };

export interface PripravenyDotaz {
  text: string;
  typ: TypPodnetu;
}

async function precistDotaz(request: Request): Promise<PripravenyDotaz> {
  const telo = await precistTelo(request, MAX_VELIKOST_TEXTU_B);
  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(telo));
  } catch {
    throw new ChybaPodani('spatny-text');
  }
  const { text, typ } = (data ?? {}) as { text?: unknown; typ?: unknown };
  if (typeof text !== 'string' || !jeTyp(typ)) throw new ChybaPodani('spatny-text');
  const cisty = text.trim();
  if (cisty.length < MIN_ZNAKU_TEXTU || cisty.length > MAX_ZNAKU_UPRAVY) throw new ChybaPodani('spatny-text');
  return { text: cisty, typ };
}

// Kontrola původu, limitu a těla. Chyby z ní jdou jako HTTP chyby ještě předtím, než se začne posílat průběh.
export async function pripravitDotaz(request: Request, z: ZavislostiDotazu): Promise<PripravenyDotaz> {
  if (zakladniTyp(request.headers.get('content-type')) !== 'application/json') throw new ChybaPodani('spatny-typ');
  await zkontrolovatPozadavek(request, z);
  const dotaz = await precistDotaz(request);
  if (dotaz.typ === 'dotaz' && !z.index) throw new ChybaPodani('nedostupne');
  return dotaz;
}

async function podepsat(podklad: PodkladPrevypraveni, klic?: string): Promise<{ prevypraveni?: PodepsanyPodklad }> {
  return klic ? { prevypraveni: { podklad, podpis: await podepsatPodklad(podklad, klic) } } : {};
}

// Potvrzený vzkaz typu dotaz (krok 8.6). Do logu jdou jen časy, počty, model a verze promptu, nikdy text.
export async function odpovedetNaPripraveny(
  { text, typ }: PripravenyDotaz,
  z: ZavislostiDotazu,
  priPrubehu?: (udalost: PrubehOdpovedi) => void,
): Promise<VysledekDotazu> {
  const log = z.log ?? console.log;
  const ted = z.ted ?? Date.now;

  // F-72: návrhy, stížnosti a pochvaly se nehledají.
  if (typ !== 'dotaz') {
    log({ udalost: 'dotaz', vysledek: 'nehleda', typ });
    return { vysledek: 'nehleda', typ };
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
      priChybe: (chyba) => hlasky.push(chyba instanceof Error ? chyba.message.slice(0, 200) : 'neznámá chyba'),
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
    return { ...vysledek, celkemMs, ...(podklad ? await podepsat(podklad, z.klicPodpisu) : {}) };
  } catch (chyba) {
    const celkemMs = ted() - zacatek;
    log({
      udalost: 'dotaz',
      vysledek: 'zastupitelum',
      duvod: 'chyba-ai',
      celkemMs,
      znakuDotazu: text.length,
      hlaska: chyba instanceof Error ? chyba.message.slice(0, 200) : 'neznámá chyba',
    });
    return { vysledek: 'zastupitelum', duvod: 'chyba-ai', celkemMs };
  }
}

export async function zpracovatDotaz(request: Request, z: ZavislostiDotazu, priPrubehu?: (udalost: PrubehOdpovedi) => void) {
  return odpovedetNaPripraveny(await pripravitDotaz(request, z), z, priPrubehu);
}
