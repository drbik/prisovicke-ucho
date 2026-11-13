// Service worker ucha (PWA, 13. 11. 2026). Nic neukládá do mezipaměti: vzkazy, přepisy ani odpovědi v telefonu
// nezůstávají a stránka je vždy čerstvá ze serveru. Bez připojení ukáže krátkou zprávu místo chyby prohlížeče.
// Endpoint místo souboru v public, aby ležel pod /ucho a jeho rozsah byl jen ucho.
import type { APIRoute } from 'astro';

export const prerender = true;

const BEZ_PRIPOJENI = '<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Příšovické ucho</title></head>'
  + '<body style="margin:0;padding:32px 20px;font-family:system-ui,sans-serif;color:#18332e;background:#faf8f1">'
  + '<h1 style="font-size:1.6rem">Bez připojení</h1><p>Ucho potřebuje internet. Zkuste to znovu, až budete online.</p></body></html>';

const SKRIPT = `// Příšovické ucho: service worker bez mezipaměti.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (udalost) => udalost.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (udalost) => {
  if (udalost.request.mode !== 'navigate') return;
  udalost.respondWith(fetch(udalost.request).catch(() => new Response(${JSON.stringify(BEZ_PRIPOJENI)}, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })));
});
`;

export const GET: APIRoute = () => new Response(SKRIPT, {
  headers: { 'content-type': 'text/javascript; charset=utf-8' },
});
