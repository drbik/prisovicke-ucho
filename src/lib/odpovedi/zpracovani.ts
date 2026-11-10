import { jeTyp, type TypPodnetu } from '../oblasti';
import { ChybaPodani } from '../podani/chyby';
import { MAX_VELIKOST_TEXTU_B, MAX_ZNAKU_UPRAVY, MIN_ZNAKU_TEXTU } from '../podani/limity';
import { precistTelo } from '../podani/ochrana';
import { sLimitem, zakladniTyp, zkontrolovatPozadavek, type ZavislostiPodani } from '../podani/zpracovani';
import { odpovedetNaDotaz, type TechnickeOdpovedi, type VysledekOdpovedi } from './odpoved';
import type { IndexZdroju } from './rozhrani';

// Když hledání a oba modely nestihnou odpovědět do té doby, dotaz převezmou zastupitelé (PRD, Rychlost).
export const LIMIT_ODPOVEDI_MS = 25_000;

export interface ZavislostiDotazu extends ZavislostiPodani {
  index?: IndexZdroju;
  limitOdpovediMs?: number;
  prahPodobnosti?: number;
}

export type VysledekDotazu =
  | { vysledek: 'nehleda'; typ: TypPodnetu }
  | (VysledekOdpovedi & { celkemMs: number })
  | { vysledek: 'zastupitelum'; duvod: 'chyba-ai'; celkemMs: number; technicke?: TechnickeOdpovedi };

async function precistDotaz(request: Request) {
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

// Potvrzený vzkaz typu dotaz (krok 8.6). Do logu jdou jen časy, počty, model a verze promptu, nikdy text.
export async function zpracovatDotaz(request: Request, z: ZavislostiDotazu): Promise<VysledekDotazu> {
  const log = z.log ?? console.log;
  const ted = z.ted ?? Date.now;
  if (zakladniTyp(request.headers.get('content-type')) !== 'application/json') throw new ChybaPodani('spatny-typ');
  await zkontrolovatPozadavek(request, z);
  const { text, typ } = await precistDotaz(request);

  // F-72: návrhy, stížnosti a pochvaly se nehledají.
  if (typ !== 'dotaz') {
    log({ udalost: 'dotaz', vysledek: 'nehleda', typ });
    return { vysledek: 'nehleda', typ };
  }
  if (!z.index) throw new ChybaPodani('nedostupne');

  const zacatek = ted();
  try {
    const vysledek = await sLimitem(
      odpovedetNaDotaz(text, { ai: z.ai, index: z.index, ted, prahPodobnosti: z.prahPodobnosti }),
      z.limitOdpovediMs ?? LIMIT_ODPOVEDI_MS,
    );
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
    });
    return { ...vysledek, celkemMs };
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
