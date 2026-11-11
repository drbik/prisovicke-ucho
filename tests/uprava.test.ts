import { describe, expect, it, vi } from 'vitest';
import { odstranitHalucinace } from '../src/lib/ai/halucinace';
import { sestavitZpravy, VERZE_PROMPTU } from '../src/lib/ai/prompt-upravy';
import { NeplatnyVystup, precistUpravu, upravitVzkaz } from '../src/lib/ai/uprava';
import { MAX_ZNAKU_NAZVU } from '../src/lib/podani/limity';
import { OBLASTI, TYPY_PODNETU } from '../src/lib/oblasti';

const PLATNA = { text: 'Upravený vzkaz.', nazev: 'Název vzkazu', oblast: 'bezpecne-trasy', typ: 'dotaz' };

function vystup(zmeny: Record<string, unknown> = {}) {
  return JSON.stringify({ ...PLATNA, ...zmeny });
}

describe('kontrola výstupu modelu (F-12, F-13, krok 3.2)', () => {
  it('přijme platný výstup', () => {
    expect(precistUpravu(vystup())).toEqual(PLATNA);
  });

  it('ořízne mezery a ignoruje další klíče', () => {
    expect(precistUpravu(vystup({ text: '  Text.  ', navic: 'x' }))).toEqual({ ...PLATNA, text: 'Text.' });
  });

  it('zvládne JSON v bloku kódu', () => {
    expect(precistUpravu(`\`\`\`json\n${vystup()}\n\`\`\``)).toEqual(PLATNA);
  });

  it.each(OBLASTI.map((o) => o.slug))('přijme oblast %s', (oblast) => {
    expect(precistUpravu(vystup({ oblast })).oblast).toBe(oblast);
  });

  it.each(Object.keys(TYPY_PODNETU))('přijme typ %s', (typ) => {
    expect(precistUpravu(vystup({ typ })).typ).toBe(typ);
  });

  it('přijme název o délce přesně na limitu', () => {
    const nazev = 'n'.repeat(MAX_ZNAKU_NAZVU);
    expect(precistUpravu(vystup({ nazev })).nazev).toBe(nazev);
  });

  it.each([
    ['prázdný výstup', ''],
    ['text bez JSON', 'Tady je upravený vzkaz.'],
    ['rozbitý JSON', '{"text": "Vzkaz'],
    ['chybějící text', vystup({ text: undefined })],
    ['prázdný text', vystup({ text: '   ' })],
    ['text jiného typu', vystup({ text: 123 })],
    ['chybějící název', vystup({ nazev: undefined })],
    ['příliš dlouhý název', vystup({ nazev: 'n'.repeat(MAX_ZNAKU_NAZVU + 1) })],
    ['neznámá oblast', vystup({ oblast: 'doprava' })],
    ['neznámý typ', vystup({ typ: 'prosba' })],
    ['typ z prototypu objektu', vystup({ typ: 'constructor' })],
  ])('odmítne: %s', (_nazev, vstup) => {
    expect(() => precistUpravu(vstup)).toThrow(NeplatnyVystup);
  });

  it('hláška chyby neobsahuje výstup modelu', () => {
    try {
      precistUpravu('{"text": "Tajný vzkaz občana"');
      expect.unreachable();
    } catch (chyba) {
      expect((chyba as Error).message).not.toContain('Tajný');
    }
  });
});

