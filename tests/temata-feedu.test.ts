// Témata ve feedu (13. 11. 2026, F-33 až F-37, F-81). Každá větev toku bez sítě: totéž, poddotaz, jiné téma,
// žádné podobné téma, rozpor zdrojů, opakovaná věta, skrytí vzkazu i tématu a opravy témat týmem.
import { describe, expect, it, vi } from 'vitest';
import { vytvorFalesneAi } from '../src/lib/ai/falesna';
import { TYP_PRUBEHU, vytvorApi } from '../src/lib/api/aplikace';
import { podepsat } from '../src/lib/bezpecnost/podpis';
import type { TypPodnetu } from '../src/lib/oblasti';
import { vytvorFalesnyIndex } from '../src/lib/odpovedi/falesny';
import type { NalezenyUsek, ZdrojovyDokument } from '../src/lib/odpovedi/typy';
import { hlavickaUseku } from '../src/lib/odpovedi/zdroje';
import type { UdalostDotazu, VysledekDotazu } from '../src/lib/odpovedi/zpracovani';
import type { UkazkoveTema } from '../src/lib/temata/temata';
import { precistNoveOtazky, precistPosouzeni } from '../src/lib/vzkazy/prompt-temat';
import { poradiData, slozitOdpoved } from '../src/lib/vzkazy/skladani';
import { presunoutVzkaz, prevestVzkazy, sestavitFeed, skrytTema, skrytVzkaz, sloucitTemata } from '../src/lib/vzkazy/temata';
import type { CastOdpovedi, TemaFeedu, VolbaTematu } from '../src/lib/vzkazy/typy';
import { vytvorPametoveUloziste } from '../src/lib/vzkazy/uloziste';

const PUVOD = 'https://nezavisli-prisovice.cz';
const KLIC = 'testovaci-klic';

const STREDISKO: ZdrojovyDokument = {
  id: 'stredisko', url: 'https://prisovice.cz/sluzby/zdravotni-stredisko/', nazev: 'Zdravotní středisko', web: 'prisovice.cz', typ: 'stranka',
  zverejneno: null, zmeneno: '2026-02-17', mesicNahrani: null, otisk: 'a', stazeno: '2026-11-10T08:00:00.000Z', nadrazenyUrl: null,
};
const AKTUALITA: ZdrojovyDokument = {
  ...STREDISKO, id: 'aktualita', url: 'https://prisovice.cz/aktuality/lekarna-nove-hodiny/', nazev: 'Lékárna má nové hodiny', typ: 'aktualita',
  zverejneno: '2026-10-01', zmeneno: null,
};
const usek = (id: string, dokument: ZdrojovyDokument, text: string): NalezenyUsek => ({
  id, dokumentId: dokument.id, poradi: 0, strana: null, hlavicka: hlavickaUseku(dokument, null), text, dokument,
});
const U_STREDISKO = usek('u1', STREDISKO, 'Lékárna čt: 07.30 – 12.00 12.30 – 16.00 so: 08.00 – 11.00 Lékárna je v přízemí střediska.');
const U_AKTUALITA = usek('u2', AKTUALITA, 'Lékárna má od listopadu ve čtvrtek otevřeno od 08.00 do 15.00.');

const veta = (text: string, citace: string) => ({ veta: text, usek: 1, citace });
const vety = (...v: ReturnType<typeof veta>[]) => JSON.stringify({ vety: v });
const overeno = (pocet = 1) => JSON.stringify({ vysledky: Array.from({ length: pocet }, (_, i) => ({ cislo: i + 1, plyne: true })) });
const CTVRTEK = veta('Lékárna má ve čtvrtek otevřeno od 07.30 do 12.00 a od 12.30 do 16.00.', 'čt: 07.30 – 12.00 12.30 – 16.00');
const SOBOTA = veta('Lékárna má v sobotu otevřeno od 08.00 do 11.00.', 'so: 08.00 – 11.00');
const PRIZEMI = veta('Lékárna je v přízemí střediska.', 'Lékárna je v přízemí střediska.');
const NOVE_HODINY = veta('Lékárna má od listopadu ve čtvrtek otevřeno od 08.00 do 15.00.', 'Lékárna má od listopadu ve čtvrtek otevřeno od 08.00 do 15.00.');
const noveOtazky = (...otazky: string[]) => JSON.stringify({ otazky });
const posouzeni = (...vztahy: string[]) => JSON.stringify({ dvojice: vztahy.map((vztah, i) => ({ cislo: i + 1, vztah })) });

