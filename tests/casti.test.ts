import { describe, expect, it, vi } from 'vitest';
import type { ZpravaModelu } from '../src/lib/ai/prompt-upravy';
import type { SluzbaAi } from '../src/lib/ai/rozhrani';
import { vytvorFalesneAi } from '../src/lib/ai/falesna';
import { TYP_PRUBEHU, vytvorApi } from '../src/lib/api/aplikace';
import { odpovedetPoCastech, precistCasti, type PrubehOdpovedi } from '../src/lib/odpovedi/casti';
import { vytvorFalesnyIndex } from '../src/lib/odpovedi/falesny';
import { overitKodem, precistOvereni, ZamitnutaOdpoved } from '../src/lib/odpovedi/overeni';
import { POKYNY_ROZDELENI } from '../src/lib/odpovedi/prompt-odpovedi';
import type { NalezenyUsek, ZdrojovyDokument } from '../src/lib/odpovedi/typy';
import { hlavickaUseku } from '../src/lib/odpovedi/zdroje';
import type { UdalostDotazu, VysledekDotazu } from '../src/lib/odpovedi/zpracovani';

const ZAPIS: ZdrojovyDokument = {
  id: 'zapis',
  url: 'https://prisovice.cz/wp-content/uploads/2025/09/zapis-rady.pdf',
  nazev: 'Zápis č. 14/2025 ze schůze rady obce',
  web: 'prisovice.cz',
  typ: 'pdf',
  zverejneno: '2025-09-24',
  zmeneno: null,
  mesicNahrani: '2025-09',
  otisk: 'a',
  stazeno: '2026-11-10T08:00:00.000Z',
  nadrazenyUrl: null,
};
const SLUZBY: ZdrojovyDokument = { ...ZAPIS, id: 'sluzby', url: 'https://prisovice.cz/sluzby/', nazev: 'Služby', typ: 'stranka', zverejneno: null, zmeneno: '2024-01-26', mesicNahrani: null };

function usek(dokument: ZdrojovyDokument, id: string, text: string, strana: number | null = null): NalezenyUsek {
  return { id, dokumentId: dokument.id, poradi: 0, strana, hlavicka: hlavickaUseku(dokument, strana), text, dokument };
}

const USEK_SAL = usek(ZAPIS, 'zapis-0', 'Usnesení UR č. 179/2025 – Rada obce upravuje výši pronájmu samotného sálu sokolovny na 4.000,--Kč + energie a vratná kauce ve výši 4.000,--Kč.', 2);
const USEK_SPORT = usek(SLUZBY, 'sluzby-0', 'V obci se nachází Mateřská i Základní škola, zdravotní středisko, pošta, řada sportovišť a dětských hřišť.');

const SPORT = 'Jaké zázemí pro sport obec nabízí?';
const SAL = 'Kolik stojí pronájem sálu v Sokolovně?';
const TELOCVICNA = 'Kolik stojí pronájem tělocvičny?';
const DOTAZ = 'Jaké zázemí pro sport obec nabízí a kolik stojí pronájem sálu v Sokolovně nebo tělocvičny?';

const ODPOVED_SPORT = JSON.stringify({ vety: [{ veta: 'V obci je řada sportovišť a dětských hřišť.', usek: 1, citace: 'řada sportovišť a dětských hřišť' }] });
const ODPOVED_SAL = JSON.stringify({
  vety: [
    { veta: 'Pronájem sálu v Sokolovně stojí 4 000 Kč a energie se platí zvlášť.', usek: 1, citace: 'upravuje výši pronájmu samotného sálu sokolovny na 4.000,--Kč + energie' },
    { veta: 'Vratná kauce je 4 000 Kč.', usek: 1, citace: 'vratná kauce ve výši 4.000,--Kč' },
  ],
});
const NEVIM = JSON.stringify({ vety: [], nezodpovezeno: [] });
const overeno = (pocet: number) => JSON.stringify({ vysledky: Array.from({ length: pocet }, (_, i) => ({ cislo: i + 1, plyne: true })) });