describe('pokusy o úpravu (krok 3.2)', () => {
  it('platný výstup stačí na první pokus', async () => {
    const generovat = vi.fn(async () => vystup());
    expect(await upravitVzkaz(generovat, 'vzkaz')).toEqual({ uprava: PLATNA, pokusu: 1 });
    expect(generovat).toHaveBeenCalledTimes(1);
  });

  it('po neplatném výstupu zkusí jeden nový požadavek', async () => {
    const generovat = vi.fn<() => Promise<string>>()
      .mockResolvedValueOnce('nesmysl')
      .mockResolvedValueOnce(vystup());
    expect(await upravitVzkaz(generovat, 'vzkaz')).toEqual({ uprava: PLATNA, pokusu: 2 });
    expect(generovat).toHaveBeenCalledTimes(2);
  });

  it('po druhém neplatném výstupu to vzdá', async () => {
    const generovat = vi.fn(async () => vystup({ nazev: 'n'.repeat(MAX_ZNAKU_NAZVU + 1) }));
    await expect(upravitVzkaz(generovat, 'vzkaz')).rejects.toThrow(NeplatnyVystup);
    expect(generovat).toHaveBeenCalledTimes(2);
  });

  it('chyba služby se neopakuje', async () => {
    const generovat = vi.fn(async () => { throw new Error('Model nedostupný'); });
    await expect(upravitVzkaz(generovat, 'vzkaz')).rejects.toThrow('Model nedostupný');
    expect(generovat).toHaveBeenCalledTimes(1);
  });
});

describe('prompt úpravy', () => {
  const [pokyny, vzkaz] = sestavitZpravy('Text občana');

  it('má číslo verze', () => {
    expect(VERZE_PROMPTU).toBeGreaterThan(0);
  });

  it('nabízí všech šest oblastí a čtyři typy', () => {
    for (const { slug } of OBLASTI) expect(pokyny.content).toContain(slug);
    for (const typ of Object.keys(TYPY_PODNETU)) expect(pokyny.content).toContain(typ);
  });

  it('text vzkazu je oddělený od pokynů', () => {
    expect(pokyny.role).toBe('system');
    expect(pokyny.content).not.toContain('Text občana');
    expect(vzkaz).toEqual({ role: 'user', content: '<vzkaz>\nText občana\n</vzkaz>' });
  });
});

describe('halucinace Whisperu v tichu', () => {
  it('odstraní věty z titulků kdekoli v přepisu', () => {
    expect(odstranitHalucinace('Titulky vytvořil JohnyX.')).toEqual({ text: '', odstraneno: 1 });
    expect(odstranitHalucinace('Titulky: Jan Novák')).toEqual({ text: '', odstraneno: 1 });
    expect(odstranitHalucinace('Přeložil Jan Novák. Subtitles by the Amara.org community')).toEqual({ text: '', odstraneno: 2 });
    expect(odstranitHalucinace('Chci lavičku u hřiště. Titulky vytvořil JohnyX.')).toEqual({ text: 'Chci lavičku u hřiště.', odstraneno: 1 });
  });

  it('adresa webu nebo poděkování jsou halucinace jen jako celý přepis', () => {
    expect(odstranitHalucinace('www.hradeckralove.org')).toEqual({ text: '', odstraneno: 1 });
    expect(odstranitHalucinace('Děkuji za pozornost.')).toEqual({ text: '', odstraneno: 1 });
    expect(odstranitHalucinace('Děkujeme vám za sledování!')).toEqual({ text: '', odstraneno: 1 });
    expect(odstranitHalucinace('Děkuji, že jste se dívali.')).toEqual({ text: '', odstraneno: 1 });
    // Skutečná zdvořilost na konci vzkazu zůstane.
    expect(odstranitHalucinace('Chci se zeptat na cyklostezku. Děkuji za pozornost.')).toEqual({ text: 'Chci se zeptat na cyklostezku. Děkuji za pozornost.', odstraneno: 0 });
    expect(odstranitHalucinace('Adresa je www.prisovice.cz a tam to nenajdu.')).toEqual({ text: 'Adresa je www.prisovice.cz a tam to nenajdu.', odstraneno: 0 });
  });

  it('běžný vzkaz a prázdný přepis nechá být', () => {
    expect(odstranitHalucinace('Dobrý den, kdy bude hotová cyklostezka?')).toEqual({ text: 'Dobrý den, kdy bude hotová cyklostezka?', odstraneno: 0 });
    expect(odstranitHalucinace('')).toEqual({ text: '', odstraneno: 0 });
  });
});
