// Alternativní mluvčí (13. 11. 2026). Autor zvolí postavu u tlačítka ucha. Postava pak přepíše jeho vzkaz
// a převypráví odpověď na dotaz. U ukázek v přehledu témat mluvčí nejsou (pokyn Tomáše z 13. 11. 2026: styl patří
// k přímému namlouvání). Nic se neukládá, do logu jdou jen mluvčí, časy a výsledek kontrol, nikdy text.
import { ChybaPodani } from '../podani/chyby';
import { MAX_VELIKOST_TEXTU_B, MAX_ZNAKU_UPRAVY, MIN_ZNAKU_TEXTU } from '../podani/limity';
import { precistTelo, type Limiter } from '../podani/ochrana';
import { sLimitem, zakladniTyp, zkontrolovatPozadavek, type ZavislostiPodani } from '../podani/zpracovani';
import { JMENA_MLUVCICH, type KlicMluvciho } from './mluvci';
import {
  VERZE_PROMPTU_STYLU,
  jeMluvci,
  overitPodpis,
  precistPodklad,
  prepsatVzkaz,
  prevypravet,
  type PodkladPrevypraveni,
  type VysledekPrevypraveni,
} from './styl';

// Dva pokusy po jednom generování. Gemma 4 26B píše převyprávění obvykle 2 až 7 s, výjimečně 20 s
// (zkouška 13. 11. 2026, sedm mluvčích souběžně). Dlouhý vzkaz potřebuje víc.
export const LIMIT_STYLU_MS = 30_000;
export const LIMIT_STYLU_VZKAZU_MS = 45_000;
// Tělo nese podklad (dotaz a věty odpovědi) a podpis, nebo text vzkazu. Dotaz má nejvýš 4 000 znaků.
const MAX_VELIKOST_STYLU_B = MAX_VELIKOST_TEXTU_B * 4;

export interface ZavislostiStylu extends ZavislostiPodani {
  // Klíč pro podpis odpovědí. Bez něj postava odpověď nepřevypráví, vzkaz přepsat umí.
  klicPodpisu?: string;
  // Vlastní limit požadavků: přepínání postav při kontrole vzkazu je víc kliknutí za minutu než podání.
  limiterStylu?: Limiter;
}

async function precistData(request: Request, z: ZavislostiStylu) {
  if (zakladniTyp(request.headers.get('content-type')) !== 'application/json') throw new ChybaPodani('spatny-typ');
  await zkontrolovatPozadavek(request, { limiter: z.limiterStylu ?? z.limiter, vyvoj: z.vyvoj }, 'styl');
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await precistTelo(request, MAX_VELIKOST_STYLU_B))) ?? {};
  } catch (chyba) {
    if (chyba instanceof ChybaPodani) throw chyba;
    throw new ChybaPodani('spatny-text');
  }
  if (!jeMluvci(data.mluvci)) throw new ChybaPodani('spatny-text');
  return { data, mluvci: data.mluvci };
}

async function spustit(
  z: ZavislostiStylu,
  mluvci: KlicMluvciho,
  co: 'odpoved' | 'vzkaz',
  limitMs: number,
  prace: () => Promise<VysledekPrevypraveni>,
): Promise<VysledekPrevypraveni> {
  const log = z.log ?? console.log;
  const ted = z.ted ?? Date.now;
  const zacatek = ted();
  let vysledek: VysledekPrevypraveni;
  let hlaska: string | undefined;
  try {
    vysledek = await sLimitem(prace(), limitMs);
  } catch (chyba) {
    hlaska = chyba instanceof Error ? chyba.message.slice(0, 200) : 'neznámá chyba';
    vysledek = { vysledek: 'nezvladl', mluvci, jmeno: JMENA_MLUVCICH[mluvci], duvod: 'chyba-ai', pokusu: 0 };
  }
  log({
    udalost: 'prevypraveni',
    co,
    mluvci,
    vysledek: vysledek.vysledek,
    duvod: vysledek.vysledek === 'nezvladl' ? vysledek.duvod : undefined,
    pokusu: vysledek.pokusu,
    stylMs: ted() - zacatek,
    verzePromptu: VERZE_PROMPTU_STYLU,
    hlaska,
  });
  return vysledek;
}

// Odpověď na dotaz hlasem postavy. Převypráví se jen to, co server sám vydal a podepsal.
export async function zpracovatPrevypraveni(request: Request, z: ZavislostiStylu): Promise<VysledekPrevypraveni> {
  const { data, mluvci } = await precistData(request, z);
  if (!z.klicPodpisu) throw new ChybaPodani('nedostupne');
  let podklad: PodkladPrevypraveni | null = precistPodklad(data.podklad);
  if (podklad && !(typeof data.podpis === 'string' && await overitPodpis(podklad, data.podpis, z.klicPodpisu))) podklad = null;
  if (!podklad) throw new ChybaPodani('neplatny-podklad');
  const platny = podklad;
  return spustit(z, mluvci, 'odpoved', LIMIT_STYLU_MS, () => prevypravet(z.ai, platny, mluvci));
}

// Autorův vzkaz hlasem postavy. Vstup je spisovné znění, které autor vidí při kontrole. Je to stejný druh vstupu
// jako u /vzkaz/text (libovolný text od autora), proto stejná délka a limit požadavků místo podpisu.
export async function zpracovatStylVzkazu(request: Request, z: ZavislostiStylu): Promise<VysledekPrevypraveni> {
  const { data, mluvci } = await precistData(request, z);
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  if (text.length < MIN_ZNAKU_TEXTU || text.length > MAX_ZNAKU_UPRAVY) throw new ChybaPodani('spatny-text');
  return spustit(z, mluvci, 'vzkaz', LIMIT_STYLU_VZKAZU_MS, () => prepsatVzkaz(z.ai, text, mluvci));
}