// Embedding podle témat: lékárna, hřiště a Sokolovna jsou různé směry, zbytek čtvrtý.
const VEKTORY: [RegExp, number[]][] = [[/lékárn/i, [1, 0, 0, 0]], [/lavič|hřišt/i, [0, 1, 0, 0]], [/sokolovn/i, [0, 0, 1, 0]]];
const vektor = (text: string) => VEKTORY.find(([vzor]) => vzor.test(text))?.[1] ?? [0, 0, 0, 1];

const UKAZKA_LEKARNA: UkazkoveTema = {
  id: 'ukazka-01', nazev: 'Otevírací doba lékárny na zdravotním středisku', text: 'Do kolika má ve čtvrtek otevřeno lékárna na zdravotním středisku?',
  typ: 'dotaz', oblast: 'ostatni', stav: 'zodpovezeno-z-webu',
  odpoved: {
    vety: [{ text: CTVRTEK.veta, zdroj: 1 }],
    zdroje: [{
      cislo: 1, url: STREDISKO.url, nazev: STREDISKO.nazev, datum: 'aktualizováno 17. 2. 2026', web: 'prisovice.cz', oznaceni: 'Odpověď z webu obce',
      uryvek: CTVRTEK.citace, misto: '',
    }],
    oznaceni: ['Odpověď z webu obce'],
  },
};

async function podani(text: string, nazev: string, typ: TypPodnetu = 'dotaz') {
  const uprava = { text, nazev, oblast: 'ostatni' as const, typ };
  const navrh = { vstup: 'text' as const, surovyText: text.toLowerCase(), uprava };
  const podpis = await podepsat('navrh1', JSON.stringify({ vstup: navrh.vstup, surovyText: navrh.surovyText, uprava: { text, nazev, typ, oblast: 'ostatni' } }), KLIC);
  return { navrh, podpis, text, nazev, typ };
}
type Podani = Awaited<ReturnType<typeof podani>>;

function sestavit(moznosti: Parameters<typeof vytvorFalesneAi>[0] & { useky?: NalezenyUsek[]; ukazky?: UkazkoveTema[] } = {}) {
  const { useky = [U_STREDISKO], ukazky = [], ...nastaveniAi } = moznosti;
  const falesna = vytvorFalesneAi({ vektor, ...nastaveniAi });
  const uloziste = vytvorPametoveUloziste();
  const log = vi.fn();
  const limiter = { limit: vi.fn(async () => ({ success: true })) };
  const api = vytvorApi({ ai: falesna.ai, index: vytvorFalesnyIndex(useky, () => 0.8), uloziste, limiter, log, klicPodpisu: KLIC, ukazky });
  return { api, uloziste, log, useky, z: { uloziste, ai: falesna.ai, ukazky }, ...falesna };
}

