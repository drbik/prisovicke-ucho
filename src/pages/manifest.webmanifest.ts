// Manifest aplikace (PWA, 13. 11. 2026): ucho jde přidat na plochu telefonu s Androidem i iPhonu a otevírá se
// jako samostatná aplikace. Patří jen cestě /ucho, web Nezávislých se tím nemění. Endpoint místo souboru v public,
// protože soubory z public se při sestavení kopírují mimo /ucho (do kořene domény, která patří webu).
import type { APIRoute } from 'astro';
import ikona192 from '../ikony/ucho-192.png';
import ikona512 from '../ikony/ucho-512.png';

export const prerender = true;

const zaklad = import.meta.env.BASE_URL.replace(/\/?$/, '/');

export const GET: APIRoute = () => new Response(JSON.stringify({
  id: zaklad,
  name: 'Příšovické ucho',
  short_name: 'Ucho',
  description: 'Namluvte nebo napište návrh či dotaz k dění v Příšovicích.',
  lang: 'cs',
  start_url: zaklad,
  scope: zaklad,
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#faf8f1',
  theme_color: '#236b60',
  icons: [
    { src: ikona192.src, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: ikona512.src, sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: ikona512.src, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}), { headers: { 'content-type': 'application/manifest+json; charset=utf-8' } });
