import type { APIRoute } from 'astro';
import { vytvorApi } from '../../lib/api/aplikace';
import { ai, index, klicPodpisu, limiter, limiterStylu, uloziste, vyvoj } from '../../lib/prostredi';

export const prerender = false;

const api = vytvorApi({ ai, index, uloziste, limiter, limiterStylu, vyvoj, klicPodpisu });

export const ALL: APIRoute = ({ request }) => api.fetch(request);
