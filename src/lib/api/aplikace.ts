import { Hono } from 'hono';
import { ChybaPodani } from '../podani/chyby';
import { zpracovatDotaz, type ZavislostiDotazu } from '../odpovedi/zpracovani';
import { zpracovatHlas, zpracovatText } from '../podani/zpracovani';

// Tenká vrstva nad moduly podani, odpovedi a ai. Sama nic nerozhoduje, jen převádí výsledky na HTTP.
export function vytvorApi(z: ZavislostiDotazu) {
  const api = new Hono().basePath('/ucho/api');

  api.use(async (c, next) => {
    await next();
    c.res.headers.set('cache-control', 'no-store');
  });

  api.get('/health', (c) => c.json({ stav: 'ok' }));
  api.post('/vzkaz/hlas', async (c) => c.json(await zpracovatHlas(c.req.raw, z)));
  api.post('/vzkaz/text', async (c) => c.json(await zpracovatText(c.req.raw, z)));
  api.post('/dotaz', async (c) => c.json(await zpracovatDotaz(c.req.raw, z)));

  api.onError((chyba, c) => {
    if (!(chyba instanceof ChybaPodani)) {
      console.error({ udalost: 'vnitrni-chyba', hlaska: chyba.message.slice(0, 300) });
      return c.json({ chyba: 'vnitrni-chyba' }, 500);
    }
    if (chyba.status === 429) c.header('retry-after', '60');
    return c.json({ chyba: chyba.kod }, chyba.status);
  });
  api.notFound((c) => c.json({ chyba: 'nenalezeno' }, 404));

  return api;
}
