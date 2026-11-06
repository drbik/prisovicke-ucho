import { describe, expect, it, vi } from 'vitest';
import { vytvorFalesneAi } from '../src/lib/ai/falesna';
import { vytvorApi } from '../src/lib/api/aplikace';
import { MAX_VELIKOST_NAHRAVKY_B } from '../src/lib/podani/limity';

const ADRESA = 'https://nezavisli-prisovice.cz/ucho/api';
const PUVOD = 'https://nezavisli-prisovice.cz';

function sestavit(moznosti: Parameters<typeof vytvorFalesneAi>[0] = {}) {
  const { ai, volani } = vytvorFalesneAi(moznosti);
  const log = vi.fn();
  const limiter = { limit: vi.fn(async (_moznosti: { key: string }) => ({ success: true })) };
  return { api: vytvorApi({ ai, limiter, log }), volani, log, limiter };
}

function hlavicky(typ: string) {
  return { 'content-type': typ, origin: PUVOD, 'cf-connecting-ip': '192.0.2.1' };
}

function nahravka(telo: BodyInit, typ = 'audio/webm;codecs=opus') {
  return new Request(`${ADRESA}/vzkaz/hlas`, { method: 'POST', headers: hlavicky(typ), body: telo });
}

function textovyVzkaz(text: unknown) {
  return new Request(`${ADRESA}/vzkaz/text`, {
    method: 'POST',
    headers: hlavicky('application/json'),
    body: JSON.stringify({ text }),
  });
}

describe('GET /api/health', () => {
  it('odpoví', async () => {
    const { api } = sestavit();
    const odpoved = await api.fetch(new Request(`${ADRESA}/health`));
    expect(odpoved.status).toBe(200);
    expect(await odpoved.json()).toEqual({ stav: 'ok' });
    expect(odpoved.headers.get('cache-control')).toBe('no-store');
  });
});