const pozadavek = (cesta: string, telo: unknown, accept = TYP_PRUBEHU) => new Request(`${PUVOD}/ucho/api${cesta}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: PUVOD, 'cf-connecting-ip': '192.0.2.1', accept },
  body: JSON.stringify(telo),
});

async function poslat(api: ReturnType<typeof vytvorApi>, p: Podani, tema?: VolbaTematu) {
  const telo = { text: p.text, typ: p.typ, ulozit: { navrh: p.navrh, podpis: p.podpis, nazev: p.nazev, oblast: 'ostatni', styl: 'spisovne' }, ...(tema ? { tema } : {}) };
  const odpoved = await api.fetch(pozadavek('/dotaz', telo));
  const udalosti = (await odpoved.text()).trim().split('\n').filter(Boolean).map((radek) => JSON.parse(radek) as UdalostDotazu);
  const konec = udalosti.at(-1);
  const vysledek = konec?.udalost === 'vysledek' ? konec.vysledek : null;
  return { status: odpoved.status, udalosti, vysledek, tema: vysledek && 'tema' in vysledek ? vysledek.tema : undefined };
}

const nabidnuta = (v: VysledekDotazu | null) => v?.podobna ?? [];
const odpovedZ = (v: VysledekDotazu | null) => (v?.vysledek === 'odpoved' ? v.odpoved : undefined);
const feed = async (uloziste: ReturnType<typeof vytvorPametoveUloziste>, ukazky: UkazkoveTema[] = []) => sestavitFeed(await uloziste.temataFeedu(50), ukazky);
const textyVet = (t?: TemaFeedu) => t?.odpoved?.vety.map((v) => v.text) ?? [];

describe('zařazení vzkazu k tématu (F-33 až F-37)', () => {
  it('bez podobného tématu založí nové téma bez ptaní a nalezená odpověď je odpovědí tématu', async () => {
    const { api, uloziste, log } = sestavit({ vystupyGenerovani: [vety(CTVRTEK), overeno()] });
    const { vysledek, tema } = await poslat(api, await podani('Do kolika má ve čtvrtek otevřeno lékárna?', 'Otevírací doba lékárny'));
    expect(vysledek?.vysledek).toBe('odpoved');
    expect(tema).toMatchObject({ pocet: 1, stav: 'zodpovezeno', ukazka: false, nazev: 'Otevírací doba lékárny', vzkazy: [] });
    expect(uloziste.vzkazy[0]).toMatchObject({ vztah: 'zakladatel', temaId: tema?.id, stav: 'zodpovezeno' });
    expect(uloziste.casti).toMatchObject([{ vzkazId: null, stav: 'platna', puvod: 'web' }]);
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/ékárn/);
  });

  it('bez mezikroku: vzkaz rovnou dostane odpověď ve vlastním tématu a podobné téma je jen odkaz (Tomáš 13. 11. 2026)', async () => {
    const { api, uloziste } = sestavit({ vystupyGenerovani: [vety(CTVRTEK), overeno(), vety(CTVRTEK), overeno()] });
    const prvni = await poslat(api, await podani('Do kolika má ve čtvrtek otevřeno lékárna?', 'Otevírací doba lékárny'));
    expect(nabidnuta(prvni.vysledek)).toEqual([]);
    const druhy = await poslat(api, await podani('Jak dlouho má lékárna ve čtvrtek otevřeno?', 'Lékárna ve čtvrtek'));
    expect(druhy.vysledek?.vysledek).toBe('odpoved');
    expect(nabidnuta(druhy.vysledek)).toEqual([{ id: prvni.tema?.id, nazev: 'Otevírací doba lékárny' }]);
    expect(druhy.tema?.id).not.toBe(prvni.tema?.id);
    expect(uloziste.vzkazy.map((v) => v.vztah)).toEqual(['zakladatel', 'zakladatel']);
  });

  it('podobná témata jsou nejvýš dvě a stejného typu', async () => {
    const { api, uloziste } = sestavit();
    for (const [i, typ] of (['dotaz', 'dotaz', 'dotaz', 'dotaz', 'navrh'] as const).entries()) {
      await poslat(api, await podani(`Lékárna ${i}?`, `Lékárna ${i}`, typ), { nove: true });
    }
    expect(uloziste.temata).toHaveLength(5);
    const { vysledek } = await poslat(api, await podani('Lékárna znovu?', 'Lékárna'));
    expect(nabidnuta(vysledek)).toHaveLength(2);
    expect(nabidnuta(vysledek).every((t) => uloziste.temata.find((u) => u.id === t.id)?.typ === 'dotaz')).toBe(true);
  });

  it('totéž ukáže existující odpověď tématu bez nového hledání (F-37)', async () => {
    const { api, uloziste, generovani } = sestavit({ vystupyGenerovani: [vety(CTVRTEK), overeno()] });
    const prvni = await poslat(api, await podani('Do kolika má ve čtvrtek otevřeno lékárna?', 'Otevírací doba lékárny'));
    const volani = generovani.length;
    const { vysledek, tema } = await poslat(api, await podani('Jak dlouho má lékárna ve čtvrtek otevřeno?', 'Lékárna ve čtvrtek'), { tema: prvni.tema!.id, vztah: 'totez' });
    expect(vysledek).toMatchObject({ vysledek: 'odpoved', zTematu: true });
    expect(odpovedZ(vysledek)?.vety.map((v) => v.text)).toEqual([CTVRTEK.veta]);
    expect(odpovedZ(vysledek)?.upozorneni).toMatch(/Nejde o úřední vyjádření obce/);
    expect(generovani).toHaveLength(volani);
    expect(tema).toMatchObject({ id: prvni.tema!.id, pocet: 2, vzkazy: [{ vztah: 'totez' }] });
    expect(uloziste.casti).toHaveLength(1);
    expect(await feed(uloziste)).toHaveLength(1);
  });

  it('poddotaz hledá jen nové otázky a doplní odpověď tématu, zdroj se neopakuje', async () => {
    const { api, uloziste, noveOtazky: volaniNovych } = sestavit({
      vystupyGenerovani: [vety(CTVRTEK), overeno(), vety(SOBOTA), overeno()],
      vystupyNovychOtazek: [noveOtazky('Má lékárna na zdravotním středisku otevřeno v sobotu?')],
    });
    const prvni = await poslat(api, await podani('Do kolika má ve čtvrtek otevřeno lékárna?', 'Otevírací doba lékárny'));
    const druhy = await poslat(api, await podani('A má lékárna otevřeno i v sobotu?', 'Lékárna v sobotu'), { tema: prvni.tema!.id, vztah: 'poddotaz' });
    expect(volaniNovych).toHaveLength(1);
    expect(druhy.udalosti[0]).toEqual({ udalost: 'casti', casti: ['Má lékárna na zdravotním středisku otevřeno v sobotu?'], poddotaz: true });
    const odpoved = odpovedZ(druhy.vysledek);
    expect(odpoved?.casti).toEqual([
      { otazka: '', vety: [{ text: CTVRTEK.veta, zdroj: 1 }] },
      { otazka: 'Má lékárna na zdravotním středisku otevřeno v sobotu?', vety: [{ text: SOBOTA.veta, zdroj: 1 }], nova: true },
    ]);
    // Obě věty jsou ze stejné stránky: jeden zdroj s oběma citacemi.
    expect(odpoved?.zdroje).toHaveLength(1);
    expect(odpoved?.zdroje[0].uryvek).toContain('so: 08.00 – 11.00');
    expect(druhy.tema).toMatchObject({ pocet: 2, stav: 'zodpovezeno', cekajici: [], vzkazy: [{ vztah: 'poddotaz' }] });
    expect(uloziste.casti.filter((c) => c.stav === 'platna')).toHaveLength(2);
  });

  it('poddotaz, na který zdroje nemají odpověď, čeká a autor vidí odpověď tématu', async () => {
    const { api } = sestavit({
      vystupyGenerovani: [vety(CTVRTEK), overeno(), JSON.stringify({ vety: [] })],
      vystupyNovychOtazek: [noveOtazky('Má lékárna rozvoz léků?')],
    });
    const prvni = await poslat(api, await podani('Do kolika má ve čtvrtek otevřeno lékárna?', 'Otevírací doba lékárny'));
    const druhy = await poslat(api, await podani('Vozí lékárna léky domů?', 'Rozvoz z lékárny'), { tema: prvni.tema!.id, vztah: 'poddotaz' });
    expect(druhy.vysledek).toMatchObject({ vysledek: 'odpoved', zTematu: true });
    expect(odpovedZ(druhy.vysledek)?.nezodpovezeno).toEqual(['Má lékárna rozvoz léků?']);
    expect(druhy.tema).toMatchObject({ stav: 'zodpovezeno', cekajici: ['Vozí lékárna léky domů?'] });
  });

  it('poddotaz bez nových otázek ukáže odpověď tématu bez hledání', async () => {
    const { api, generovani } = sestavit({ vystupyGenerovani: [vety(CTVRTEK), overeno()], vystupyNovychOtazek: [noveOtazky()] });
    const prvni = await poslat(api, await podani('Do kolika má ve čtvrtek otevřeno lékárna?', 'Otevírací doba lékárny'));
    const volani = generovani.length;
    const druhy = await poslat(api, await podani('Kdy zavírá lékárna ve čtvrtek?', 'Lékárna ve čtvrtek'), { tema: prvni.tema!.id, vztah: 'poddotaz' });
    expect(druhy.vysledek).toMatchObject({ vysledek: 'odpoved', zTematu: true, nicNoveho: true });
    expect(generovani).toHaveLength(volani);
  });

  it('opakovaná věta se nepřidá, doslova ani jinými slovy', async () => {
    const JINYMI_SLOVY = veta('Lékárna se nachází v přízemí střediska.', 'Lékárna je v přízemí střediska.');
    const { api, uloziste, posouzeni: volaniPosouzeni } = sestavit({
      vystupyGenerovani: [vety(CTVRTEK, PRIZEMI), overeno(2), vety(JINYMI_SLOVY, CTVRTEK), overeno(2)],
      vystupyNovychOtazek: [noveOtazky('Kde ve středisku je lékárna?')],
      // Dvojice: jinými slovy × čtvrtek, jinými slovy × přízemí. Doslova stejnou větu zahodí kód bez modelu.
      vystupyPosouzeni: [posouzeni('jine', 'stejne')],
    });
    const prvni = await poslat(api, await podani('Do kolika má ve čtvrtek otevřeno lékárna?', 'Otevírací doba lékárny'));
    const druhy = await poslat(api, await podani('Kde je ta lékárna?', 'Kde je lékárna'), { tema: prvni.tema!.id, vztah: 'poddotaz' });
    expect(volaniPosouzeni).toHaveLength(1);
    expect(textyVet(druhy.tema)).toEqual([CTVRTEK.veta, PRIZEMI.veta]);
    expect(uloziste.casti.filter((c) => c.stav === 'platna')).toHaveLength(1);
  });

  it('rozpor: novější zdroj vyhraje a starší část jde ke kontrole, nic se nesmaže', async () => {
    const { api, uloziste, useky } = sestavit({
      vystupyGenerovani: [vety(CTVRTEK, PRIZEMI), overeno(2), vety(NOVE_HODINY), overeno()],
      vystupyNovychOtazek: [noveOtazky('Platí pro lékárnu ve čtvrtek pořád stejná otevírací doba?')],
      vystupyPosouzeni: [posouzeni('rozpor', 'jine')],
    });
    const prvni = await poslat(api, await podani('Do kolika má ve čtvrtek otevřeno lékárna?', 'Otevírací doba lékárny'));
    useky.splice(0, useky.length, U_AKTUALITA);
    const druhy = await poslat(api, await podani('Neměnily se teď hodiny lékárny?', 'Nové hodiny lékárny'), { tema: prvni.tema!.id, vztah: 'poddotaz' });
    expect(textyVet(druhy.tema)).toEqual([PRIZEMI.veta, NOVE_HODINY.veta]);
    const stara = uloziste.casti.find((c) => c.stav === 'ke-kontrole');
    expect(stara).toMatchObject({ vzkazId: null, duvod: 'novejsi-zdroj' });
    expect(stara?.obsah.casti[0].vety.map((v) => v.text)).toEqual([CTVRTEK.veta, PRIZEMI.veta]);
    expect(uloziste.casti.find((c) => c.id === stara?.nahrazenaId)).toMatchObject({ stav: 'platna', vzkazId: null });
    expect(druhy.tema?.stav).toBe('zodpovezeno');
  });

  it('rozpor se starším zdrojem novou větu zahodí a odpověď tématu zůstane', async () => {
    const { api, uloziste, useky } = sestavit({
      useky: [U_AKTUALITA],
      vystupyGenerovani: [vety(NOVE_HODINY), overeno(), vety(CTVRTEK), overeno()],
      vystupyNovychOtazek: [noveOtazky('Jak dlouho má lékárna otevřeno ve čtvrtek odpoledne?')],
      vystupyPosouzeni: [posouzeni('rozpor')],
    });
    const prvni = await poslat(api, await podani('Jaké má lékárna nové hodiny ve čtvrtek?', 'Nové hodiny lékárny'));
    useky.splice(0, useky.length, U_STREDISKO);
    const druhy = await poslat(api, await podani('Do kolika je lékárna ve čtvrtek odpoledne?', 'Lékárna odpoledne'), { tema: prvni.tema!.id, vztah: 'poddotaz' });
    expect(textyVet(druhy.tema)).toEqual([NOVE_HODINY.veta]);
    expect(uloziste.casti.every((c) => c.stav === 'platna')).toBe(true);
    expect(uloziste.casti).toHaveLength(1);
  });

  it('jiné téma založí nové téma i vedle podobného', async () => {
    const { api, uloziste } = sestavit({ vystupyGenerovani: [vety(CTVRTEK), overeno(), vety(PRIZEMI), overeno()] });
    await poslat(api, await podani('Do kolika má ve čtvrtek otevřeno lékárna?', 'Otevírací doba lékárny'));
    const druhy = await poslat(api, await podani('Je lékárna bezbariérová?', 'Bezbariérová lékárna'), { nove: true });
    expect(druhy.tema).toMatchObject({ pocet: 1, vzkazy: [] });
    expect(uloziste.vzkazy.map((v) => v.vztah)).toEqual(['zakladatel', 'zakladatel']);
    expect(await feed(uloziste)).toHaveLength(2);
  });

  it('ukázka je téma: totéž ji založí v databázi, ukáže její odpověď a počítá připojené vzkazy', async () => {
    const { api, uloziste, generovani } = sestavit({ ukazky: [UKAZKA_LEKARNA] });
    const p = await podani('Jak dlouho má lékárna ve čtvrtek otevřeno?', 'Lékárna ve čtvrtek');
    const prvni = await poslat(api, p);
    expect(nabidnuta(prvni.vysledek)).toEqual([{ id: 'ukazka-01', nazev: UKAZKA_LEKARNA.nazev }]);
    const volani = generovani.length;
    // Volba tématu jde dál přes API (doptání, Hledat znovu). Vlastní téma bez dalších vzkazů pak zmizí.
    const druhy = await poslat(api, p, { tema: 'ukazka-01', vztah: 'totez' });
    expect(druhy.vysledek).toMatchObject({ vysledek: 'odpoved', zTematu: true });
    expect(druhy.tema).toMatchObject({ id: 'ukazka-01', ukazka: true, pocet: 1 });
    expect(generovani).toHaveLength(volani);
    expect(uloziste.temata.find((t) => t.id === prvni.tema?.id)?.skryto).toBe(true);
    const temata = await feed(uloziste, [UKAZKA_LEKARNA]);
    expect(temata.filter((t) => t.id === 'ukazka-01')).toHaveLength(1);
    expect(uloziste.casti.filter((c) => c.stav === 'platna')).toMatchObject([{ puvod: 'ukazka', vzkazId: null }]);
  });

  it('návrh se sdružuje bez hledání: doplnění, poddotaz u návrhu nejde', async () => {
    const { api, generovani } = sestavit();
    const prvni = await poslat(api, await podani('Navrhuji lavičky u hřiště.', 'Lavičky u hřiště', 'navrh'));
    expect(prvni.vysledek).toMatchObject({ vysledek: 'nehleda', typ: 'navrh' });
    const p = await podani('K hřišti lavičky a k tomu stříšku.', 'Lavičky a stříška', 'navrh');
    // Poddotaz u návrhu je neplatná volba: vzkaz dostane vlastní téma a podobné téma jen jako odkaz.
    const neplatna = await poslat(api, p, { tema: prvni.tema!.id, vztah: 'poddotaz' });
    expect(neplatna.tema?.id).not.toBe(prvni.tema!.id);
    expect(nabidnuta(neplatna.vysledek).map((t) => t.id)).toEqual([prvni.tema!.id]);
    const druhy = await poslat(api, p, { tema: prvni.tema!.id, vztah: 'doplneni' });
    expect(druhy.vysledek).toMatchObject({ vysledek: 'nehleda' });
    expect(druhy.tema).toMatchObject({ pocet: 2, stav: 'ceka', vzkazy: [{ vztah: 'doplneni' }] });
    expect(generovani).toHaveLength(0);
  });

  it('autor se vrátí k úpravám: vlastní téma se nenabídne a zůstane na stejném místě', async () => {
    const { api, uloziste } = sestavit({ vystupyGenerovani: [vety(CTVRTEK), overeno(), vety(CTVRTEK), overeno()] });
    const p = await podani('Do kolika má ve čtvrtek otevřeno lékárna?', 'Otevírací doba lékárny');
    const prvni = await poslat(api, p);
    const druhy = await poslat(api, { ...p, text: 'Do kolika má ve čtvrtek odpoledne otevřeno lékárna?' });
    expect(druhy.tema?.id).toBe(prvni.tema?.id);
    expect(druhy.tema?.text).toBe('Do kolika má ve čtvrtek odpoledne otevřeno lékárna?');
    expect(uloziste.vzkazy).toHaveLength(1);
    expect(uloziste.temata).toHaveLength(1);
    expect(uloziste.casti.map((c) => [c.stav, c.duvod])).toEqual([['stazena', 'autor-upravil'], ['platna', null]]);
  });
});

describe('tým: skrytí, přesun, sloučení a převod', () => {
  it('skrytý poddotaz skryje i svou část odpovědi, skrytý zakladatel celé téma', async () => {
    const { api, uloziste, z } = sestavit({
      vystupyGenerovani: [vety(CTVRTEK), overeno(), vety(SOBOTA), overeno()],
      vystupyNovychOtazek: [noveOtazky('Má lékárna otevřeno v sobotu?')],
    });
    const prvni = await poslat(api, await podani('Do kolika má ve čtvrtek otevřeno lékárna?', 'Otevírací doba lékárny'));
    const druhy = await poslat(api, await podani('A v sobotu má lékárna otevřeno?', 'Lékárna v sobotu'), { tema: prvni.tema!.id, vztah: 'poddotaz' });
    const idPoddotazu = druhy.vysledek && 'vzkazId' in druhy.vysledek ? druhy.vysledek.vzkazId! : '';
    await skrytVzkaz(idPoddotazu, true, z);
    expect(textyVet((await feed(uloziste))[0])).toEqual([CTVRTEK.veta]);
    expect((await feed(uloziste))[0].pocet).toBe(1);
    const { tema } = await skrytVzkaz(`v-${uloziste.vzkazy[0].id}`, true, z);
    expect(tema?.id).toBe(prvni.tema?.id);
    expect(await feed(uloziste)).toEqual([]);
  });

  it('skryté téma se ve feedu ani v nabídce neukáže, ukázka taky ne', async () => {
    const { api, uloziste, z } = sestavit({ ukazky: [UKAZKA_LEKARNA] });
    await skrytTema('ukazka-01', true, z);
    expect(await feed(uloziste, [UKAZKA_LEKARNA])).toEqual([]);
    const { vysledek } = await poslat(api, await podani('Jak dlouho má lékárna ve čtvrtek otevřeno?', 'Lékárna ve čtvrtek'));
    expect(nabidnuta(vysledek)).toEqual([]);
  });

  it('přesun k ukázce jako poddotaz: odpověď jde s vzkazem bez opakování (jako Sokolovna)', async () => {
    const { api, uloziste, z } = sestavit({ ukazky: [UKAZKA_LEKARNA], vystupyGenerovani: [vety(CTVRTEK, PRIZEMI), overeno(2)] });
    const vlastni = await poslat(api, await podani('Do kolika má ve čtvrtek otevřeno lékárna a kde ji najdu?', 'Lékárna'), { nove: true });
    const id = vlastni.vysledek && 'vzkazId' in vlastni.vysledek ? vlastni.vysledek.vzkazId! : '';
    await presunoutVzkaz(id, 'ukazka-01', 'poddotaz', z);
    const [tema] = await feed(uloziste, [UKAZKA_LEKARNA]);
    expect(tema).toMatchObject({ id: 'ukazka-01', pocet: 1, vzkazy: [{ id, vztah: 'poddotaz' }] });
    expect(textyVet(tema)).toEqual([CTVRTEK.veta, PRIZEMI.veta]);
    expect(tema.odpoved?.zdroje).toHaveLength(1);
    expect(uloziste.temata.find((t) => t.id === vlastni.tema?.id)).toMatchObject({ stav: 'sloucene', hlavniId: 'ukazka-01' });
    expect((await feed(uloziste, [UKAZKA_LEKARNA])).map((t) => t.id)).toEqual(['ukazka-01']);
  });

  it('sloučení dvou témat převede vzkazy i odpověď bez opakování', async () => {
    const { api, uloziste, z } = sestavit({ vystupyGenerovani: [vety(CTVRTEK), overeno(), vety(PRIZEMI, CTVRTEK), overeno(2)] });
    const a = await poslat(api, await podani('Do kolika má ve čtvrtek otevřeno lékárna?', 'Otevírací doba lékárny'), { nove: true });
    const b = await poslat(api, await podani('Kde je lékárna a kdy má otevřeno?', 'Lékárna'), { nove: true });
    await sloucitTemata(b.tema!.id, a.tema!.id, z);
    const temata = await feed(uloziste);
    expect(temata).toHaveLength(1);
    expect(temata[0]).toMatchObject({ id: a.tema!.id, pocet: 2, vzkazy: [{ vztah: 'poddotaz' }] });
    expect(textyVet(temata[0])).toEqual([CTVRTEK.veta, PRIZEMI.veta]);
  });

  it('převod vzkazů z doby před tématy: nic se neztratí a odpověď je hlavní odpověď tématu', async () => {
    const { uloziste, z } = sestavit();
    const { id } = await uloziste.ulozitVzkaz({
      klicNavrhu: 'k', vstup: 'hlas', surovyText: 's', navrhText: 'n', text: 'Kolik stojí pronájem Sokolovny?', nazev: 'Pronájem Sokolovny', typ: 'dotaz',
      oblast: 'ostatni', styl: 'bart', textStylu: null, vektor: null, vektorNazvu: null,
    }, new Date('2026-11-13T10:32:25Z'));
    await uloziste.zapsatVysledek(id, 'zodpovezeno', {
      vety: [{ text: 'Pronájem sálu stojí 4.000 Kč.', zdroj: 1 }],
      zdroje: [{ cislo: 1, url: 'https://prisovice.cz/a.pdf#page=2', nazev: 'Zápis', datum: 'zveřejněno 24. 9. 2025', web: 'prisovice.cz', oznaceni: 'Odpověď z webu obce', uryvek: '4.000,--Kč', misto: 'strana 2' }],
      oznaceni: ['Odpověď z webu obce'],
    }, new Date());
    expect(await prevestVzkazy(z, false)).toMatchObject([{ id: `v-${id}`, podobna: [] }]);
    expect(uloziste.temata).toHaveLength(0);
    await prevestVzkazy(z, true);
    expect(uloziste.vzkazy[0]).toMatchObject({ vztah: 'zakladatel' });
    const [tema] = await feed(uloziste);
    expect(tema).toMatchObject({ stav: 'zodpovezeno', pocet: 1, styl: 'bart', zmeneno: '2026-11-13' });
    expect(textyVet(tema)).toEqual(['Pronájem sálu stojí 4.000 Kč.']);
    expect(await prevestVzkazy(z, true)).toEqual([]);
  });
});

describe('F-81: odpověď mi stačí, nebo se doptám', () => {
  it('zapíše potvrzení jen podle podpisu návrhu', async () => {
    const { api, uloziste } = sestavit({ vystupyGenerovani: [vety(CTVRTEK), overeno()] });
    const p = await podani('Do kolika má ve čtvrtek otevřeno lékárna?', 'Otevírací doba lékárny');
    await poslat(api, p);
    const ok = await api.fetch(pozadavek('/vzkaz/potvrzeni', { podpis: p.podpis, potvrzeni: 'staci' }, 'application/json'));
    expect(await ok.json()).toEqual({ ulozeno: true });
    expect(uloziste.vzkazy[0].potvrzeni).toBe('staci');
    const spatne = await api.fetch(pozadavek('/vzkaz/potvrzeni', { podpis: 'x', potvrzeni: 'staci' }, 'application/json'));
    expect(spatne.status).toBe(422);
    const cizi = await api.fetch(pozadavek('/vzkaz/potvrzeni', { podpis: 'a'.repeat(64), potvrzeni: 'doptani' }, 'application/json'));
    expect(await cizi.json()).toEqual({ ulozeno: false });
  });
});

describe('skládání odpovědi tématu', () => {
  const cast = (id: string, vzkazId: string | null, vytvoreno: string, vetyCasti: [string, string][]): CastOdpovedi => ({
    id, temaId: 't', vzkazId, vytvoreno, puvod: 'web', stav: 'platna', duvod: null, nahrazenaId: null, otazka: vzkazId ? `Otázka ${id}` : null,
    obsah: {
      casti: [{ otazka: null, vety: vetyCasti.map(([text, url]) => ({ text, url })) }],
      zdroje: [...new Set(vetyCasti.map(([, url]) => url))].map((url) => ({ url, nazev: url, datum: 'zveřejněno 1. 1. 2026', web: 'prisovice.cz' as const, oznaceni: 'Odpověď z webu obce', uryvek: url, misto: '' })),
    },
  });

  it('hlavní odpověď je první, zdroje se číslují přes celé téma a věta se neopakuje', () => {
    const o = slozitOdpoved([
      cast('b', 'v1', '2026-11-13T10:00:00Z', [['Druhá věta.', 'https://prisovice.cz/b'], ['První věta.', 'https://prisovice.cz/a']]),
      cast('a', null, '2026-11-13T11:00:00Z', [['První věta.', 'https://prisovice.cz/a']]),
    ], 'b');
    expect(o?.casti).toEqual([
      { otazka: '', vety: [{ text: 'První věta.', zdroj: 1 }] },
      { otazka: 'Otázka b', vety: [{ text: 'Druhá věta.', zdroj: 2 }], nova: true },
    ]);
    expect(o?.zdroje.map((z) => z.url)).toEqual(['https://prisovice.cz/a', 'https://prisovice.cz/b']);
  });

  it('datum zdroje pro rozpor', () => {
    expect(poradiData('zveřejněno 24. 9. 2025')).toBe('2025-09-24');
    expect(poradiData('nahráno 1/2024')).toBe('2024-01-00');
    expect(poradiData('stav webu k 10. 11. 2026')).toBe('2026-11-10');
    expect(poradiData('neznámé')).toBe('');
  });

  it('nové otázky nesmí přinést číslo, které ve vzkazu není, a posouzení čte jen platné vztahy', () => {
    expect(precistNoveOtazky('{"otazky": ["Kolik stojí sál na 15 lidí?"]}', 'Kolik stojí sál?')).toBeNull();
    expect(precistNoveOtazky('{"otazky": ["Kolik stojí sál na 15 lidí?"]}', 'Sál pro 15 lidí')).toEqual(['Kolik stojí sál na 15 lidí?']);
    expect(precistNoveOtazky('{"otazky": []}', 'Cokoli')).toEqual([]);
    expect(precistNoveOtazky('nic', 'Cokoli')).toBeNull();
    expect(precistPosouzeni('{"dvojice": [{"cislo": 2, "vztah": "rozpor"}, {"cislo": 1, "vztah": "nevim"}]}', 2)).toEqual([null, 'rozpor']);
  });
});
