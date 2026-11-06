import type { SluzbaAi } from '../ai/rozhrani';
import { ChybaPodani } from './chyby';
import {
  MAX_VELIKOST_NAHRAVKY_B,
  MAX_VELIKOST_TEXTU_B,
  POVOLENE_TYPY_NAHRAVKY,
  jeTextPlatny,
} from './limity';
import { jePuvodPovolen, povolitPozadavek, precistTelo, type Limiter } from './ochrana';

export interface ZavislostiPodani {
  ai: SluzbaAi;
  limiter?: Limiter;
  vyvoj?: boolean;
  log?: (zaznam: Record<string, unknown>) => void;
  ted?: () => number;
}

export interface TechnickeUdaje {
  typ: string;
  velikostB: number;
  prepisMs: number;
  delkaS?: number;
}

export interface VysledekPodani {
  vstup: 'hlas' | 'text';
  text: string;
  technicke?: TechnickeUdaje;
}

function zakladniTyp(hlavicka: string | null) {
  return hlavicka?.split(';', 1)[0].trim().toLowerCase() ?? '';
}

async function zkontrolovatPozadavek(request: Request, z: ZavislostiPodani) {
  if (!jePuvodPovolen(request, z.vyvoj)) throw new ChybaPodani('cizi-puvod');
  // Lokální vývoj limit nemá. V produkci bez limiteru požadavek neprojde.
  if (!z.vyvoj && !(await povolitPozadavek(request, z.limiter))) throw new ChybaPodani('limit-pozadavku');
}

// Nahrávka je jen v paměti tohoto požadavku. Do logu jdou časy a velikost, nikdy audio ani přepis (F-14).
export async function zpracovatHlas(request: Request, z: ZavislostiPodani): Promise<VysledekPodani> {
  const log = z.log ?? console.log;
  const ted = z.ted ?? Date.now;
  const typ = zakladniTyp(request.headers.get('content-type'));
  if (!POVOLENE_TYPY_NAHRAVKY.includes(typ)) throw new ChybaPodani('spatny-typ');
  await zkontrolovatPozadavek(request, z);

  const zacatek = ted();
  const audio = await precistTelo(request, MAX_VELIKOST_NAHRAVKY_B);
  if (audio.byteLength === 0) throw new ChybaPodani('prazdna-nahravka');
  const poCteni = ted();
  const zaznam = { typ, velikostB: audio.byteLength, cteniMs: poCteni - zacatek };

  try {
    const prepis = await z.ai.prepsat(audio);
    const prepisMs = ted() - poCteni;
    const text = prepis.text.trim();
    log({ udalost: 'prepis', ...zaznam, prepisMs, delkaS: prepis.delkaS, pocetSlov: prepis.pocetSlov });
    if (!text) throw new ChybaPodani('prazdny-prepis');
    return {
      vstup: 'hlas',
      text,
      technicke: { typ, velikostB: audio.byteLength, prepisMs, delkaS: prepis.delkaS },
    };
  } catch (chyba) {
    if (chyba instanceof ChybaPodani) throw chyba;
    const hlaska = chyba instanceof Error ? chyba.message.slice(0, 300) : 'neznámá chyba';
    log({ udalost: 'prepis-selhal', ...zaznam, prepisMs: ted() - poCteni, hlaska });
    throw new ChybaPodani('prepis-selhal');
  }
}

export async function zpracovatText(request: Request, z: ZavislostiPodani): Promise<VysledekPodani> {
  const log = z.log ?? console.log;
  if (zakladniTyp(request.headers.get('content-type')) !== 'application/json') throw new ChybaPodani('spatny-typ');
  await zkontrolovatPozadavek(request, z);

  const telo = await precistTelo(request, MAX_VELIKOST_TEXTU_B);
  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(telo));
  } catch {
    throw new ChybaPodani('spatny-text');
  }
  const text = (data as { text?: unknown } | null)?.text;
  if (typeof text !== 'string' || !jeTextPlatny(text)) throw new ChybaPodani('spatny-text');
  log({ udalost: 'text', znaku: text.trim().length });
  return { vstup: 'text', text: text.trim() };
}
