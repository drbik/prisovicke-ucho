import { describe, expect, it, vi } from 'vitest';
import { vytvorFalesneAi } from '../src/lib/ai/falesna';
import { VERZE_PROMPTU } from '../src/lib/ai/prompt-upravy';
import { vytvorApi } from '../src/lib/api/aplikace';
import { MAX_VELIKOST_NAHRAVKY_B } from '../src/lib/podani/limity';
import type { VysledekPodani } from '../src/lib/podani/zpracovani';

const ADRESA = 'https://nezavisli-prisovice.cz/ucho/api';
const PUVOD = 'https://nezavisli-prisovice.cz';

function sestavit(moznosti: Parameters<typeof vytvorFalesneAi>[0] = {}, limitUpravyMs?: number) {
  const { ai, volani, upravy } = vytvorFalesneAi(moznosti);
  const log = vi.fn();
  const limiter = { limit: vi.fn(async (_moznosti: { key: string }) => ({ success: true })) };
  return { api: vytvorApi({ ai, limiter, log, limitUpravyMs }), volani, upravy, log, limiter };
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
  it('vrátí surový přepis i úpravu (krok 3.3)', async () => {
    const { api, volani, upravy } = sestavit({ vysledek: { text: ' surový přepis ' } });
    const odpoved = await api.fetch(nahravka(new Uint8Array([1, 2, 3])));
    expect(odpoved.status).toBe(200);
    const data = await odpoved.json() as VysledekPodani;
    expect(data.vstup).toBe('hlas');
    expect(data.surovyText).toBe('surový přepis');
    expect(data.uprava).toEqual({
      text: 'Toto je falešně upravený vzkaz pro lokální vývoj.',
      nazev: 'Falešný název vzkazu',
      oblast: 'ostatni',
      typ: 'navrh',
    });
    expect(data.technicke).toMatchObject({
      typ: 'audio/webm',
      velikostB: 3,
      modelUpravy: 'falesny-model',
      verzePromptu: VERZE_PROMPTU,
      pokusuUpravy: 1,
    });
    expect(volani).toEqual([new Uint8Array([1, 2, 3])]);
    expect(upravy).toEqual(['surový přepis']);
  });

  it('do logu dá časy a velikost, ale ne audio, přepis ani úpravu', async () => {
    const { api, log } = sestavit({
      vysledek: { text: 'Tajný vzkaz občana' },
      vystupyUpravy: ['{"text":"Tajná úprava","nazev":"Tajný název","oblast":"ostatni","typ":"dotaz"}'],
    });
    await api.fetch(nahravka(new Uint8Array([1, 2, 3])));
    expect(log).toHaveBeenCalledTimes(2);
    const [prepis, uprava] = log.mock.calls.map((volani) => volani[0] as Record<string, unknown>);
    expect(prepis).toMatchObject({ udalost: 'prepis', typ: 'audio/webm', velikostB: 3 });
    expect(prepis).toHaveProperty('cteniMs');
    expect(prepis).toHaveProperty('prepisMs');
    expect(uprava).toMatchObject({ udalost: 'uprava', model: 'falesny-model', pokusu: 1, znakuVstup: 18 });
    expect(uprava).toHaveProperty('upravaMs');
    expect(JSON.stringify(log.mock.calls)).not.toContain('Tajn');
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

  it('prázdný přepis je samostatná chyba a do úpravy nejde', async () => {
    const { api, upravy } = sestavit({ vysledek: { text: '   ' } });
    const odpoved = await api.fetch(nahravka(new Uint8Array([1])));
    expect(odpoved.status).toBe(422);
    expect(await odpoved.json()).toEqual({ chyba: 'prazdny-prepis' });
    expect(upravy).toHaveLength(0);
  });

  it('věta z titulků, kterou si Whisper vymyslel v tichu, je prázdný přepis a do úpravy nejde', async () => {
    const { api, upravy, log } = sestavit({ vysledek: { text: 'Titulky vytvořil JohnyX.' } });
    const odpoved = await api.fetch(nahravka(new Uint8Array([1])));
    expect(odpoved.status).toBe(422);
    expect(await odpoved.json()).toEqual({ chyba: 'prazdny-prepis' });
    expect(upravy).toHaveLength(0);
    // Do logu jde jen počet odstraněných vět, nikdy text.
    expect(log.mock.calls[0][0]).toMatchObject({ udalost: 'prepis', odstranenoVet: 1 });
    expect(JSON.stringify(log.mock.calls)).not.toContain('JohnyX');
  });

  it('titulky připsané za skutečnou řeč se odstraní a řeč zůstane', async () => {
    const { api, upravy } = sestavit({ vysledek: { text: 'Navrhuji lavičky u hřiště. Titulky vytvořil JohnyX.' } });
    const odpoved = await api.fetch(nahravka(new Uint8Array([1])));
    expect(odpoved.status).toBe(200);
    expect(upravy).toEqual(['Navrhuji lavičky u hřiště.']);
  });

  it('po neplatném výstupu modelu uspěje druhý pokus', async () => {
    const { api } = sestavit({
      vystupyUpravy: ['nesmysl', '{"text":"Druhý pokus.","nazev":"Název","oblast":"ostatni","typ":"dotaz"}'],
    });
    const data = await (await api.fetch(nahravka(new Uint8Array([1])))).json() as VysledekPodani;
    expect(data.uprava.text).toBe('Druhý pokus.');
    expect(data.technicke.pokusuUpravy).toBe(2);
  });
});

describe('selhání úpravy (krok 3.4)', () => {
  it('dvakrát neplatný výstup dá chybu, kterou autor může zopakovat', async () => {
    const { api, log } = sestavit({ vysledek: { text: 'Tajný vzkaz' }, vystupyUpravy: ['nesmysl', 'taky nesmysl'] });
    const odpoved = await api.fetch(nahravka(new Uint8Array([1])));
    expect(odpoved.status).toBe(502);
    expect(await odpoved.json()).toEqual({ chyba: 'uprava-selhala' });
    expect(log.mock.calls[1][0]).toMatchObject({ udalost: 'uprava-selhala' });
    expect(JSON.stringify(log.mock.calls)).not.toContain('nesmysl');
    expect(JSON.stringify(log.mock.calls)).not.toContain('Tajný');
  });

  it('výpadek modelu dá stejnou chybu', async () => {
    const { api, log } = sestavit({ chybaUpravy: new Error('Model nedostupný') });
    const odpoved = await api.fetch(textovyVzkaz('Prosím o opravu chodníku.'));
    expect(odpoved.status).toBe(502);
    expect(await odpoved.json()).toEqual({ chyba: 'uprava-selhala' });
    expect(log.mock.calls[1][0]).toMatchObject({ udalost: 'uprava-selhala', hlaska: 'Model nedostupný' });
  });

  it('model, který neodpoví včas, se přestane čekat', async () => {
    const { api, log } = sestavit({ zpozdeniUpravyMs: 200 }, 5);
    const odpoved = await api.fetch(textovyVzkaz('Prosím o opravu chodníku.'));
    expect(odpoved.status).toBe(502);
    expect(await odpoved.json()).toEqual({ chyba: 'uprava-selhala' });
    expect(log.mock.calls[1][0]).toMatchObject({ hlaska: 'Model neodpověděl včas.' });
  });
});

describe('POST /api/vzkaz/text (F-04, krok 2.5)', () => {
  it('text jde rovnou do úpravy, bez přepisu (krok 3.3)', async () => {
    const { api, volani, upravy } = sestavit();
    const odpoved = await api.fetch(textovyVzkaz('  Prosím o opravu chodníku.  '));
    expect(odpoved.status).toBe(200);
    const data = await odpoved.json() as VysledekPodani;
    expect(data.vstup).toBe('text');
    expect(data.surovyText).toBe('Prosím o opravu chodníku.');
    expect(data.uprava.nazev).toBe('Falešný název vzkazu');
    expect(data.technicke.typ).toBeUndefined();
    expect(volani).toHaveLength(0);
    expect(upravy).toEqual(['Prosím o opravu chodníku.']);
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
    expect(JSON.stringify(log.mock.calls)).not.toContain('Soukromý');
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