// Falešná AI, která odpovídá podle části dotazu. Části běží souběžně, pořadí volání proto nejde určit předem.
function aiPodleCasti(casti: string[], odpovedi: Record<string, string>, moznosti: { chybaU?: string; rozdeleni?: string } = {}) {
  const { ai } = vytvorFalesneAi();
  const generovat = vi.fn(async (zpravy: ZpravaModelu[]) => {
    const [system, uzivatel] = zpravy;
    if (system.content === POKYNY_ROZDELENI) return moznosti.rozdeleni ?? JSON.stringify({ casti });
    const dotaz = /<dotaz>\n([\s\S]*?)\n<\/dotaz>/.exec(uzivatel.content)?.[1] ?? /Dotaz: (.*)/.exec(uzivatel.content)?.[1] ?? '';
    if (dotaz === moznosti.chybaU) throw new Error('Model neodpověděl.');
    if (uzivatel.content.startsWith('<vety>')) return overeno((uzivatel.content.match(/^\d+\. Věta:/gm) ?? []).length);
    return odpovedi[dotaz] ?? NEVIM;
  });
  return { ai: { ...ai, generovat } as SluzbaAi, generovat };
}

function sestavit(ai: SluzbaAi) {
  // Úsek o sportu najde jen dotaz na sport, úsek o sálu jen dotaz na Sokolovnu (podle slov ve fulltextu).
  return { ai, index: vytvorFalesnyIndex([USEK_SAL, USEK_SPORT], () => 0.5) };
}

describe('rozdělení dotazu na části (12. 11. 2026)', () => {
  it('přečte otázky, srovná mezery a vynechá opakování', () => {
    expect(precistCasti(JSON.stringify({ casti: ['  Jaké zázemí pro sport\nobec nabízí? ', SAL, SAL] }), DOTAZ)).toEqual([SPORT, SAL]);
    expect(precistCasti('```json\n{"casti": ["Kolik stojí pronájem sálu v Sokolovně?"]}\n```', DOTAZ)).toEqual([SAL]);
  });

  it('neplatné rozdělení vrátí null a hledá se celý dotaz', () => {
    expect(precistCasti('nesmysl', DOTAZ)).toBeNull();
    expect(precistCasti(JSON.stringify({ casti: [] }), DOTAZ)).toBeNull();
    expect(precistCasti(JSON.stringify({ casti: ['a', 'b', 'c', 'd', 'e'].map((p) => `Otázka ${p} o něčem?`) }), DOTAZ)).toBeNull();
    expect(precistCasti(JSON.stringify({ casti: ['x'.repeat(300)] }), DOTAZ)).toBeNull();
  });

  it('otázka s číslem, které v dotazu není, rozdělení zneplatní', () => {
    expect(precistCasti(JSON.stringify({ casti: ['Kolik stojí pronájem sálu v roce 2024?'] }), DOTAZ)).toBeNull();
    expect(precistCasti(JSON.stringify({ casti: ['Kolik stojí pronájem sálu v roce 2024?'] }), 'Kolik stál pronájem sálu v roce 2024?')).not.toBeNull();
  });
});

