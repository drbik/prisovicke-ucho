import { describe, expect, it, vi } from 'vitest';
import { vytvorFalesneAi } from '../src/lib/ai/falesna';
import { vytvorApi } from '../src/lib/api/aplikace';
import { vytvorFalesnyIndex } from '../src/lib/odpovedi/falesny';
import { JMENA_MLUVCICH, KLICE_MLUVCICH } from '../src/lib/odpovedi/mluvci';
import {
  POKUSU_STYLU,
  POSTAVY,
  TEXT_BEZ_ODPOVEDI,
  cislaHodnoty,
  cislovkySlovy,
  overitPodpis,
  podepsatPodklad,
  pokynyStylu,
  pokynyVzkazu,
  precistPodklad,
  prepsatVzkaz,
  prevypravet,
  vycistitPrevypraveni,
  zkontrolovatPrevypraveni,
  zpravyStylu,
  zpravyVzkazu,
  type PodkladPrevypraveni,
} from '../src/lib/odpovedi/styl';
import type { NalezenyUsek } from '../src/lib/odpovedi/typy';
import { hlavickaUseku } from '../src/lib/odpovedi/zdroje';
import type { VysledekDotazu } from '../src/lib/odpovedi/zpracovani';

const PUVOD = 'https://nezavisli-prisovice.cz';
const KLIC = 'testovaci-klic';

const PODKLAD: PodkladPrevypraveni = {
  dotaz: 'Do kolika má ve čtvrtek otevřeno lékárna?',
  casti: [{ otazka: null, vety: ['Lékárna má ve čtvrtek otevřeno od 07.30 do 12.00 a od 12.30 do 16.00.'] }],
};

describe('čísla v převyprávění', () => {
  it('stejná hodnota v různém zápisu je totéž číslo', () => {
    expect(cislaHodnoty('4 000 Kč')).toEqual(cislaHodnoty('4.000 Kč'));
    expect(cislaHodnoty('4000 Kč')).toEqual(new Set(['4000']));
    expect(cislaHodnoty('od 07.30 do 12.00')).toEqual(cislaHodnoty('od 7:30 do 12 hodin'));
  });

  it('převyprávění se všemi čísly odpovědi projde', () => {
    expect(zkontrolovatPrevypraveni(PODKLAD, 'Ay caramba! Lékárna jede od 7:30 do 12, pak pauza, a od 12:30 do 16. Fakt.')).toBeNull();
  });

  it('chybějící číslo neprojde', () => {
    expect(zkontrolovatPrevypraveni(PODKLAD, 'Lékárna má otevřeno od 7:30 do 12 a pak odpoledne.')).toBe('chybi-cislo');
  });

  it('číslo navíc neprojde, ani rok nebo počet', () => {
    expect(zkontrolovatPrevypraveni(PODKLAD, 'Od 7:30 do 12 a od 12:30 do 16, tedy 8 hodin denně.')).toBe('cislo-navic');
    expect(zkontrolovatPrevypraveni(PODKLAD, 'Léta Páně 1348: od 7:30 do 12 a od 12:30 do 16.')).toBe('cislo-navic');
  });

  it('číslo z dotazu převyprávění zopakovat smí', () => {
    const podklad = { ...PODKLAD, dotaz: 'Jak je otevřeno 24. 12.?' };
    expect(zkontrolovatPrevypraveni(podklad, 'Na 24. 12. nevím, ale jinak od 7:30 do 12 a od 12:30 do 16.')).toBeNull();
  });

  it('povinné číslo smí mluvčí napsat slovy, kromě jedničky', () => {
    const podklad: PodkladPrevypraveni = { dotaz: 'Kolik?', casti: [{ otazka: null, vety: ['Obec staví 15 bytů za 1 rok.'] }] };
    expect(zkontrolovatPrevypraveni(podklad, 'Obec staví patnáct bytů za 1 rok.')).toBeNull();
    expect(zkontrolovatPrevypraveni(podklad, 'Obec staví 15 bytů, je mi to jedno.')).toBe('chybi-cislo');
  });

  it('číslovku ze slov odpovědi smí mluvčí napsat číslicí, jinou ne', () => {
    const podklad: PodkladPrevypraveni = { dotaz: 'Kolik?', casti: [{ otazka: null, vety: ['Úvěr má úrok jedno procento a dva roky odklad.'] }] };
    expect(zkontrolovatPrevypraveni(podklad, 'Úrok je 1 procento a odklad 2 roky.')).toBeNull();
    expect(zkontrolovatPrevypraveni(podklad, 'Úrok je 1 procento a odklad 3 roky.')).toBe('cislo-navic');
    expect(cislovkySlovy('Patnáct bytů, padesáti lidem, tři sta tisíc')).toEqual(new Set(['15', '50', '3', '100', '1000']));
  });

  it('prázdné a příliš dlouhé převyprávění neprojde', () => {
    expect(zkontrolovatPrevypraveni(PODKLAD, '   ')).toBe('prazdne');
    expect(zkontrolovatPrevypraveni(PODKLAD, `od 7:30 do 12 a od 12:30 do 16 ${'bla '.repeat(400)}`)).toBe('prilis-dlouhe');
  });
});

