// Sada pro sdružování vzkazů do témat (fáze B, F-33 až F-37). Hlídá jen stavbu sady, vyhodnocení jde přes Workers AI.
import { describe, expect, it } from 'vitest';
import { jeTyp } from '../src/lib/oblasti';
import { UKAZKOVA_TEMATA } from '../src/lib/temata/temata';
import sada from './data/sada-temat.json';

type Vztah = 'totez' | 'poddotaz' | 'doplneni' | 'jine';
interface Vzkaz { id: string; text: string; vztahy: Record<string, Vztah>; zakladatel?: boolean; nove?: string }
interface Skupina { id: string; tema: string; typ: string; vzkazy: Vzkaz[] }

const skupiny = sada.skupiny as Skupina[];
const ukazky = new Map(UKAZKOVA_TEMATA.map((t) => [t.id, t]));
const typTematu = new Map<string, string>(skupiny.map((s) => [s.tema, s.typ]));
for (const t of UKAZKOVA_TEMATA) typTematu.set(t.id, t.typ);

describe('sada pro sdružování', () => {
  it('má 20 až 30 skupin a jedinečná id', () => {
    expect(skupiny.length).toBeGreaterThanOrEqual(20);
    expect(skupiny.length).toBeLessThanOrEqual(30);
    const id = skupiny.flatMap((s) => [s.id, ...s.vzkazy.map((v) => v.id)]);
    expect(new Set(id).size).toBe(id.length);
    for (const s of skupiny) for (const v of s.vzkazy) expect(v.id.startsWith(`${s.id}-`)).toBe(true);
  });

  it('téma skupiny je ukázka stejného typu, nebo nové téma s jedním zakladatelem na začátku', () => {
    for (const s of skupiny) {
      expect(jeTyp(s.typ)).toBe(true);
      const zakladatele = s.vzkazy.filter((v) => v.zakladatel);
      if (s.tema === s.id) {
        expect(zakladatele.map((v) => v.id)).toEqual([s.vzkazy[0].id]);
        expect(s.vzkazy[0].vztahy).toEqual({});
      } else {
        expect(ukazky.get(s.tema)?.typ).toBe(s.typ);
        expect(zakladatele).toEqual([]);
      }
    }
  });

  it('názvy témat souhlasí s ukázkami a každé téma ze vztahů je v seznamu', () => {
    const temata = sada.temata as Record<string, string>;
    for (const [id, nazev] of Object.entries(temata)) {
      if (ukazky.has(id)) expect(nazev).toBe(ukazky.get(id)!.nazev);
      else expect(skupiny.some((s) => s.id === id && s.tema === id)).toBe(true);
    }
    for (const s of skupiny) for (const v of s.vzkazy) for (const tema of Object.keys(v.vztahy)) expect(temata[tema]).toBeTruthy();
  });

  it('vztahy sedí k typům: poddotaz jen u dotazu, doplnění jen u ostatních, spojit jde jen stejný typ', () => {
    for (const s of skupiny) {
      for (const v of s.vzkazy) {
        if (!v.zakladatel) expect(v.vztahy[s.tema]).toBeDefined();
        for (const [tema, vztah] of Object.entries(v.vztahy)) {
          expect(['totez', 'poddotaz', 'doplneni', 'jine']).toContain(vztah);
          if (vztah === 'poddotaz') expect(s.typ).toBe('dotaz');
          if (vztah === 'doplneni') expect(s.typ).not.toBe('dotaz');
          if (vztah !== 'jine') expect(typTematu.get(tema)).toBe(s.typ);
          if (vztah === 'poddotaz' || vztah === 'doplneni') expect(v.nove).toBeTruthy();
        }
      }
    }
  });

  it('obsahuje skutečný dotaz na Sokolovnu a záludné páry u Sokolovny a Písečáků', () => {
    const vzkazy = skupiny.flatMap((s) => s.vzkazy);
    expect(vzkazy.find((v) => v.id === 'G01-1')?.vztahy).toEqual({ 'ukazka-03': 'poddotaz', 'ukazka-17': 'jine', 'ukazka-29': 'jine' });
    const jine = (tema: string) => vzkazy.filter((v) => v.vztahy[tema] === 'jine').length;
    expect(jine('ukazka-03')).toBeGreaterThanOrEqual(2);
    expect(jine('ukazka-02')).toBeGreaterThanOrEqual(2);
  });
});
