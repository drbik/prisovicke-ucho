import { describe, expect, it, vi } from 'vitest';
import { vytvorFalesneAi } from '../src/lib/ai/falesna';
import { vytvorApi } from '../src/lib/api/aplikace';
import { vytvorFalesnyIndex } from '../src/lib/odpovedi/falesny';
import { dotazProFulltext } from '../src/lib/odpovedi/hledani';
import { cislaVTextu, overitKodem, precistOdpoved, ZamitnutaOdpoved } from '../src/lib/odpovedi/overeni';
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
    }]);
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
  it('z jednoho dokumentu vezme nejvýš dva úseky', async () => {
    const useky = [0, 1, 2, 3].map((i) => usek(ZAPIS, `zapis-${i}`, `Úsek ${i} o pronájmu sokolovny.`));
    const { api, generovani } = sestavit({ vystupyGenerovani: [JSON.stringify({ vety: [] })] }, [...useky, USEK_BYTY], (u) => (u.dokument.id === 'zapis' ? 0.9 : 0.5));
    await poslat(api);
    const uryvky = generovani[0][1].content;
    expect(uryvky.match(/Úsek \d/g)).toHaveLength(2);
    expect(uryvky).toContain('bytový dům');
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