describe('odpověď po částech', () => {
  it('každá část má vlastní hledání a odpověď, zdroje se číslují přes všechny části', async () => {
    const { ai } = aiPodleCasti([SPORT, SAL], { [SPORT]: ODPOVED_SPORT, [SAL]: ODPOVED_SAL });
    const prubeh: PrubehOdpovedi[] = [];
    const vysledek = await odpovedetPoCastech(DOTAZ, sestavit(ai), (u) => prubeh.push(u));
    if (vysledek.vysledek !== 'odpoved') throw new Error(`Čekal jsem odpověď, přišlo ${vysledek.vysledek}.`);
    expect(vysledek.odpoved.casti).toEqual([
      { otazka: SPORT, vety: [{ text: 'V obci je řada sportovišť a dětských hřišť.', zdroj: 1 }] },
      { otazka: SAL, vety: [{ text: 'Pronájem sálu v Sokolovně stojí 4 000 Kč a energie se platí zvlášť.', zdroj: 2 }, { text: 'Vratná kauce je 4 000 Kč.', zdroj: 2 }] },
    ]);
    expect(vysledek.odpoved.vety.map((v) => v.zdroj)).toEqual([1, 2, 2]);
    expect(vysledek.odpoved.zdroje.map((z) => [z.cislo, z.nazev])).toEqual([[1, 'Služby'], [2, 'Zápis č. 14/2025 ze schůze rady obce']]);
    expect(vysledek.odpoved.nezodpovezeno).toEqual([]);
    expect(vysledek.technicke).toMatchObject({ casti: 2, castiZodpovezeno: 2, duvodyCasti: [] });
    expect(prubeh[0]).toEqual({ udalost: 'casti', casti: [SPORT, SAL] });
    expect(prubeh.slice(1)).toEqual(expect.arrayContaining([
      { udalost: 'cast', cislo: 1, vysledek: 'odpoved' },
      { udalost: 'cast', cislo: 2, vysledek: 'odpoved' },
    ]));
  });

  it('část bez odpovědi neshodí ostatní a stránka ji ukáže mezi nezodpovězenými', async () => {
    const { ai } = aiPodleCasti([SPORT, SAL, TELOCVICNA], { [SPORT]: ODPOVED_SPORT, [SAL]: ODPOVED_SAL });
    const vysledek = await odpovedetPoCastech(DOTAZ, sestavit(ai));
    if (vysledek.vysledek !== 'odpoved') throw new Error(`Čekal jsem odpověď, přišlo ${vysledek.vysledek}.`);
    expect(vysledek.odpoved.casti?.map((c) => c.otazka)).toEqual([SPORT, SAL]);
    expect(vysledek.odpoved.nezodpovezeno).toEqual([TELOCVICNA]);
    expect(vysledek.technicke).toMatchObject({ casti: 3, castiZodpovezeno: 2 });
  });

  it('výpadek AI u jedné části nechá odpovědi na ostatní', async () => {
    const { ai } = aiPodleCasti([SPORT, SAL], { [SPORT]: ODPOVED_SPORT, [SAL]: ODPOVED_SAL }, { chybaU: SAL });
    const priChybe = vi.fn();
    const vysledek = await odpovedetPoCastech(DOTAZ, { ...sestavit(ai), priChybe });
    if (vysledek.vysledek !== 'odpoved') throw new Error(`Čekal jsem odpověď, přišlo ${vysledek.vysledek}.`);
    expect(vysledek.odpoved.nezodpovezeno).toEqual([SAL]);
    expect(vysledek.technicke.duvodyCasti).toEqual(['chyba-ai']);
    expect(priChybe).toHaveBeenCalledTimes(1);
  });

  it('bez odpovědi na žádnou část jde dotaz zastupitelům, výpadek AI dovolí hledat znovu', async () => {
    const nic = await odpovedetPoCastech(DOTAZ, sestavit(aiPodleCasti([SPORT, SAL], {}).ai));
    expect(nic).toMatchObject({ vysledek: 'zastupitelum', duvod: 'model-nevi' });
    const vypadek = await odpovedetPoCastech(DOTAZ, sestavit(aiPodleCasti([SPORT, SAL], { [SPORT]: NEVIM }, { chybaU: SAL }).ai));
    expect(vypadek).toMatchObject({ vysledek: 'zastupitelum', duvod: 'chyba-ai' });
  });

  it('jedna část vrátí odpověď beze změny tvaru, bez seznamu částí', async () => {
    const { ai } = aiPodleCasti([SAL], { [SAL]: ODPOVED_SAL });
    const vysledek = await odpovedetPoCastech(SAL, sestavit(ai));
    if (vysledek.vysledek !== 'odpoved') throw new Error(`Čekal jsem odpověď, přišlo ${vysledek.vysledek}.`);
    expect(vysledek.odpoved.casti).toBeUndefined();
    expect(vysledek.technicke).toMatchObject({ casti: 1, castiZodpovezeno: 1 });
  });

  it('dotaz na jednu věc se hledá v autorově znění, ne v přeformulované otázce', async () => {
    const { ai } = aiPodleCasti(['Jaká je cena za pronájem sálu v sokolovně?'], { [SAL]: ODPOVED_SAL });
    const prubeh: PrubehOdpovedi[] = [];
    const vysledek = await odpovedetPoCastech(SAL, sestavit(ai), (u) => prubeh.push(u));
    expect(prubeh[0]).toEqual({ udalost: 'casti', casti: [SAL] });
    expect(vysledek.vysledek).toBe('odpoved');
  });

  it('celý dotaz se hledá už během rozdělení a dotaz na jednu věc na rozdělení nečeká', async () => {
    const { ai: zaklad, vektorovano } = vytvorFalesneAi();
    let dokoncitRozdeleni: (vystup: string) => void = () => {};
    const ai: SluzbaAi = {
      ...zaklad,
      generovat: async (zpravy) => {
        if (zpravy[0].content === POKYNY_ROZDELENI) return new Promise<string>((hotovo) => { dokoncitRozdeleni = hotovo; });
        return zpravy[1].content.startsWith('<vety>') ? overeno(2) : ODPOVED_SAL;
      },
    };
    const vysledek = odpovedetPoCastech(SAL, sestavit(ai));
    await new Promise((hotovo) => setTimeout(hotovo, 0));
    // Rozdělení ještě neskončilo, a celý dotaz už se hledá.
    expect(vektorovano).toEqual([SAL]);
    dokoncitRozdeleni(JSON.stringify({ casti: [SAL] }));
    expect((await vysledek).vysledek).toBe('odpoved');
    expect(vektorovano).toEqual([SAL]);
  });

  it('když se dotaz rozdělí, chyba zahozeného hledání celku se nehlásí', async () => {
    const { ai } = aiPodleCasti([SPORT, SAL], { [SPORT]: ODPOVED_SPORT, [SAL]: ODPOVED_SAL }, { chybaU: DOTAZ });
    const priChybe = vi.fn();
    const vysledek = await odpovedetPoCastech(DOTAZ, { ...sestavit(ai), priChybe });
    expect(vysledek.vysledek).toBe('odpoved');
    expect(priChybe).not.toHaveBeenCalled();
  });

  it('model odpovědi i ověření dostanou dnešní datum', async () => {
    const { ai, generovat } = aiPodleCasti([SAL], { [SAL]: ODPOVED_SAL });
    await odpovedetPoCastech(SAL, { ...sestavit(ai), ted: () => Date.UTC(2026, 10, 12, 23, 30) });
    const obsahy = generovat.mock.calls.slice(1).map(([zpravy]) => zpravy[1].content);
    // 23:30 UTC je v Česku už 13. 11.
    expect(obsahy[0]).toContain('<dnes>13. 11. 2026</dnes>');
    expect(obsahy[1]).toContain('Dnes: 13. 11. 2026');
  });

  it('když rozdělení selže, hledá se celý dotaz', async () => {
    const { ai, generovat } = aiPodleCasti([], { [DOTAZ]: ODPOVED_SAL }, { rozdeleni: 'nesmysl' });
    const prubeh: PrubehOdpovedi[] = [];
    const vysledek = await odpovedetPoCastech(DOTAZ, sestavit(ai), (u) => prubeh.push(u));
    expect(prubeh[0]).toEqual({ udalost: 'casti', casti: [DOTAZ] });
    expect(vysledek.vysledek).toBe('odpoved');
    expect(generovat).toHaveBeenCalledTimes(3);
  });
});

