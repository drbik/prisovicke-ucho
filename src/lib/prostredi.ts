// Vazby na Cloudflare pro stránku i API na jednom místě. Stránka čte feed ze stejného úložiště, do kterého API ukládá.
// Lokální vývoj ukládá vzkazy do paměti, aby zkušební vzkazy nešly do ostrého feedu (D1 je i lokálně vzdálená).
import { env } from 'cloudflare:workers';
import { vytvorCloudflareAi } from './ai/cloudflare';
import { vytvorFalesneAi } from './ai/falesna';
import { vytvorIndexCloudflare } from './odpovedi/cloudflare';
import { vytvorFalesnyIndex } from './odpovedi/falesny';
import { NAZVY_UKAZEK } from './vzkazy/feed';
import { vytvorPametoveUloziste, vytvorUlozisteD1 } from './vzkazy/uloziste';

export const vyvoj = import.meta.env.DEV;
const falesne = vyvoj && env.FALESNE_AI === '1';
// Falešná AI hledá s malým zdržením, aby byl při lokální zkoušce vidět průběh hledání po částech.
export const ai = falesne ? vytvorFalesneAi({ ozvena: true, zpozdeniMs: 1500 }).ai : vytvorCloudflareAi(env.AI);
export const index = falesne ? vytvorFalesnyIndex() : vytvorIndexCloudflare(env.DB, env.VECTORIZE);
export const uloziste = vyvoj ? vytvorPametoveUloziste(NAZVY_UKAZEK) : vytvorUlozisteD1(env.DB, NAZVY_UKAZEK);
// Podpis odpovědí a návrhů. Klíč je ve Workers Secrets, lokální vývoj má pevný.
export const klicPodpisu = env.KLIC_PODPISU || (vyvoj ? 'jen-lokalni-vyvoj' : undefined);
export const limiter = env.PODANI_RATE_LIMITER;
export const limiterStylu = env.STYL_RATE_LIMITER;
