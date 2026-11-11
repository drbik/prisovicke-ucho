import { describe, expect, it } from 'vitest';
import { urcitDruhChyby, vybratFormat } from '../src/lib/nahravani/format';
import { spocitatHlasitost } from '../src/lib/nahravani/hlasitost';

describe('výběr formátu', () => {
  it('na Chromiu vezme WebM/Opus', () => {
    expect(vybratFormat(() => true)).toBe('audio/webm;codecs=opus');
  });

  it('bez WebM vezme MP4', () => {
    expect(vybratFormat((typ) => typ === 'audio/mp4')).toBe('audio/mp4');
  });

  it('když prohlížeč nic neumí, nechá výběr na něm', () => {
    expect(vybratFormat(() => false)).toBeUndefined();
  });
});

describe('chyby mikrofonu', () => {
  it.each([
    ['NotAllowedError', 'zakazano'],
    ['SecurityError', 'zakazano'],
    ['NotFoundError', 'chybi'],
    ['NotReadableError', 'obsazeno'],
    ['TypeError', 'jina'],
  ])('%s je %s', (nazev, druh) => {
    expect(urcitDruhChyby(nazev)).toBe(druh);
  });
});

describe('hlasitost', () => {
  it('ticho je nula', () => {
    expect(spocitatHlasitost(new Uint8Array(32).fill(128))).toBe(0);
  });

  it('plný rozkmit nepřekročí jedničku', () => {
    expect(spocitatHlasitost(Uint8Array.from({ length: 32 }, (_, i) => (i % 2 ? 0 : 255)))).toBe(1);
  });

  it('prázdný vstup je nula', () => {
    expect(spocitatHlasitost(new Uint8Array())).toBe(0);
  });
});
