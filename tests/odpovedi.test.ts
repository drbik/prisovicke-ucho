import { describe, expect, it, vi } from 'vitest';
import { vytvorFalesneAi } from '../src/lib/ai/falesna';
import { vytvorApi } from '../src/lib/api/aplikace';
import { vytvorFalesnyIndex } from '../src/lib/odpovedi/falesny';
import { dotazProFulltext, hledatUseky, type Preradit } from '../src/lib/odpovedi/hledani';
import { odpovedetNaDotaz } from '../src/lib/odpovedi/odpoved';
import { oddilCitace } from '../src/lib/odpovedi/misto';
import { cislaVTextu, overitKodem, precistNezodpovezeno, precistOdpoved, ZamitnutaOdpoved } from '../src/lib/odpovedi/overeni';
import { VERZE_PROMPTU_ODPOVEDI } from '../src/lib/odpovedi/prompt-odpovedi';
import type { NalezenyUsek, ZdrojovyDokument } from '../src/lib/odpovedi/typy';
import { UPOZORNENI, datumZdroje, hlavickaUseku } from '../src/lib/odpovedi/zdroje';
import type { VysledekDotazu } from '../src/lib/odpovedi/zpracovani';

const ADRESA = 'https://nezavisli-prisovice.cz/ucho/api/dotaz';
const PUVOD = 'https://nezavisli-prisovice.cz';
const DOTAZ = 'Kolik stojí pronájem sálu v Sokolovně na oslavu?';

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
  nadrazenyUrl: 'https://prisovice.cz/urednideska/zapis-c-14-2025/',
};
const KARTA: ZdrojovyDokument = {
  id: 'karta',
  url: 'https://nezavisli-prisovice.cz/#dostupne-bydleni',
  nazev: 'Patnáct dostupných bytů',
  web: 'nezavisli-prisovice.cz',
  typ: 'karta',
  zverejneno: null,
  zmeneno: null,
  mesicNahrani: null,
  otisk: 'b',
  stazeno: '2026-11-10T08:00:00.000Z',
  nadrazenyUrl: null,
};

function usek(dokument: ZdrojovyDokument, id: string, text: string, strana: number | null = null): NalezenyUsek {
  return { id, dokumentId: dokument.id, poradi: 0, strana, hlavicka: hlavickaUseku(dokument, strana), text, dokument };
}

const USEK_SOKOLOVNA = usek(ZAPIS, 'zapis-0', 'Usnesení UR č. 179/2025 – Rada obce upravuje výši pronájmu samotného sálu sokolovny na 4.000,--Kč + energie a vratná kauce ve výši 4.000,--Kč.', 2);
const USEK_BYTY = usek(KARTA, 'karta-0', 'Obec připravuje nový bytový dům poblíž stávajícího DPS s 15 menšími nájemními byty. Stavět chceme v roce 2027.');

const ODPOVED = JSON.stringify({
  vety: [
    { veta: 'Pronájem samotného sálu Sokolovny stojí 4 000 Kč a energie se platí zvlášť.', usek: 1, citace: 'upravuje výši pronájmu samotného sálu sokolovny na 4.000,--Kč + energie' },
    { veta: 'Vratná kauce je 4 000 Kč.', usek: 1, citace: 'vratná kauce ve výši 4.000,--Kč' },
  ],
});
const OVERENO = JSON.stringify({ vysledky: [{ cislo: 1, plyne: true }, { cislo: 2, plyne: true }] });

function sestavit(moznosti: Parameters<typeof vytvorFalesneAi>[0] = {}, useky: NalezenyUsek[] = [USEK_SOKOLOVNA, USEK_BYTY], podobnost?: (u: NalezenyUsek) => number) {
  const { ai, generovani, vektorovano } = vytvorFalesneAi(moznosti);
  const index = vytvorFalesnyIndex(useky, podobnost ?? ((u) => (u.id === 'zapis-0' ? 0.8 : 0.6)));
  const log = vi.fn();
  const limiter = { limit: vi.fn(async (_moznosti: { key: string }) => ({ success: true })) };
  return { api: vytvorApi({ ai, index, limiter, log }), generovani, vektorovano, log, limiter, index };
}

