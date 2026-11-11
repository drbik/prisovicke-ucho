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
const ai = falesne ? vytvorFalesneAi({ ozvena: true }).ai : vytvorCloudflareAi(env.AI);
const index = falesne ? vytvorFalesnyIndex() : vytvorIndexCloudflare(env.DB, env.VECTORIZE);
const api = vytvorApi({ ai, index, limiter: env.PODANI_RATE_LIMITER, vyvoj });

export const ALL: APIRoute = ({ request }) => api.fetch(request);
