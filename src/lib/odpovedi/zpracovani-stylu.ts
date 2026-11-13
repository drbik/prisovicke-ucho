// Požadavek na převyprávění odpovědi mluvčím (13. 11. 2026). Převypráví se jen odpověď, kterou server sám vydal
// a podepsal, nebo ukázková odpověď z přehledu témat. Nic se neukládá, do logu jdou jen mluvčí, časy a výsledek kontrol.
import { ChybaPodani } from '../podani/chyby';
import { MAX_VELIKOST_TEXTU_B } from '../podani/limity';
import { precistTelo } from '../podani/ochrana';
import { sLimitem, zakladniTyp, zkontrolovatPozadavek, type ZavislostiPodani } from '../podani/zpracovani';
import { UKAZKOVA_TEMATA } from '../temata/temata';
import {
  VERZE_PROMPTU_STYLU,
  jeMluvci,
  overitPodpis,
  podkladOdpovedi,
  precistPodklad,
  prevypravet,
  type PodkladPrevypraveni,
  type VysledekPrevypraveni,
} from './styl';
import { JMENA_MLUVCICH } from './mluvci';

// Dva pokusy po jednom generování. Gemma 4 26B píše převyprávění obvykle 2 až 7 s, výjimečně 20 s
// (zkouška 13. 11. 2026, sedm mluvčích souběžně).
export const LIMIT_STYLU_MS = 30_000;
// Tělo nese podklad (dotaz a věty odpovědi) a podpis. Dotaz má nejvýš 4 000 znaků, odpověď pár set.
const MAX_VELIKOST_STYLU_B = MAX_VELIKOST_TEXTU_B * 4;

export interface ZavislostiStylu extends ZavislostiPodani {
  // Klíč pro podpis odpovědí. Bez něj se převyprávějí jen ukázky.
  klicPodpisu?: string;
}

function podkladUkazky(id: string): PodkladPrevypraveni | null {
  const tema = UKAZKOVA_TEMATA.find((t) => t.id === id);
  return tema?.odpoved ? podkladOdpovedi(tema.text, tema.odpoved) : null;
}

export async function zpracovatPrevypraveni(request: Request, z: ZavislostiStylu): Promise<VysledekPrevypraveni> {
  const log = z.log ?? console.log;
  const ted = z.ted ?? Date.now;
  if (zakladniTyp(request.headers.get('content-type')) !== 'application/json') throw new ChybaPodani('spatny-typ');
  await zkontrolovatPozadavek(request, z, 'styl');

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await precistTelo(request, MAX_VELIKOST_STYLU_B))) ?? {};
  } catch (chyba) {
    if (chyba instanceof ChybaPodani) throw chyba;
    throw new ChybaPodani('spatny-text');
  }
  const { mluvci } = data;
  if (!jeMluvci(mluvci)) throw new ChybaPodani('spatny-text');

  let podklad: PodkladPrevypraveni | null;
  let zdroj: 'ukazka' | 'odpoved';
  if (typeof data.ukazka === 'string') {
    zdroj = 'ukazka';
    podklad = podkladUkazky(data.ukazka);
  } else {
    zdroj = 'odpoved';
    if (!z.klicPodpisu) throw new ChybaPodani('nedostupne');
    podklad = precistPodklad(data.podklad);
    if (podklad && !(typeof data.podpis === 'string' && await overitPodpis(podklad, data.podpis, z.klicPodpisu))) podklad = null;
  }
  if (!podklad) throw new ChybaPodani('neplatny-podklad');

  const zacatek = ted();
  let vysledek: VysledekPrevypraveni;
  let hlaska: string | undefined;
  try {
    vysledek = await sLimitem(prevypravet(z.ai, podklad, mluvci), LIMIT_STYLU_MS);
  } catch (chyba) {
    hlaska = chyba instanceof Error ? chyba.message.slice(0, 200) : 'neznámá chyba';
    vysledek = { vysledek: 'nezvladl', mluvci, jmeno: JMENA_MLUVCICH[mluvci], duvod: 'chyba-ai', pokusu: 0 };
  }
  log({
    udalost: 'prevypraveni',
    mluvci,
    zdroj,
    vysledek: vysledek.vysledek,
    duvod: vysledek.vysledek === 'nezvladl' ? vysledek.duvod : undefined,
    pokusu: vysledek.pokusu,
    stylMs: ted() - zacatek,
    verzePromptu: VERZE_PROMPTU_STYLU,
    hlaska,
  });
  return vysledek;
}