function dotaz(telo: unknown, hlavicky: Record<string, string> = {}) {
  return new Request(ADRESA, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: PUVOD, 'cf-connecting-ip': '192.0.2.1', ...hlavicky },
    body: JSON.stringify(telo),
  });
}

async function poslat(api: ReturnType<typeof vytvorApi>, telo: unknown = { text: DOTAZ, typ: 'dotaz' }) {
  const odpoved = await api.fetch(dotaz(telo));
  return { status: odpoved.status, data: await odpoved.json() as VysledekDotazu };
}

describe('POST /api/dotaz (krok 8.6)', () => {
  it('vrátí odpověď s citací, označením zdroje a upozorněním (F-74, F-79)', async () => {
    const { api } = sestavit({ vystupyGenerovani: [ODPOVED, OVERENO] });
    const { status, data } = await poslat(api);
    expect(status).toBe(200);
    if (data.vysledek !== 'odpoved') throw new Error(`Čekal jsem odpověď, přišlo ${data.vysledek}.`);
    expect(data.odpoved.vety).toEqual([
      { text: 'Pronájem samotného sálu Sokolovny stojí 4 000 Kč a energie se platí zvlášť.', zdroj: 1 },
      { text: 'Vratná kauce je 4 000 Kč.', zdroj: 1 },
    ]);
    expect(data.odpoved.zdroje).toEqual([{
      cislo: 1,
      url: 'https://prisovice.cz/wp-content/uploads/2025/09/zapis-rady.pdf#page=2',
      nazev: 'Zápis č. 14/2025 ze schůze rady obce',
      datum: 'zveřejněno 24. 9. 2025',
      web: 'prisovice.cz',
      oznaceni: 'Odpověď z webu obce',
      uryvek: 'upravuje výši pronájmu samotného sálu sokolovny na 4.000,--Kč + energie … vratná kauce ve výši 4.000,--Kč',
      misto: 'strana 2',
    }]);
    expect(data.odpoved.nezodpovezeno).toEqual([]);
    expect(data.odpoved.oznaceni).toEqual(['Odpověď z webu obce']);
    expect(data.odpoved.upozorneni).toBe(UPOZORNENI);
    expect(UPOZORNENI).toContain('Nejde o úřední vyjádření obce');
    expect(data.technicke).toMatchObject({ verzePromptu: VERZE_PROMPTU_ODPOVEDI, model: 'falesny-model-odpovedi' });
  });

  it('kartu webu Nezávislých označí jinak a uvede stav webu k datu stažení', async () => {
    const vety = JSON.stringify({ vety: [{ veta: 'Obec připravuje bytový dům s 15 nájemními byty.', usek: 1, citace: 'nový bytový dům poblíž stávajícího DPS s 15 menšími nájemními byty' }] });
    const { api } = sestavit({ vystupyGenerovani: [vety, JSON.stringify({ vysledky: [{ cislo: 1, plyne: true }] })] }, [USEK_BYTY], () => 0.7);
    const { data } = await poslat(api, { text: 'Kolik bude nových bytů u DPS?', typ: 'dotaz' });
    if (data.vysledek !== 'odpoved') throw new Error(`Čekal jsem odpověď, přišlo ${data.vysledek}.`);
    expect(data.odpoved.oznaceni).toEqual(['Podle webu Nezávislých pro Příšovice']);
    expect(data.odpoved.zdroje[0]).toMatchObject({ url: 'https://nezavisli-prisovice.cz/#dostupne-bydleni', datum: 'stav webu k 10. 11. 2026' });
  });

  it('dva úseky téhož dokumentu ukáže jako jeden zdroj', async () => {
    const druhy = usek(KARTA, 'karta-1', 'Úvěr splatí vybírané nájemné, obec tato stavba finančně nezatíží.');
    const vety = JSON.stringify({ vety: [
      { veta: 'U DPS má vzniknout 15 nájemních bytů.', usek: 1, citace: 's 15 menšími nájemními byty' },
      { veta: 'Úvěr má splatit nájemné.', usek: 2, citace: 'Úvěr splatí vybírané nájemné' },
    ] });
    const overeno = JSON.stringify({ vysledky: [{ cislo: 1, plyne: true }, { cislo: 2, plyne: true }] });
    const { api } = sestavit({ vystupyGenerovani: [vety, overeno] }, [USEK_BYTY, druhy], () => 0.7);
    const { data } = await poslat(api, { text: 'Kolik bude nových bytů u DPS?', typ: 'dotaz' });
    if (data.vysledek !== 'odpoved') throw new Error(`Čekal jsem odpověď, přišlo ${data.vysledek}.`);
    expect(data.odpoved.zdroje).toHaveLength(1);
    expect(data.odpoved.vety.map((v) => v.zdroj)).toEqual([1, 1]);
    expect(data.odpoved.zdroje[0].uryvek).toBe('s 15 menšími nájemními byty … Úvěr splatí vybírané nájemné');
  });

  it('bez úseku nad prahem podobnosti jde dotaz zastupitelům bez volání modelu (F-76)', async () => {
    const { api, generovani } = sestavit({}, [USEK_SOKOLOVNA], () => 0.2);
    const { data } = await poslat(api);
    expect(data).toMatchObject({ vysledek: 'zastupitelum', duvod: 'nic-nenalezeno' });
    expect(generovani).toHaveLength(0);
  });

  it('prázdný index pošle dotaz zastupitelům', async () => {
    const { api, generovani } = sestavit({}, []);
    const { data } = await poslat(api);
    expect(data).toMatchObject({ vysledek: 'zastupitelum', duvod: 'nic-nenalezeno' });
    expect(generovani).toHaveLength(0);
  });

  it('když model odpověď v úsecích nenajde, jde dotaz zastupitelům', async () => {
    const { api } = sestavit({ vystupyGenerovani: [JSON.stringify({ vety: [] })] });
    const { data } = await poslat(api);
    expect(data).toMatchObject({ vysledek: 'zastupitelum', duvod: 'model-nevi' });
  });

  it('tvrzení s citací, která v úseku není, odpověď zastaví (F-75)', async () => {
    const vymyslena = JSON.stringify({ vety: [{ veta: 'Pronájem stojí 4 000 Kč.', usek: 1, citace: 'pronájem sálu stojí 4.000 Kč na den' }] });
    const { api, generovani } = sestavit({ vystupyGenerovani: [vymyslena, OVERENO] });
    const { data } = await poslat(api);
    expect(data).toMatchObject({ vysledek: 'zastupitelum', duvod: 'citace-neni-v-useku' });
    // Ověření modelem se po neúspěchu kontroly kódem už nevolá.
    expect(generovani).toHaveLength(1);
  });

  it('číslo, které v citaci není, odpověď zastaví (F-75)', async () => {
    const cislo = JSON.stringify({ vety: [{ veta: 'Pronájem na víkend stojí 8 000 Kč.', usek: 1, citace: 'upravuje výši pronájmu samotného sálu sokolovny na 4.000,--Kč + energie' }] });
    const { api } = sestavit({ vystupyGenerovani: [cislo, OVERENO] });
    const { data } = await poslat(api);
    expect(data).toMatchObject({ vysledek: 'zastupitelum', duvod: 'cislo-neni-v-citaci' });
  });

  it('když ověření modelem řekne, že věta z citace neplyne, jde dotaz zastupitelům (F-75, F-76)', async () => {
    const neplyne = JSON.stringify({ vysledky: [{ cislo: 1, plyne: true }, { cislo: 2, plyne: false }] });
    const { api } = sestavit({ vystupyGenerovani: [ODPOVED, neplyne] });
    const { data } = await poslat(api);
    expect(data).toMatchObject({ vysledek: 'zastupitelum', duvod: 'neplyne-z-citace' });
  });

  it('neplatný výstup modelu pošle dotaz zastupitelům', async () => {
    const { api } = sestavit({ vystupyGenerovani: ['Pronájem stojí 4 000 Kč.'] });
    const { data } = await poslat(api);
    expect(data).toMatchObject({ vysledek: 'zastupitelum', duvod: 'neplatny-json' });
  });

  it('výpadek AI dotaz nechá zastupitelům a stránka se to dozví', async () => {
    const { api } = sestavit({ chybaGenerovani: new Error('Denní limit neuronů vyčerpán.') });
    const { status, data } = await poslat(api);
    expect(status).toBe(200);
    expect(data).toMatchObject({ vysledek: 'zastupitelum', duvod: 'chyba-ai' });
  });

  it.each(['navrh', 'stiznost', 'pochvala'])('typ %s se nehledá a AI se nevolá (F-72)', async (typ) => {
    const { api, generovani, vektorovano, index } = sestavit({ vystupyGenerovani: [ODPOVED, OVERENO] });
    const { data } = await poslat(api, { text: 'Navrhuji postavit u Sokolovny nové hřiště.', typ });
    expect(data).toEqual({ vysledek: 'nehleda', typ });
    expect(generovani).toHaveLength(0);
    expect(vektorovano).toHaveLength(0);
    expect(index.dotazy).toHaveLength(0);
  });

  it('do logu jde jen čas, počty, model a verze promptu, nikdy text dotazu ani odpovědi', async () => {
    const { api, log } = sestavit({ vystupyGenerovani: [ODPOVED, OVERENO] });
    await poslat(api);
    expect(log).toHaveBeenCalledTimes(1);
    const zaznam = log.mock.calls[0][0] as Record<string, unknown>;
    expect(zaznam).toMatchObject({ udalost: 'dotaz', vysledek: 'odpoved', vet: 2, zdroju: 1, model: 'falesny-model-odpovedi', verzePromptu: VERZE_PROMPTU_ODPOVEDI });
    expect(zaznam.celkemMs).toEqual(expect.any(Number));
    const text = JSON.stringify(zaznam);
    expect(text).not.toContain('Sokolovn');
    expect(text).not.toContain('Pronájem');
    expect(text).not.toContain('4.000');
  });

  it('log při výpadku AI také neobsahuje text dotazu', async () => {
    const { api, log } = sestavit({ chybaGenerovani: new Error('Model selhal.') });
    await poslat(api);
    expect(JSON.stringify(log.mock.calls)).not.toContain('Sokolovn');
  });

  it('odmítne cizí původ, chybějící typ a příliš krátký text', async () => {
    const { api } = sestavit();
    expect((await api.fetch(dotaz({ text: DOTAZ, typ: 'dotaz' }, { origin: 'https://example.com' }))).status).toBe(403);
    expect((await poslat(api, { text: DOTAZ })).status).toBe(422);
    expect((await poslat(api, { text: 'Kolik?', typ: 'dotaz' })).status).toBe(422);
    expect((await poslat(api, { text: DOTAZ, typ: 'otazka' })).status).toBe(422);
  });

  it('odmítne požadavek nad limitem', async () => {
    const { api, limiter } = sestavit();
    limiter.limit.mockResolvedValueOnce({ success: false });
    const odpoved = await api.fetch(dotaz({ text: DOTAZ, typ: 'dotaz' }));
    expect(odpoved.status).toBe(429);
  });
});

