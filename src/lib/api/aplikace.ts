import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { ChybaPodani } from '../podani/chyby';
import { odpovedetNaPripraveny, pripravitDotaz, zpracovatDotaz, type UdalostDotazu, type ZavislostiDotazu } from '../odpovedi/zpracovani';
import { zpracovatHlas, zpracovatText } from '../podani/zpracovani';

// Průběh hledání odpovědi chodí po řádcích JSON, když o něj stránka požádá hlavičkou Accept.
export const TYP_PRUBEHU = 'application/x-ndjson';

// Tenká vrstva nad moduly podani, odpovedi a ai. Sama nic nerozhoduje, jen převádí výsledky na HTTP.
export function vytvorApi(z: ZavislostiDotazu) {
  const api = new Hono().basePath('/ucho/api');

  api.use(async (c, next) => {
    await next();
    if (!c.res.headers.has('cache-control')) c.res.headers.set('cache-control', 'no-store');
  });

  api.get('/health', (c) => c.json({ stav: 'ok' }));
  api.post('/vzkaz/hlas', async (c) => c.json(await zpracovatHlas(c.req.raw, z)));
  api.post('/vzkaz/text', async (c) => c.json(await zpracovatText(c.req.raw, z)));
  api.post('/dotaz', async (c) => {
    if (!(c.req.header('accept') ?? '').includes(TYP_PRUBEHU)) return c.json(await zpracovatDotaz(c.req.raw, z));
    // Chyby požadavku (původ, limit, text) přijdou jako HTTP chyba dřív, než začne průběh.
    const dotaz = await pripravitDotaz(c.req.raw, z);
    c.header('content-type', `${TYP_PRUBEHU}; charset=utf-8`);
    // no-transform: Cloudflare průběh nekomprimuje a nezdržuje ho ve vyrovnávací paměti.
    c.header('cache-control', 'no-store, no-transform');
    return stream(c, async (proud) => {
      let fronta = Promise.resolve();
      const poslat = (udalost: UdalostDotazu) => {
        fronta = fronta.then(async () => {
          await proud.write(`${JSON.stringify(udalost)}\n`);
        }).catch(() => {});
        return fronta;
      };
      const vysledek = await odpovedetNaPripraveny(dotaz, z, (udalost) => void poslat(udalost));
      await poslat({ udalost: 'vysledek', vysledek });
    });
  });

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