describe('POST /api/vzkaz/hlas (krok 2.3)', () => {
  it('vrátí přepis nahrávky', async () => {
    const { api, volani } = sestavit();
    const odpoved = await api.fetch(nahravka(new Uint8Array([1, 2, 3])));
    expect(odpoved.status).toBe(200);
    const data = await odpoved.json() as { vstup: string; text: string; technicke: { typ: string; velikostB: number } };
    expect(data.vstup).toBe('hlas');
    expect(data.text).toContain('falešný přepis');
    expect(data.technicke).toMatchObject({ typ: 'audio/webm', velikostB: 3 });
    expect(volani).toEqual([new Uint8Array([1, 2, 3])]);
  });

  it('do logu dá časy a velikost, ale ne audio ani přepis', async () => {
    const { api, log } = sestavit({ vysledek: { text: 'Tajný vzkaz občana' } });
    await api.fetch(nahravka(new Uint8Array([1, 2, 3])));
    expect(log).toHaveBeenCalledTimes(1);
    const zaznam = log.mock.calls[0][0] as Record<string, unknown>;
    expect(zaznam).toMatchObject({ udalost: 'prepis', typ: 'audio/webm', velikostB: 3 });
    expect(zaznam).toHaveProperty('cteniMs');
    expect(zaznam).toHaveProperty('prepisMs');
    expect(JSON.stringify(zaznam)).not.toContain('Tajný');
  });

  it('odmítne jiný typ než zvuk', async () => {
    const { api, volani } = sestavit();
    const odpoved = await api.fetch(nahravka('x', 'text/plain'));
    expect(odpoved.status).toBe(415);
    expect(await odpoved.json()).toEqual({ chyba: 'spatny-typ' });
    expect(volani).toHaveLength(0);
  });

  it('odmítne cizí původ dřív, než sáhne na limiter', async () => {
    const { api, limiter } = sestavit();
    const odpoved = await api.fetch(new Request(`${ADRESA}/vzkaz/hlas`, {
      method: 'POST',
      headers: { ...hlavicky('audio/webm'), origin: 'https://example.com' },
      body: new Uint8Array([1]),
    }));
    expect(odpoved.status).toBe(403);
    expect(limiter.limit).not.toHaveBeenCalled();
  });

  it('odmítne požadavek bez hlavičky Origin', async () => {
    const { api } = sestavit();
    const odpoved = await api.fetch(new Request(`${ADRESA}/vzkaz/hlas`, {
      method: 'POST',
      headers: { 'content-type': 'audio/webm', 'cf-connecting-ip': '192.0.2.1' },
      body: new Uint8Array([1]),
    }));
    expect(odpoved.status).toBe(403);
  });

  it('po překročení limitu nečte tělo a nevolá AI', async () => {
    const { api, volani, limiter } = sestavit();
    limiter.limit.mockResolvedValue({ success: false });
    const odpoved = await api.fetch(nahravka(new Uint8Array([1])));
    expect(odpoved.status).toBe(429);
    expect(odpoved.headers.get('retry-after')).toBe('60');
    expect(volani).toHaveLength(0);
  });

  it('limiter dostane hash, ne IP adresu', async () => {
    const { api, limiter } = sestavit();
    await api.fetch(nahravka(new Uint8Array([1])));
    expect(limiter.limit.mock.calls[0][0].key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('bez limiteru v produkci nepustí nic', async () => {
    const { ai } = vytvorFalesneAi();
    const odpoved = await vytvorApi({ ai, log: vi.fn() }).fetch(nahravka(new Uint8Array([1])));
    expect(odpoved.status).toBe(503);
  });

  it('odmítne příliš velkou nahrávku i bez Content-Length', async () => {
    const { api, volani } = sestavit();
    const velka = new ReadableStream({
      start(ovladac) {
        ovladac.enqueue(new Uint8Array(MAX_VELIKOST_NAHRAVKY_B));
        ovladac.enqueue(new Uint8Array(1));
        ovladac.close();
      },
    });
    const odpoved = await api.fetch(new Request(`${ADRESA}/vzkaz/hlas`, {
      method: 'POST',
      headers: hlavicky('audio/webm'),
      body: velka,
      duplex: 'half',
    } as RequestInit));
    expect(odpoved.status).toBe(413);
    expect(volani).toHaveLength(0);
  });

  it('odmítne deklarovanou velikost nad limit, aniž by tělo četl', async () => {
    const { api, volani } = sestavit();
    const odpoved = await api.fetch(new Request(`${ADRESA}/vzkaz/hlas`, {
      method: 'POST',
      headers: { ...hlavicky('audio/webm'), 'content-length': String(MAX_VELIKOST_NAHRAVKY_B + 1) },
      body: new Uint8Array([1]),
    }));
    expect(odpoved.status).toBe(413);
    expect(volani).toHaveLength(0);
  });

  it('odmítne prázdnou nahrávku', async () => {
    const { api } = sestavit();
    const odpoved = await api.fetch(nahravka(new Uint8Array()));
    expect(odpoved.status).toBe(400);
    expect(await odpoved.json()).toEqual({ chyba: 'prazdna-nahravka' });
  });

  it('když AI selže, autor dostane chybu a hláška jde do logu', async () => {
    const { api, log } = sestavit({ chyba: new Error('Model odmítl vstup') });
    const odpoved = await api.fetch(nahravka(new Uint8Array([1])));
    expect(odpoved.status).toBe(502);
    expect(await odpoved.json()).toEqual({ chyba: 'prepis-selhal' });
    expect(log.mock.calls[0][0]).toMatchObject({ udalost: 'prepis-selhal', hlaska: 'Model odmítl vstup' });
  });

  it('prázdný přepis je samostatná chyba', async () => {
    const { api } = sestavit({ vysledek: { text: '   ' } });
    const odpoved = await api.fetch(nahravka(new Uint8Array([1])));
    expect(odpoved.status).toBe(422);
    expect(await odpoved.json()).toEqual({ chyba: 'prazdny-prepis' });
  });
});

describe('POST /api/vzkaz/text (F-04, krok 2.5)', () => {
  it('vrátí text stejně jako přepis', async () => {
    const { api, volani } = sestavit();
    const odpoved = await api.fetch(textovyVzkaz('  Prosím o opravu chodníku.  '));
    expect(odpoved.status).toBe(200);
    expect(await odpoved.json()).toEqual({ vstup: 'text', text: 'Prosím o opravu chodníku.' });
    expect(volani).toHaveLength(0);
  });

  it.each([
    [10, 200],
    [3000, 200],
    [9, 422],
    [3001, 422],
  ])('délka %d znaků dá stav %d', async (delka, stav) => {
    const { api } = sestavit();
    const odpoved = await api.fetch(textovyVzkaz('á'.repeat(delka)));
    expect(odpoved.status).toBe(stav);
  });

  it('samé mezery nestačí', async () => {
    const { api } = sestavit();
    const odpoved = await api.fetch(textovyVzkaz(' '.repeat(50)));
    expect(odpoved.status).toBe(422);
  });

  it.each([
    ['chybějící text', '{}'],
    ['text jiného typu', '{"text":123}'],
    ['null', 'null'],
    ['neplatný JSON', '{'],
  ])('odmítne %s', async (_nazev, telo) => {
    const { api } = sestavit();
    const odpoved = await api.fetch(new Request(`${ADRESA}/vzkaz/text`, {
      method: 'POST',
      headers: hlavicky('application/json'),
      body: telo,
    }));
    expect(odpoved.status).toBe(422);
  });

  it('do logu nedá obsah vzkazu', async () => {
    const { api, log } = sestavit();
    await api.fetch(textovyVzkaz('Soukromý vzkaz občana'));
    expect(log.mock.calls[0][0]).toEqual({ udalost: 'text', znaku: 21 });
  });
});

describe('lokální vývoj', () => {
  it('povolí localhost bez limiteru', async () => {
    const { ai } = vytvorFalesneAi();
    const api = vytvorApi({ ai, vyvoj: true, log: vi.fn() });
    const odpoved = await api.fetch(new Request('http://localhost:4321/ucho/api/vzkaz/hlas', {
      method: 'POST',
      headers: { 'content-type': 'audio/webm', origin: 'http://localhost:4321' },
      body: new Uint8Array([1]),
    }));
    expect(odpoved.status).toBe(200);
  });
});