describe('ověření kódem (F-75)', () => {
  it('porovná citaci bez ohledu na mezery, velikost písmen a typografii', () => {
    const vety = precistOdpoved(JSON.stringify({ vety: [{ veta: 'Kauce je 4 000 Kč.', usek: 1, citace: 'Vratná  KAUCE ve výši 4.000,-- Kč' }] }));
    expect(() => overitKodem(vety, [USEK_SOKOLOVNA])).not.toThrow();
  });

  it('přijme citaci ze dvou míst téhož úseku a ukáže ji s výpustkou', () => {
    const [veta] = overitKodem([{ veta: 'Kauce je 4 000 Kč.', usek: 1, citace: 'Usnesení UR č. 179/2025 – Rada obce upravuje výši pronájmu. Vratná kauce ve výši 4.000,--Kč.' }], [USEK_SOKOLOVNA]);
    expect(veta.citace).toBe('Usnesení UR č. 179/2025 – Rada obce upravuje výši pronájmu. … Vratná kauce ve výši 4.000,--Kč.');
    // Části, které v úseku jdou za sebou, zůstanou pohromadě.
    const [souvisla] = overitKodem([{ veta: 'Kauce je 4 000 Kč.', usek: 1, citace: '4.000,--Kč + energie a vratná kauce. Ve výši 4.000,--Kč.' }], [USEK_SOKOLOVNA]);
    expect(souvisla.citace).toBe('4.000,--Kč + energie a vratná kauce Ve výši 4.000,--Kč.');
    expect(() => overitKodem([{ veta: 'Kauce je 4 000 Kč.', usek: 1, citace: 'Vratná kauce ve výši 4.000,--Kč. Platí se předem.' }], [USEK_SOKOLOVNA])).toThrow(ZamitnutaOdpoved);
  });

  it('když je citace v jiném nalezeném úseku, opraví zdroj na něj', () => {
    const [veta] = overitKodem([{ veta: 'U DPS vznikne 15 bytů.', usek: 1, citace: 's 15 menšími nájemními byty' }], [USEK_SOKOLOVNA, USEK_BYTY]);
    expect(veta.usek).toBe(2);
  });

  it('odmítne větu bez citace a odkaz na neexistující úsek', () => {
    expect(() => overitKodem([{ veta: 'Kauce je 4 000 Kč.', usek: 1, citace: '' }], [USEK_SOKOLOVNA])).toThrow(ZamitnutaOdpoved);
    expect(() => overitKodem([{ veta: 'Kauce je 4 000 Kč.', usek: 3, citace: 'vratná kauce' }], [USEK_SOKOLOVNA])).toThrow(ZamitnutaOdpoved);
  });

  it('číslo z názvu citovaného dokumentu je opora, datum zveřejnění ne', () => {
    const veta = (text: string) => [{ veta: text, usek: 1, citace: 'vratná kauce ve výši 4.000,--Kč' }];
    expect(() => overitKodem(veta('Rada podle zápisu č. 14/2025 stanovila kauci 4 000 Kč.'), [USEK_SOKOLOVNA])).not.toThrow();
    expect(() => overitKodem(veta('Od 24. 9. 2025 je kauce 4 000 Kč.'), [USEK_SOKOLOVNA])).toThrow(ZamitnutaOdpoved);
  });

  it('přečte první objekt JSON i s ohraničením a přebytečnými závorkami', () => {
    const vystup = ['```json', '{"vety": [{"veta": "Kauce je 4 000 Kč.", "usek": 1, "citace": "kauce {ve výši} 4.000,--Kč"}]}', ']}', '```'].join('\n');
    expect(precistOdpoved(vystup)).toEqual([{ veta: 'Kauce je 4 000 Kč.', usek: 1, citace: 'kauce {ve výši} 4.000,--Kč' }]);
  });

  it('bere čísla jako hodnoty', () => {
    expect(cislaVTextu('4.000,--Kč a 34 852 049 Kč, 07:30')).toEqual(new Set(['4000', '4', '0', '34852049', '34', '852', '49', '7', '30']));
  });
});

