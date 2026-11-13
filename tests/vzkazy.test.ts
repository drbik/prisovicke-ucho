import { describe, expect, it, vi } from 'vitest';
import { vytvorFalesneAi } from '../src/lib/ai/falesna';
import { TYP_PRUBEHU, vytvorApi } from '../src/lib/api/aplikace';
import { vytvorFalesnyIndex } from '../src/lib/odpovedi/falesny';
import type { NalezenyUsek } from '../src/lib/odpovedi/typy';
import { hlavickaUseku } from '../src/lib/odpovedi/zdroje';
import type { UdalostDotazu, VysledekDotazu } from '../src/lib/odpovedi/zpracovani';
import type { VysledekPodani } from '../src/lib/podani/zpracovani';
import { UKAZKOVA_TEMATA } from '../src/lib/temata/temata';
import { feedDoStranky, polozkaUkazky, sestavitFeed } from '../src/lib/vzkazy/feed';
import { kosinus, nejpodobnejsi } from '../src/lib/vzkazy/podobnost';
import { naBajty, vytvorPametoveUloziste, zBajtu } from '../src/lib/vzkazy/uloziste';

const PUVOD = 'https://nezavisli-prisovice.cz';
const KLIC = 'testovaci-klic';
const DOTAZ = 'Do kolika má ve čtvrtek otevřeno lékárna na zdravotním středisku?';

const dokument = {
  id: 'stredisko', url: 'https://prisovice.cz/sluzby/zdravotni-stredisko/', nazev: 'Zdravotní středisko', web: 'prisovice.cz' as const,
  typ: 'stranka' as const, zverejneno: null, zmeneno: '2026-02-17', mesicNahrani: null, otisk: 'a', stazeno: '2026-11-10T08:00:00.000Z', nadrazenyUrl: null,
};
const usek: NalezenyUsek = { id: 'u', dokumentId: 'stredisko', poradi: 0, strana: null, hlavicka: hlavickaUseku(dokument, null), text: 'Lékárna čt: 07.30 – 12.00 12.30 – 16.00', dokument };
const VETY = JSON.stringify({ vety: [{ veta: 'Lékárna má ve čtvrtek otevřeno od 07.30 do 12.00 a od 12.30 do 16.00.', usek: 1, citace: 'čt: 07.30 – 12.00 12.30 – 16.00' }] });
const OVERENO = JSON.stringify({ vysledky: [{ cislo: 1, plyne: true }] });

function uprava(text: string, typ = 'dotaz') {
  return JSON.stringify({ text, nazev: 'Otevírací doba lékárny', oblast: 'ostatni', typ });
}

function sestavit(moznosti: Parameters<typeof vytvorFalesneAi>[0] = {}) {
  const { ai, generovani } = vytvorFalesneAi(moznosti);
  const uloziste = vytvorPametoveUloziste();
  const log = vi.fn();
  const limiter = { limit: vi.fn(async () => ({ success: true })) };
  const api = vytvorApi({ ai, index: vytvorFalesnyIndex([usek], () => 0.8), uloziste, limiter, log, klicPodpisu: KLIC });
  return { api, uloziste, log, generovani };
}