describe('citace řádku tabulky se záhlavím', () => {
  const CENIK = usek(ZAPIS, 'cenik-0', 'Podpis: ....................\n\nCeny pronájmu Vratná kauce\no Celá sokolovna 4.000 Kč + energie 8.000 Kč\no Přísálí 2.000 Kč + energie 4.000 Kč\no Sál 2.000 Kč + energie 4.000 Kč', 2);

  it('přijme záhlaví a řádek spojené výpustkou i souvislý kus tabulky', () => {
    const [veta] = overitKodem([{ veta: 'Přísálí stojí 2 000 Kč plus energie, kauce je 4 000 Kč.', usek: 1, citace: 'Ceny pronájmu Vratná kauce … Přísálí 2.000 Kč + energie 4.000 Kč' }], [CENIK]);
    expect(veta.citace).toBe('Ceny pronájmu Vratná kauce … Přísálí 2.000 Kč + energie 4.000 Kč');
    expect(() => overitKodem([{ veta: 'Celá sokolovna stojí 4 000 Kč plus energie, kauce je 8 000 Kč.', usek: 1, citace: 'Ceny pronájmu Vratná kauce o Celá sokolovna 4.000 Kč + energie 8.000 Kč' }], [CENIK])).not.toThrow();
    // Výpustka nesmí propustit řádek, který v úseku není.
    expect(() => overitKodem([{ veta: 'Sál stojí 3 000 Kč.', usek: 1, citace: 'Ceny pronájmu Vratná kauce … Sál 3.000 Kč + energie 4.000 Kč' }], [CENIK])).toThrow(ZamitnutaOdpoved);
  });

  it('přijme záhlaví a pozdější řádek napsané za sebou a ukáže mezi nimi výpustku', () => {
    const [veta] = overitKodem([{ veta: 'Sál stojí 2 000 Kč plus energie, kauce je 4 000 Kč.', usek: 1, citace: 'Ceny pronájmu Vratná kauce o Sál 2.000 Kč + energie 4.000 Kč' }], [CENIK]);
    expect(veta.citace).toBe('Ceny pronájmu Vratná kauce … o Sál 2.000 Kč + energie 4.000 Kč');
  });

  it('kus jednoho řádku s kusem jiného řádku nespojí', () => {
    // „Celá sokolovna“ není celý řádek a „2.000 Kč + energie“ nezačíná na začátku řádku.
    expect(() => overitKodem([{ veta: 'Celá sokolovna stojí 2 000 Kč.', usek: 1, citace: 'Celá sokolovna 2.000 Kč + energie 4.000 Kč' }], [CENIK])).toThrow(ZamitnutaOdpoved);
    // Řádek před záhlavím se za záhlaví připojit nedá.
    expect(() => overitKodem([{ veta: 'Podpis.', usek: 1, citace: 'Ceny pronájmu Vratná kauce Podpis: ....................' }], [CENIK])).toThrow(ZamitnutaOdpoved);
  });
});