describe('zadání mluvčích', () => {
  it('každý mluvčí má jméno a zadání postavy', () => {
    expect(KLICE_MLUVCICH).toEqual(['bart', 'maly-princ', 'pu', 'sokrates', 'marvin', 'urednik', 'starocestina']);
    expect(Object.values(JMENA_MLUVCICH)).toEqual(['Bart Simpson', 'Malý princ', 'Medvídek Pú', 'Sokrates', 'Marvin', 'Suchý úředník', 'Staročeština']);
    for (const klic of KLICE_MLUVCICH) expect(POSTAVY[klic].length).toBeGreaterThan(200);
  });

  it('zadání nemá žádnou číslici, kterou by model mohl přenést do textu', () => {
    for (const klic of KLICE_MLUVCICH) expect(pokynyStylu(klic)).not.toMatch(/\d/);
  });

  it('dotaz na víc věcí dostane otázky částí, dotaz na jednu věc jen věty', () => {
    expect(zpravyStylu(PODKLAD, 'marvin')[1].content).toBe(`<dotaz>\n${PODKLAD.dotaz}\n</dotaz>\n\n<odpoved>\n${PODKLAD.casti[0].vety[0]}\n</odpoved>`);
    const casti: PodkladPrevypraveni = { dotaz: 'D', casti: [{ otazka: 'A?', vety: ['a.'] }, { otazka: 'B?', vety: ['b.', 'c.'] }] };
    expect(zpravyStylu(casti, 'marvin')[1].content).toContain('Otázka: A?\nOdpověď: a.\n\nOtázka: B?\nOdpověď: b. c.');
  });

  it('Markdown a blok kódu z výstupu zmizí', () => {
    expect(vycistitPrevypraveni('```\n# Nadpis\n**Ay caramba!** Lékárna\n- jede\n```')).toBe('Nadpis\nAy caramba! Lékárna\njede');
  });

  it('zopakované značky zmizí a scénická poznámka je v závorce', () => {
    expect(vycistitPrevypraveni('<odpoved>\n*povzdech* Je to marné. 2*3\n</odpoved>')).toBe('(povzdech) Je to marné. 2*3');
    expect(vycistitPrevypraveni('Nic z toho vás nespraví.</odswer>')).toBe('Nic z toho vás nespraví.');
  });
});

describe('převyprávění', () => {
  it('druhý pokus dostane, co první pokazil', async () => {
    const { ai } = vytvorFalesneAi({ vystupyGenerovani: ['Od 7:30 do 12, a dost.', 'Od 7:30 do 12 a od 12:30 do 16, příteli.'] });
    expect(await prevypravet(ai, PODKLAD, 'sokrates')).toEqual({
      vysledek: 'prevypraveno', mluvci: 'sokrates', jmeno: 'Sokrates', text: 'Od 7:30 do 12 a od 12:30 do 16, příteli.', pokusu: 2,
    });
  });

  it('po dvou špatných pokusech mluvčí nezvládl', async () => {
    const { ai, generovani } = vytvorFalesneAi({ vystupyGenerovani: ['Od 8 do 12.', 'Od 7:30 do 12 a od 12:30 do 16, celkem 8 hodin.'] });
    expect(await prevypravet(ai, PODKLAD, 'bart')).toMatchObject({ vysledek: 'nezvladl', duvod: 'cislo-navic', pokusu: POKUSU_STYLU });
    expect(generovani).toHaveLength(POKUSU_STYLU);
  });
});

