import { odstranitHalucinace } from '../ai/halucinace';
import type { SluzbaAi } from '../ai/rozhrani';
import type { UpravaVzkazu } from '../ai/uprava';
import { ChybaPodani } from './chyby';
import {
  LIMIT_UPRAVY_MS,
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
  limitUpravyMs?: number;
}

export interface TechnickeUdaje {
  typ?: string;
  velikostB?: number;
  prepisMs?: number;
  delkaS?: number;
  upravaMs: number;
  modelUpravy: string;
  verzePromptu: number;
  pokusuUpravy: number;
}

export interface VysledekPodani {
  vstup: 'hlas' | 'text';
  surovyText: string;
  uprava: UpravaVzkazu;
  technicke: TechnickeUdaje;
}

export function zakladniTyp(hlavicka: string | null) {
  return hlavicka?.split(';', 1)[0].trim().toLowerCase() ?? '';
}

function hlaskaChyby(chyba: unknown) {
  return chyba instanceof Error ? chyba.message.slice(0, 300) : 'neznámá chyba';
}

export async function zkontrolovatPozadavek(request: Request, z: Pick<ZavislostiPodani, 'limiter' | 'vyvoj'>) {
  if (!jePuvodPovolen(request, z.vyvoj)) throw new ChybaPodani('cizi-puvod');
  // Lokální vývoj limit nemá. V produkci bez limiteru požadavek neprojde.
  if (!z.vyvoj && !(await povolitPozadavek(request, z.limiter))) throw new ChybaPodani('limit-pozadavku');
}

export function sLimitem<T>(slib: Promise<T>, ms: number) {
  let casovac: ReturnType<typeof setTimeout>;
  const vyprseni = new Promise<never>((_, odmitnout) => {
    casovac = setTimeout(() => odmitnout(new Error('Model neodpověděl včas.')), ms);
  });
  return Promise.race([slib, vyprseni]).finally(() => clearTimeout(casovac));
}

// Stejná cesta pro přepis i napsaný text (krok 3.3). Do logu jdou jen čísla, nikdy text vzkazu (F-14).
async function upravit(text: string, z: ZavislostiPodani) {
  const log = z.log ?? console.log;
  const ted = z.ted ?? Date.now;
  const zacatek = ted();
  try {
    const vysledek = await sLimitem(z.ai.upravit(text), z.limitUpravyMs ?? LIMIT_UPRAVY_MS);
    const upravaMs = ted() - zacatek;
    log({
      udalost: 'uprava',
      upravaMs,
      model: vysledek.model,
      verzePromptu: vysledek.verzePromptu,
      pokusu: vysledek.pokusu,
      znakuVstup: text.length,
      znakuVystup: vysledek.uprava.text.length,
    });
    return {
      uprava: vysledek.uprava,
      technicke: {
        upravaMs,
        modelUpravy: vysledek.model,
        verzePromptu: vysledek.verzePromptu,
        pokusuUpravy: vysledek.pokusu,
      },
    };
  } catch (chyba) {
    log({ udalost: 'uprava-selhala', upravaMs: ted() - zacatek, znakuVstup: text.length, hlaska: hlaskaChyby(chyba) });
    throw new ChybaPodani('uprava-selhala');
  }
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

  let surovyText: string;
  let prepisMs: number;
  let delkaS: number | undefined;
  try {
    const prepis = await z.ai.prepsat(audio);
    prepisMs = ted() - poCteni;
    // Věty, které Whisper vymyslel v tichu (titulky, adresa webu), autor neřekl a do vzkazu nepatří.
    const cisty = odstranitHalucinace(prepis.text.trim());
    surovyText = cisty.text;
    delkaS = prepis.delkaS;
    log({ udalost: 'prepis', ...zaznam, prepisMs, delkaS, pocetSlov: prepis.pocetSlov, odstranenoVet: cisty.odstraneno });
  } catch (chyba) {
    log({ udalost: 'prepis-selhal', ...zaznam, prepisMs: ted() - poCteni, hlaska: hlaskaChyby(chyba) });
    throw new ChybaPodani('prepis-selhal');
  }
  if (!surovyText) throw new ChybaPodani('prazdny-prepis');

  const { uprava, technicke } = await upravit(surovyText, z);
  return {
    vstup: 'hlas',
    surovyText,
    uprava,
    technicke: { typ, velikostB: audio.byteLength, prepisMs, delkaS, ...technicke },
  };
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
  const surovyText = text.trim();
  log({ udalost: 'text', znaku: surovyText.length });
  return { vstup: 'text', surovyText, ...(await upravit(surovyText, z)) };
}