describe('hledání', () => {
  it('z jednoho dokumentu vezme nejvýš tři úseky', async () => {
    const useky = [0, 1, 2, 3].map((i) => usek(ZAPIS, `zapis-${i}`, `Úsek ${i} o pronájmu sokolovny.`));
    const { api, generovani } = sestavit({ vystupyGenerovani: [JSON.stringify({ vety: [] })] }, [...useky, USEK_BYTY], (u) => (u.dokument.id === 'zapis' ? 0.9 : 0.5));
    await poslat(api);
    const uryvky = generovani[0][1].content;
    expect(uryvky.match(/Úsek \d/g)).toHaveLength(3);
    expect(uryvky).toContain('bytový dům');
  });

  // Provozní řád Písečáků: pravidlo o psech bylo v dokumentu až čtvrté a do modelu se nedostalo.
  // Dotaz nemá shodu ve fulltextu, takže pořadí dávají jen vektory.
  const RAD: ZdrojovyDokument = { ...ZAPIS, id: 'rad', url: 'https://prisovice.cz/wp-content/uploads/2024/11/provozni-rad.pdf', nazev: 'Provozní řád rekreační oblasti Malý a Velký Písečák' };
  const USEKY_RADU = [
    usek(RAD, 'rad-0', 'Vjezd vozidel do prostoru Písečáků je zakázán.', 4),
    usek(RAD, 'rad-1', 'Poplatek je 100 Kč za místo a den.', 6),
    usek(RAD, 'rad-2', 'Upozornění pro provoz malých plavidel.', 6),
    usek(RAD, 'rad-3', 'V obou jezerech je zakázáno koupat psy.', 5),
  ];
  const podobnostRadu = (u: NalezenyUsek) => ({ 'rad-0': 0.63, 'rad-1': 0.62, 'rad-2': 0.61, 'rad-3': 0.6 } as Record<string, number>)[u.id] ?? 0.5;
  const hledatPsy = async (preradit?: Preradit) => {
    const index = vytvorFalesnyIndex([...USEKY_RADU, USEK_BYTY], podobnostRadu);
    return hledatUseky(index, [1, 0, 0], 'Smí pes do vody?', 6, preradit);
  };

  it('bez přeřazení vezme z dokumentu tři nejlepší úseky podle pořadí', async () => {
    const vysledek = await hledatPsy();
    expect(vysledek.useky.map((u) => u.id).filter((id) => id.startsWith('rad'))).toEqual(['rad-0', 'rad-1', 'rad-2']);
    expect(vysledek.prerazeno).toBe(0);
  });

  it('úsek, u kterého si je přeřazení jisté, jde dopředu i přes limit dokumentu', async () => {
    const preradit = vi.fn(async (_dotaz: string, texty: string[]) => texty.map((t) => (t.includes('koupat psy') ? 0.92 : t.includes('Vjezd') ? 0.86 : 0.01)));
    const vysledek = await hledatPsy(preradit);
    expect(vysledek.useky[0].id).toBe('rad-3');
    expect(vysledek.useky.map((u) => u.id).filter((id) => id.startsWith('rad'))).toEqual(['rad-3', 'rad-0', 'rad-1']);
    expect(vysledek.useky.map((u) => u.id)).toContain('karta-0');
    expect(vysledek.prerazeno).toBe(2);
    // Přeřazení dostane hlavičku i text úseku.
    expect(preradit.mock.calls[0][1].some((t) => t.startsWith('Provozní řád') && t.includes('koupat psy'))).toBe(true);
  });

  it('nízké skóre přeřazení pořadí nemění a chyba přeřazení hledání nezastaví', async () => {
    const nizke = await hledatPsy(async (_d, texty) => texty.map(() => 0.02));
    expect(nizke.useky.map((u) => u.id).filter((id) => id.startsWith('rad'))).toEqual(['rad-0', 'rad-1', 'rad-2']);
    const chyba = await hledatPsy(async () => { throw new Error('model nedostupný'); });
    expect(chyba.useky.map((u) => u.id).filter((id) => id.startsWith('rad'))).toEqual(['rad-0', 'rad-1', 'rad-2']);
    expect(chyba.prerazeno).toBe(0);
  });

  it('odpověď použije přeřazení z AI a počet zapíše do technických údajů', async () => {
    const { ai } = vytvorFalesneAi({ vystupyGenerovani: [JSON.stringify({ vety: [] })] });
    const index = vytvorFalesnyIndex([...USEKY_RADU, USEK_BYTY], podobnostRadu);
    const vysledek = await odpovedetNaDotaz('Smí pes do vody?', {
      ai: { ...ai, preradit: async (_d, texty) => texty.map((t) => (t.includes('koupat psy') ? 0.92 : 0)) },
      index,
    });
    expect(vysledek.technicke.prerazeno).toBe(1);
  });
});