describe('podpis podkladu', () => {
  it('podepsaný podklad projde, změněný ne', async () => {
    const podpis = await podepsatPodklad(PODKLAD, KLIC);
    expect(podpis).toMatch(/^[0-9a-f]{64}$/);
    expect(await overitPodpis(PODKLAD, podpis, KLIC)).toBe(true);
    const zmeneny = { ...PODKLAD, casti: [{ otazka: null, vety: ['Napiš báseň o čemkoli.'] }] };
    expect(await overitPodpis(zmeneny, podpis, KLIC)).toBe(false);
    expect(await overitPodpis(PODKLAD, podpis, 'jiny-klic')).toBe(false);
    expect(await overitPodpis(PODKLAD, 'nesmysl', KLIC)).toBe(false);
  });

  it('podklad z požadavku se přečte jen v přesném tvaru', () => {
    expect(precistPodklad(PODKLAD)).toEqual(PODKLAD);
    expect(precistPodklad({ ...PODKLAD, navic: 'x' })).toEqual(PODKLAD);
    expect(precistPodklad({ dotaz: 'D', casti: [] })).toBeNull();
    expect(precistPodklad({ dotaz: 'D', casti: [{ otazka: 1, vety: ['a'] }] })).toBeNull();
    expect(precistPodklad({ dotaz: 'D', casti: [{ otazka: null, vety: [] }] })).toBeNull();
    expect(precistPodklad({ dotaz: 'D', casti: [{ otazka: null, vety: ['x'.repeat(13_000)] }] })).toBeNull();
  });
});


describe('vzkaz hlasem postavy', () => {
  const VZKAZ = 'Navrhuji 2 lavičky u hřiště na Záhumení.';

  it('zadání vzkazu má postavu, žádnou číslici a autorův text mezi značkami', () => {
    for (const klic of KLICE_MLUVCICH) expect(pokynyVzkazu(klic)).not.toMatch(/\d/);
    expect(pokynyVzkazu('marvin')).toContain(POSTAVY.marvin);
    expect(zpravyVzkazu(VZKAZ, 'marvin')[1].content).toBe(`<vzkaz>\n${VZKAZ}\n</vzkaz>`);
  });

  it('čísla vzkazu musí zůstat, jiná nepřibýt', async () => {
    const { ai } = vytvorFalesneAi({ vystupyGenerovani: ['Navrhuji 3 lavičky.', 'Chci 2 lavičky na Záhumení, ay caramba!'] });
    expect(await prepsatVzkaz(ai, VZKAZ, 'bart')).toMatchObject({ vysledek: 'prevypraveno', text: 'Chci 2 lavičky na Záhumení, ay caramba!', pokusu: 2 });
  });
});

function sestavitApi(moznosti: Parameters<typeof vytvorFalesneAi>[0] = {}, klic: string | null = KLIC) {
  const { ai, generovani } = vytvorFalesneAi(moznosti);
  const log = vi.fn();
  const limiter = { limit: vi.fn(async (_moznosti: { key: string }) => ({ success: true })) };
  const limiterStylu = { limit: vi.fn(async (_moznosti: { key: string }) => ({ success: true })) };
  return { api: vytvorApi({ ai, limiter, limiterStylu, log, klicPodpisu: klic ?? undefined }), generovani, log, limiter, limiterStylu };
}

