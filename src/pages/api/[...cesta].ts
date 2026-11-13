import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { vytvorCloudflareAi } from '../../lib/ai/cloudflare';
import { vytvorFalesneAi } from '../../lib/ai/falesna';
import { vytvorApi } from '../../lib/api/aplikace';
import { vytvorIndexCloudflare } from '../../lib/odpovedi/cloudflare';
import { vytvorFalesnyIndex } from '../../lib/odpovedi/falesny';

export const prerender = false;

const vyvoj = import.meta.env.DEV;
const falesne = vyvoj && env.FALESNE_AI === '1';
// Falešná AI hledá s malým zdržením, aby byl při lokální zkoušce vidět průběh hledání po částech.
const ai = falesne ? vytvorFalesneAi({ ozvena: true, zpozdeniMs: 1500 }).ai : vytvorCloudflareAi(env.AI);
const index = falesne ? vytvorFalesnyIndex() : vytvorIndexCloudflare(env.DB, env.VECTORIZE);
// Podpis odpovědí pro převyprávění mluvčím. Klíč je ve Workers Secrets, lokální vývoj má pevný.
const klicPodpisu = env.KLIC_PODPISU || (vyvoj ? 'jen-lokalni-vyvoj' : undefined);
const api = vytvorApi({ ai, index, limiter: env.PODANI_RATE_LIMITER, limiterStylu: env.STYL_RATE_LIMITER, vyvoj, klicPodpisu });

export const ALL: APIRoute = ({ request }) => api.fetch(request);