describe('ověření modelem: jméno soukromé osoby', () => {
  it('věta se jménem žadatele nebo nájemce neprojde, i když z citace plyne', () => {
    expect(() => precistOvereni('{"vysledky": [{"cislo": 1, "plyne": true, "soukroma_osoba": false}, {"cislo": 2, "plyne": true, "soukroma_osoba": true}]}', 2)).toThrow(/soukroma-osoba/);
    expect(() => precistOvereni('{"vysledky": [{"cislo": 1, "plyne": true, "soukroma_osoba": false}]}', 1)).not.toThrow();
    // Výstup bez pole se počítá jako bez jména.
    expect(() => precistOvereni('{"vysledky": [{"cislo": 1, "plyne": true}]}', 1)).not.toThrow();
  });
});

describe('POST /api/dotaz s průběhem', () => {
  const PUVOD = 'https://nezavisli-prisovice.cz';
  const pozadavek = (hlavicky: Record<string, string> = {}) => new Request(`${PUVOD}/ucho/api/dotaz`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: TYP_PRUBEHU, origin: PUVOD, 'cf-connecting-ip': '192.0.2.1', ...hlavicky },
    body: JSON.stringify({ text: DOTAZ, typ: 'dotaz' }),
  });
  const limiter = { limit: vi.fn(async () => ({ success: true })) };

  it('pošle rozdělení, hotové části a nakonec výsledek po řádcích JSON', async () => {
    const { ai } = aiPodleCasti([SPORT, SAL], { [SPORT]: ODPOVED_SPORT, [SAL]: ODPOVED_SAL });
    const log = vi.fn();
    const api = vytvorApi({ ...sestavit(ai), limiter, log });
    const odpoved = await api.fetch(pozadavek());
    expect(odpoved.status).toBe(200);
    expect(odpoved.headers.get('content-type')).toContain(TYP_PRUBEHU);
    expect(odpoved.headers.get('cache-control')).toBe('no-store, no-transform');
    const udalosti = (await odpoved.text()).trim().split('\n').map((radek) => JSON.parse(radek) as UdalostDotazu);
    expect(udalosti.map((u) => u.udalost)).toEqual(['casti', 'cast', 'cast', 'vysledek']);
    const posledni = udalosti[3] as { udalost: 'vysledek'; vysledek: VysledekDotazu };
    expect(posledni.vysledek.vysledek).toBe('odpoved');
    // Do logu jde počet částí, ne jejich text.
    expect(log.mock.calls[0][0]).toMatchObject({ casti: 2, castiZodpovezeno: 2 });
    expect(JSON.stringify(log.mock.calls)).not.toContain('Sokolovn');
  });

  it('chyba požadavku přijde jako HTTP chyba, ne jako průběh', async () => {
    const { ai } = aiPodleCasti([SPORT], {});
    const api = vytvorApi({ ...sestavit(ai), limiter });
    const cizi = await api.fetch(pozadavek({ origin: 'https://example.com' }));
    expect(cizi.status).toBe(403);
    expect(cizi.headers.get('content-type')).toContain('application/json');
  });
});