function zadost(cesta: string, telo: unknown, hlavicky: Record<string, string> = {}) {
  return new Request(`${PUVOD}/ucho/api${cesta}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: PUVOD, 'cf-connecting-ip': '192.0.2.1', ...hlavicky },
    body: JSON.stringify(telo),
  });
}

describe('POST /api/vzkaz/styl', () => {
  const VZKAZ = 'Prosím o opravu chodníku v ulici Na Výsluní.';

  it('přepíše vzkaz hlasem postavy a do logu nedá text', async () => {
    const { api, generovani, log, limiterStylu, limiter } = sestavitApi({ vystupyGenerovani: ['(povzdech) Opravte chodník Na Výsluní. Stejně je to marné.'] });
    const odpoved = await api.fetch(zadost('/vzkaz/styl', { mluvci: 'marvin', text: VZKAZ }));
    expect(odpoved.status).toBe(200);
    expect(await odpoved.json()).toEqual({ vysledek: 'prevypraveno', mluvci: 'marvin', jmeno: 'Marvin', text: '(povzdech) Opravte chodník Na Výsluní. Stejně je to marné.', pokusu: 1 });
    expect(generovani[0][0].content).toContain('Jsi Marvin');
    expect(generovani[0][1].content).toContain(VZKAZ);
    expect(log.mock.calls[0][0]).toMatchObject({ udalost: 'prevypraveni', co: 'vzkaz', mluvci: 'marvin', vysledek: 'prevypraveno' });
    expect(JSON.stringify(log.mock.calls)).not.toContain('chodník');
    // Postavy mají vlastní limit požadavků, podání se nepočítá.
    expect(limiterStylu.limit).toHaveBeenCalledTimes(1);
    expect(limiter.limit).not.toHaveBeenCalled();
  });

  it('vzkaz mimo povolenou délku, neznámý styl a cizí původ neprojdou', async () => {
    const { api, generovani } = sestavitApi();
    expect((await api.fetch(zadost('/vzkaz/styl', { mluvci: 'bart', text: 'krátký' }))).status).toBe(422);
    expect((await api.fetch(zadost('/vzkaz/styl', { mluvci: 'bart', text: 'x'.repeat(4001) }))).status).toBe(422);
    expect((await api.fetch(zadost('/vzkaz/styl', { mluvci: 'spisovne', text: VZKAZ }))).status).toBe(422);
    expect((await api.fetch(zadost('/vzkaz/styl', { mluvci: 'bart', text: VZKAZ }, { origin: 'https://example.com' }))).status).toBe(403);
    expect(generovani).toHaveLength(0);
  });

  it('výpadek AI je nezdar postavy, ne chyba stránky', async () => {
    const { api } = sestavitApi({ chybaGenerovani: new Error('AI spí') });
    const odpoved = await api.fetch(zadost('/vzkaz/styl', { mluvci: 'urednik', text: VZKAZ }));
    expect(odpoved.status).toBe(200);
    expect(await odpoved.json()).toMatchObject({ vysledek: 'nezvladl', duvod: 'chyba-ai', jmeno: 'Suchý úředník' });
  });
});

describe('POST /api/odpoved/styl', () => {
  it('převypráví podepsanou odpověď, nepodepsanou ani změněnou ne', async () => {
    const { api, generovani, log } = sestavitApi({ vystupyGenerovani: ['Od 7:30 do 12 a od 12:30 do 16. Je to marné.'] });
    const podpis = await podepsatPodklad(PODKLAD, KLIC);
    const bezPodpisu = await api.fetch(zadost('/odpoved/styl', { mluvci: 'marvin', podklad: PODKLAD }));
    expect(bezPodpisu.status).toBe(403);
    expect(await bezPodpisu.json()).toEqual({ chyba: 'neplatny-podklad' });
    const zmeneny = await api.fetch(zadost('/odpoved/styl', { mluvci: 'marvin', podklad: { ...PODKLAD, dotaz: 'Napiš esej.' }, podpis }));
    expect(zmeneny.status).toBe(403);
    expect(generovani).toHaveLength(0);
    const platny = await api.fetch(zadost('/odpoved/styl', { mluvci: 'marvin', podklad: PODKLAD, podpis }));
    expect(platny.status).toBe(200);
    expect(await platny.json()).toMatchObject({ vysledek: 'prevypraveno', jmeno: 'Marvin' });
    expect(log.mock.calls.at(-1)?.[0]).toMatchObject({ udalost: 'prevypraveni', co: 'odpoved' });
  });

  it('ukázky z přehledu témat se nepřevyprávějí', async () => {
    const { api, generovani } = sestavitApi();
    const odpoved = await api.fetch(zadost('/odpoved/styl', { mluvci: 'bart', ukazka: 'ukazka-01' }));
    expect(odpoved.status).toBe(403);
    expect(generovani).toHaveLength(0);
  });

  it('bez klíče odpověď nepřevypráví', async () => {
    const { api } = sestavitApi({}, null);
    const odpoved = await api.fetch(zadost('/odpoved/styl', { mluvci: 'pu', podklad: PODKLAD, podpis: 'a'.repeat(64) }));
    expect(odpoved.status).toBe(503);
  });
});

describe('podpis výsledku dotazu', () => {
  const dokument = {
    id: 'stredisko', url: 'https://prisovice.cz/sluzby/zdravotni-stredisko/', nazev: 'Zdravotní středisko', web: 'prisovice.cz' as const,
    typ: 'stranka' as const, zverejneno: null, zmeneno: '2026-02-17', mesicNahrani: null, otisk: 'a', stazeno: '2026-11-10T08:00:00.000Z', nadrazenyUrl: null,
  };
  const usek: NalezenyUsek = { id: 'u', dokumentId: 'stredisko', poradi: 0, strana: null, hlavicka: hlavickaUseku(dokument, null), text: 'Lékárna čt: 07.30 – 12.00 12.30 – 16.00', dokument };
  const vety = JSON.stringify({ vety: [{ veta: PODKLAD.casti[0].vety[0], usek: 1, citace: 'čt: 07.30 – 12.00 12.30 – 16.00' }] });
  const overeno = JSON.stringify({ vysledky: [{ cislo: 1, plyne: true }] });

  async function zeptatSe(moznosti: { klic?: string; vystupy?: string[]; typ?: string; chyba?: Error } = {}) {
    const { ai } = vytvorFalesneAi({ vystupyGenerovani: moznosti.vystupy ?? [vety, overeno], chybaGenerovani: moznosti.chyba });
    const limiter = { limit: vi.fn(async () => ({ success: true })) };
    const api = vytvorApi({ ai, index: vytvorFalesnyIndex([usek], () => 0.8), limiter, log: vi.fn(), klicPodpisu: moznosti.klic });
    const odpoved = await api.fetch(zadost('/dotaz', { text: PODKLAD.dotaz, typ: moznosti.typ ?? 'dotaz' }));
    return await odpoved.json() as VysledekDotazu;
  }

  it('zodpovězený dotaz nese podklad s podpisem, který server přijme', async () => {
    const data = await zeptatSe({ klic: KLIC });
    if (data.vysledek !== 'odpoved') throw new Error(`Čekal jsem odpověď, přišlo ${data.vysledek}.`);
    expect(data.prevypraveni?.podklad).toEqual(PODKLAD);
    expect(await overitPodpis(PODKLAD, data.prevypraveni!.podpis, KLIC)).toBe(true);
  });

  it('dotaz bez odpovědi nese podepsanou zprávu, že odpověď na webu není', async () => {
    const data = await zeptatSe({ klic: KLIC, vystupy: [JSON.stringify({ vety: [] })] });
    if (data.vysledek !== 'zastupitelum' || !('prevypraveni' in data)) throw new Error(`Čekal jsem dotaz bez odpovědi s podkladem, přišlo ${JSON.stringify(data)}.`);
    expect(data.prevypraveni?.podklad).toEqual({ dotaz: PODKLAD.dotaz, casti: [{ otazka: null, vety: [TEXT_BEZ_ODPOVEDI] }] });
  });

  it('výpadek AI, vzkaz bez dotazu a server bez klíče podklad nemají', async () => {
    const vypadek = await zeptatSe({ klic: KLIC, chyba: new Error('AI spí') });
    expect(vypadek).toMatchObject({ vysledek: 'zastupitelum', duvod: 'chyba-ai' });
    expect('prevypraveni' in vypadek).toBe(false);
    const navrh = await zeptatSe({ klic: KLIC, typ: 'navrh' });
    expect(navrh).toEqual({ vysledek: 'nehleda', typ: 'navrh' });
    const bezKlice = await zeptatSe();
    expect(bezKlice.vysledek).toBe('odpoved');
    expect('prevypraveni' in bezKlice).toBe(false);
  });
});
