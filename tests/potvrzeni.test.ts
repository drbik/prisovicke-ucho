import { describe, expect, it } from 'vitest';
import { MAX_ZNAKU_NAZVU, MAX_ZNAKU_UPRAVY, MIN_ZNAKU_TEXTU } from '../src/lib/podani/limity';
import { overitPotvrzeni, zmenenaPole, type PotvrzenyVzkaz } from '../src/lib/podani/potvrzeni';

const navrh: PotvrzenyVzkaz = {
  text: 'Prosím o opravu chodníku k Písečákům.',
  nazev: 'Oprava chodníku k Písečákům',
  typ: 'navrh',
  oblast: 'bezpecne-trasy',
};

describe('potvrzení vzkazu autorem (F-14)', () => {
  it('přijme návrh AI beze změny', () => {
    expect(overitPotvrzeni(navrh)).toEqual({ platne: true, vzkaz: navrh });
  });

  it('ořízne mezery na okrajích textu i názvu', () => {
    const overeni = overitPotvrzeni({ ...navrh, text: `  ${navrh.text}\n\n`, nazev: ` ${navrh.nazev} ` });
    expect(overeni).toEqual({ platne: true, vzkaz: navrh });
  });

  it('přijme text i název na hranici limitu', () => {
    const overeni = overitPotvrzeni({
      ...navrh,
      text: 't'.repeat(MAX_ZNAKU_UPRAVY),
      nazev: 'n'.repeat(MAX_ZNAKU_NAZVU),
    });
    expect(overeni.platne).toBe(true);
  });

  it.each([
    ['krátký text', { text: 't'.repeat(MIN_ZNAKU_TEXTU - 1) }, 'text'],
    ['text jen z mezer', { text: ' '.repeat(50) }, 'text'],
    ['dlouhý text', { text: 't'.repeat(MAX_ZNAKU_UPRAVY + 1) }, 'text'],
    ['prázdný název', { nazev: '   ' }, 'nazev'],
    ['dlouhý název', { nazev: 'n'.repeat(MAX_ZNAKU_NAZVU + 1) }, 'nazev'],
    ['neznámý typ', { typ: 'hlasovani' }, 'typ'],
    ['zděděná vlastnost jako typ', { typ: 'toString' }, 'typ'],
    ['neznámá oblast', { oblast: 'kosmodrom' }, 'oblast'],
  ])('odmítne %s a řekne u kterého pole', (_popis, zmena, pole) => {
    const overeni = overitPotvrzeni({ ...navrh, ...zmena });
    expect(overeni.platne).toBe(false);
    if (!overeni.platne) expect(Object.keys(overeni.chyby)).toEqual([pole]);
  });

  it('vrátí chyby všech špatných polí najednou', () => {
    const overeni = overitPotvrzeni({ text: '', nazev: '', typ: '', oblast: '' });
    expect(overeni.platne).toBe(false);
    if (!overeni.platne) expect(Object.keys(overeni.chyby).sort()).toEqual(['nazev', 'oblast', 'text', 'typ']);
  });

  it('pozná, která pole autor změnil', () => {
    expect(zmenenaPole(navrh, navrh)).toEqual([]);
    expect(zmenenaPole(navrh, { ...navrh, text: `${navrh.text} Děkuji.`, oblast: 'ostatni' })).toEqual(['text', 'oblast']);
  });
});
