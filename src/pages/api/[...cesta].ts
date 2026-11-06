import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { vytvorCloudflareAi } from '../../lib/ai/cloudflare';
import { vytvorFalesneAi } from '../../lib/ai/falesna';
import { vytvorApi } from '../../lib/api/aplikace';

export const prerender = false;

const vyvoj = import.meta.env.DEV;
const ai = vyvoj && env.FALESNE_AI === '1' ? vytvorFalesneAi().ai : vytvorCloudflareAi(env.AI);
const api = vytvorApi({ ai, limiter: env.PODANI_RATE_LIMITER, vyvoj });

export const ALL: APIRoute = ({ request }) => api.fetch(request);