describe('fulltext a zdroje', () => {
  it('hledá podle začátků slov bez diakritiky a vynechá bezvýznamná slova', () => {
    expect(dotazProFulltext('Kolik stojí pronájem sálu v Sokolovně?')).toBe('"stoj"* OR "pronaj"* OR "salu" OR "sokolo"*');
    expect(dotazProFulltext('usnesení 179/2025')).toBe('"usnese"* OR "179" OR "2025"');
    expect(dotazProFulltext('soudem')).toBe('"soud"*');
    expect(dotazProFulltext('a i o v')).toBe('');
  });

  it('ukáže datum podle druhu zdroje', () => {
    expect(datumZdroje(ZAPIS)).toBe('zveřejněno 24. 9. 2025');
    expect(datumZdroje(KARTA)).toBe('stav webu k 10. 11. 2026');
    expect(datumZdroje({ ...ZAPIS, zverejneno: null })).toBe('nahráno 9/2025');
    expect(datumZdroje({ ...ZAPIS, typ: 'stranka', zmeneno: '2026-02-17' })).toBe('aktualizováno 17. 2. 2026');
  });
});

describe('místo citace v dokumentu a nezodpovězené části dotazu', () => {
  const RAD: ZdrojovyDokument = { ...ZAPIS, id: 'rad', url: 'https://prisovice.cz/wp-content/uploads/2024/11/provozni-rad.pdf', nazev: 'Provozní řád rekreační oblasti Malý a Velký Písečák', zverejneno: '2024-11-12' };
  const TEXT_RADU = [
    'čl.7',
    'Je zakázáno provozovat činnosti jakkoliv poškozující životní prostředí.',
    'čl.9',
    'V obou jezerech je zakázáno koupat psy. Zároveň upozorňujeme na přísnou kontumaci psů.',
    'čl.10',
    'Je zakázáno vstupovat na okolní pozemky určené k zemědělské činnosti.',
  ].join('\n');
  const USEK_PSI = usek(RAD, 'rad-5', TEXT_RADU, 5);
  const USEK_PRESTUPKY = usek(RAD, 'rad-8', 'Porušení povinností stanovených tímto provozním řádem může být postiženo podle zákona č. 250/2016 Sb., o odpovědnosti za přestupky.', 6);

  it('oddíl je poslední nadpis před citací, bez ohledu na mezery a velikost písmen', () => {
    expect(oddilCitace(USEK_PSI, 'V obou jezerech je zakázáno koupat psy.')).toBe('čl. 9');
    expect(oddilCitace(USEK_PSI, 'v obou   jezerech je zakázáno koupat psy')).toBe('čl. 9');
    expect(oddilCitace(USEK_PSI, 'Je zakázáno provozovat činnosti jakkoliv poškozující životní prostředí.')).toBe('čl. 7');
    // Složená citace se hledá podle první části.
    expect(oddilCitace(USEK_PSI, 'koupat psy … přísnou kontumaci psů')).toBe('čl. 9');
  });

  it('nadpis, který je součástí citace, se počítá, a odkaz uprostřed věty nadpisem není', () => {
    expect(oddilCitace(USEK_PSI, 'čl.10\nJe zakázáno vstupovat na okolní pozemky')).toBe('čl. 10');
    const vyhlaska = usek(RAD, 'v-1', 'Zastupitelstvo se usneslo na základě § 59 odst. 4 zákona o odpadech vydat vyhlášku.\nČl. 1\nÚvodní ustanovení\n1) Tato vyhláška stanovuje systém.\n2) Každý je povinen odpad odkládat na určená místa.', null);
    expect(oddilCitace(vyhlaska, 'Každý je povinen odpad odkládat na určená místa.')).toBe('čl. 1 odst. 2');
    expect(oddilCitace(vyhlaska, 'Zastupitelstvo se usneslo na základě § 59 odst. 4 zákona o odpadech vydat vyhlášku.')).toBeNull();
    expect(oddilCitace(usek(RAD, 'p-1', '§ 12\nPoplatek se platí do konce března.', null), 'Poplatek se platí do konce března.')).toBe('§ 12');
  });

  it('bez nadpisu v úseku, nebo s citací, která v úseku není, vrátí null', () => {
    expect(oddilCitace(USEK_PRESTUPKY, 'Porušení povinností stanovených tímto provozním řádem může být postiženo')).toBeNull();
    expect(oddilCitace(USEK_PSI, 'Tahle věta v úseku není.')).toBeNull();
  });

  it('nezodpovězené části: jen krátké věcné texty bez čísel a adres', () => {
    const vystup = JSON.stringify({
      vety: [],
      nezodpovezeno: ['  kdo   dodržování zákazu kontroluje ', 'kdo dodržování zákazu kontroluje', 'zavolejte na 123 456 789', 'https://zlodej.example', 'ab', 7, 'x'.repeat(300), 'další věc', 'třetí věc', 'čtvrtá věc'],
    });
    const nezodpovezeno = precistNezodpovezeno(vystup);
    expect(nezodpovezeno).toHaveLength(3);
    expect(nezodpovezeno[0]).toBe('kdo dodržování zákazu kontroluje');
    expect(nezodpovezeno.every((cast) => cast.length <= 120 && !/\d/.test(cast))).toBe(true);
    expect(precistNezodpovezeno('{"vety": []}')).toEqual([]);
    expect(precistNezodpovezeno('nesmysl')).toEqual([]);
  });

  it('částečná odpověď ukáže místo v dokumentu a části, na které zdroje neodpovídají', async () => {
    const odpoved = JSON.stringify({
      vety: [
        { veta: 'V obou jezerech je koupání psů zakázáno.', usek: 1, citace: 'V obou jezerech je zakázáno koupat psy.' },
        { veta: 'Porušení provozního řádu může být postiženo podle zákona o přestupcích č. 250/2016 Sb.', usek: 2, citace: 'Porušení povinností stanovených tímto provozním řádem může být postiženo podle zákona č. 250/2016 Sb.' },
      ],
      nezodpovezeno: ['kdo dodržování zákazu kontroluje'],
    });
    const { api } = sestavit(
      { vystupyGenerovani: [odpoved, JSON.stringify({ vysledky: [{ cislo: 1, plyne: true }, { cislo: 2, plyne: true }] })] },
      [USEK_PSI, USEK_PRESTUPKY],
      () => 0.7,
    );
    const { data } = await poslat(api, { text: 'Smí se psi koupat v Písečácích? Hrozí za to pokuta? Kdo to kontroluje?', typ: 'dotaz' });
    if (data.vysledek !== 'odpoved') throw new Error(`Čekal jsem odpověď, přišlo ${data.vysledek}.`);
    expect(data.odpoved.nezodpovezeno).toEqual(['kdo dodržování zákazu kontroluje']);
    expect(data.odpoved.zdroje.map((z) => ({ url: z.url.split('#')[1], misto: z.misto }))).toEqual([
      { url: 'page=5', misto: 'strana 5, čl. 9' },
      { url: 'page=6', misto: 'strana 6' },
    ]);
    expect(data.odpoved.vety.map((v) => v.zdroj)).toEqual([1, 2]);
  });

  it('karta a stránka webu místo v dokumentu nemají', async () => {
    const vety = JSON.stringify({ vety: [{ veta: 'Obec připravuje bytový dům s 15 nájemními byty.', usek: 1, citace: 'nový bytový dům poblíž stávajícího DPS s 15 menšími nájemními byty' }] });
    const { api } = sestavit({ vystupyGenerovani: [vety, JSON.stringify({ vysledky: [{ cislo: 1, plyne: true }] })] }, [USEK_BYTY], () => 0.7);
    const { data } = await poslat(api, { text: 'Kolik bude nových bytů u DPS?', typ: 'dotaz' });
    if (data.vysledek !== 'odpoved') throw new Error(`Čekal jsem odpověď, přišlo ${data.vysledek}.`);
    expect(data.odpoved.zdroje[0].misto).toBe('');
    expect(data.odpoved.nezodpovezeno).toEqual([]);
  });
});