function zadost(cesta: string, telo: unknown, hlavicky: Record<string, string> = {}) {
  return new Request(`${PUVOD}/ucho/api${cesta}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: PUVOD, 'cf-connecting-ip': '192.0.2.1', ...hlavicky },
    body: JSON.stringify(telo),
  });
}

async function napsat(api: ReturnType<typeof vytvorApi>, text: string) {
  return await (await api.fetch(zadost('/vzkaz/text', { text }))).json() as VysledekPodani;
}

function ulozit(podani: VysledekPodani, navic: Record<string, unknown> = {}) {
  return {
    navrh: { vstup: podani.vstup, surovyText: podani.surovyText, uprava: podani.uprava },
    podpis: podani.podpis,
    nazev: podani.uprava.nazev,
    oblast: podani.uprava.oblast,
    styl: 'spisovne',
    ...navic,
  };
}

async function potvrdit(api: ReturnType<typeof vytvorApi>, podani: VysledekPodani, navic: Record<string, unknown> = {}) {
  const odpoved = await api.fetch(zadost('/dotaz', { text: podani.uprava.text, typ: podani.uprava.typ, ulozit: ulozit(podani, navic) }, { accept: TYP_PRUBEHU }));
  const udalosti = (await odpoved.text()).trim().split('\n').filter(Boolean).map((radek) => JSON.parse(radek) as UdalostDotazu);
  const konec = udalosti.at(-1);
  return { status: odpoved.status, udalosti, vysledek: konec?.udalost === 'vysledek' ? konec.vysledek : null as VysledekDotazu | null };
}

describe('uložení potvrzeného vzkazu do feedu (13. 11. 2026)', () => {
  it('návrh AI úpravy nese podpis serveru', async () => {
    const { api } = sestavit({ vystupyUpravy: [uprava(DOTAZ)] });
    const podani = await napsat(api, 'kdy je otevrena lekarna ve ctvrtek');
    expect(podani.podpis).toMatch(/^[0-9a-f]{64}$/);
  });

  it('návrh se uloží hned, u zodpovězeného dotazu i s odpovědí, a do logu nejde text', async () => {
    const { api, uloziste, log } = sestavit({ vystupyUpravy: [uprava(DOTAZ)], vystupyGenerovani: [VETY, OVERENO] });
    const podani = await napsat(api, 'kdy je otevrena lekarna ve ctvrtek');
    const { status, vysledek } = await potvrdit(api, podani);
    expect(status).toBe(200);
    expect(vysledek?.vysledek).toBe('odpoved');
    expect(vysledek?.vzkaz).toMatchObject({ ukazka: false, nazev: 'Otevírací doba lékárny', typ: 'dotaz', stav: 'zodpovezeno', text: DOTAZ });
    expect(vysledek?.vzkaz?.odpoved?.zdroje[0].url).toBe('https://prisovice.cz/sluzby/zdravotni-stredisko/');
    expect(uloziste.vzkazy).toHaveLength(1);
    expect(uloziste.vzkazy[0]).toMatchObject({ surovyText: 'kdy je otevrena lekarna ve ctvrtek', navrhText: DOTAZ, vstup: 'text', stav: 'zodpovezeno' });
    const feed = await uloziste.feed(10);
    expect(feed[0]).toMatchObject({ id: vysledek?.vzkaz?.id, stav: 'zodpovezeno' });
    expect(JSON.stringify(log.mock.calls)).not.toContain('lekarna');
    expect(JSON.stringify(log.mock.calls)).not.toContain('Lékárna');
  });

  it('návrh, stížnost a pochvala se uloží jako čekající, bez hledání', async () => {
    const { api, uloziste, generovani } = sestavit({ vystupyUpravy: [uprava('Navrhuji lavičky u hřiště.', 'navrh')] });
    const podani = await napsat(api, 'navrhuji lavicky u hriste');
    const { vysledek } = await potvrdit(api, podani);
    expect(vysledek).toMatchObject({ vysledek: 'nehleda', typ: 'navrh', vzkaz: { typ: 'navrh', stav: 'ceka' } });
    expect(uloziste.vzkazy).toHaveLength(1);
    expect(generovani).toHaveLength(0);
  });

  it('opakované potvrzení téhož návrhu přepíše stejný vzkaz', async () => {
    const { api, uloziste } = sestavit({ vystupyUpravy: [uprava('Navrhuji lavičky u hřiště.', 'navrh')] });
    const podani = await napsat(api, 'navrhuji lavicky u hriste');
    const prvni = await potvrdit(api, podani);
    const druhy = await api.fetch(zadost('/dotaz', { text: 'Navrhuji dvě lavičky u hřiště.', typ: 'navrh', ulozit: ulozit(podani) }));
    const data = await druhy.json() as VysledekDotazu;
    expect(data.vzkaz?.id).toBe(prvni.vysledek?.vzkaz?.id);
    expect(uloziste.vzkazy).toHaveLength(1);
    expect(uloziste.vzkazy[0].text).toBe('Navrhuji dvě lavičky u hřiště.');
  });

  it('bez platného podpisu návrhu se nic neuloží', async () => {
    const { api, uloziste } = sestavit({ vystupyUpravy: [uprava('Navrhuji lavičky u hřiště.', 'navrh')] });
    const podani = await napsat(api, 'navrhuji lavicky u hriste');
    const podvrh = { ...ulozit(podani), navrh: { ...ulozit(podani).navrh, surovyText: 'něco jiného' } };
    const odpoved = await api.fetch(zadost('/dotaz', { text: 'Navrhuji lavičky u hřiště.', typ: 'navrh', ulozit: podvrh }));
    expect(odpoved.status).toBe(403);
    expect(uloziste.vzkazy).toHaveLength(0);
  });

  it('dotaz bez údajů k uložení se jen hledá', async () => {
    const { api, uloziste } = sestavit({ vystupyGenerovani: [VETY, OVERENO] });
    const odpoved = await api.fetch(zadost('/dotaz', { text: DOTAZ, typ: 'dotaz' }));
    const data = await odpoved.json() as VysledekDotazu;
    expect(data.vysledek).toBe('odpoved');
    expect(data.vzkaz).toBeUndefined();
    expect(uloziste.vzkazy).toHaveLength(0);
  });

  it('text postavy se uloží jen s podpisem serveru k tomuto znění', async () => {
    const VZKAZ = 'Navrhuji lavičky u hřiště.';
    const { api, uloziste } = sestavit({ vystupyUpravy: [uprava(VZKAZ, 'navrh')], vystupyGenerovani: ['(povzdech) Lavičky u hřiště. Marné.'] });
    const podani = await napsat(api, 'navrhuji lavicky u hriste');
    const styl = await (await api.fetch(zadost('/vzkaz/styl', { mluvci: 'marvin', text: VZKAZ }))).json() as { text: string; podpis: string };
    await potvrdit(api, podani, { styl: 'marvin', textStylu: 'Podvržený text.', podpisStylu: styl.podpis });
    expect(uloziste.vzkazy[0]).toMatchObject({ styl: 'marvin', textStylu: null });
    await potvrdit(api, podani, { styl: 'marvin', textStylu: styl.text, podpisStylu: styl.podpis });
    expect(uloziste.vzkazy[0]).toMatchObject({ styl: 'marvin', textStylu: '(povzdech) Lavičky u hřiště. Marné.' });
    expect((await uloziste.feed(1))[0]).toMatchObject({ styl: 'marvin', textStylu: '(povzdech) Lavičky u hřiště. Marné.' });
  });

  it('opakovaný dotaz dostane odkaz na dříve zodpovězený', async () => {
    const { api } = sestavit({
      vystupyUpravy: [uprava(DOTAZ), uprava('Jak dlouho má lékárna otevřeno ve čtvrtek?')],
      vystupyGenerovani: [VETY, OVERENO, VETY, OVERENO],
    });
    const prvni = await potvrdit(api, await napsat(api, 'kdy je otevrena lekarna ve ctvrtek'));
    const druhy = await potvrdit(api, await napsat(api, 'jak dlouho ma lekarna ve ctvrtek'));
    const podobne = druhy.udalosti.find((u) => u.udalost === 'podobne');
    expect(podobne).toEqual({ udalost: 'podobne', tema: { id: prvni.vysledek?.vzkaz?.id, nazev: 'Otevírací doba lékárny' } });
    expect(druhy.vysledek?.vzkaz?.podobny).toEqual({ id: prvni.vysledek?.vzkaz?.id, nazev: 'Otevírací doba lékárny' });
  });

  it('skrytý vzkaz z feedu zmizí', async () => {
    const { api, uloziste } = sestavit({ vystupyUpravy: [uprava('Navrhuji lavičky u hřiště.', 'navrh')] });
    const { vysledek } = await potvrdit(api, await napsat(api, 'navrhuji lavicky u hriste'));
    expect(await uloziste.skryt(vysledek!.vzkaz!.id, true)).toBe(true);
    expect(await uloziste.feed(10)).toEqual([]);
  });
});

describe('feed a podobnost', () => {
  it('ukázky jsou ve feedu za uloženými vzkazy se štítkem Ukázka', () => {
    const feed = sestavitFeed([{ id: 'v-1', ukazka: false, nazev: 'N', text: 'T', typ: 'navrh', oblast: 'ostatni', stav: 'ceka', styl: 'spisovne' }]);
    expect(feed[0].id).toBe('v-1');
    expect(feed.slice(1).every((p) => p.ukazka)).toBe(true);
    expect(feed).toHaveLength(1 + UKAZKOVA_TEMATA.length);
    const zodpovezena = UKAZKOVA_TEMATA.find((t) => t.odpoved)!;
    expect(polozkaUkazky(zodpovezena)).toMatchObject({ id: zodpovezena.id, stav: 'zodpovezeno', ukazka: true });
  });

  it('data feedu ve stránce nemohou ukončit značku script', () => {
    const json = feedDoStranky([{ id: 'v-1', ukazka: false, nazev: '</script><script>alert(1)</script>', text: 'T', typ: 'navrh', oblast: 'ostatni', stav: 'ceka', styl: 'spisovne' }]);
    expect(json).not.toContain('</script>');
    expect(JSON.parse(json)[0].nazev).toBe('</script><script>alert(1)</script>');
  });

  it('kosinová podobnost a práh', () => {
    expect(kosinus([1, 0], [1, 0])).toBeCloseTo(1);
    expect(kosinus([1, 0], [0, 1])).toBeCloseTo(0);
    const kandidati = [{ id: 'a', nazev: 'A', vektor: new Float32Array([1, 0]) }, { id: 'b', nazev: 'B', vektor: new Float32Array([0.6, 0.8]) }];
    expect(nejpodobnejsi([1, 0.1], kandidati)?.id).toBe('a');
    expect(nejpodobnejsi([0, 1], kandidati, 0.9)).toBeNull();
  });

  it('vektor projde uložením do bajtů beze změny', () => {
    const vektor = [0.25, -1.5, 3];
    expect(Array.from(zBajtu(naBajty(vektor))!)).toEqual(vektor);
    expect(Array.from(zBajtu(Array.from(naBajty(vektor)))!)).toEqual(vektor);
  });
});
