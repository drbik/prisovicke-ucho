import { describe, expect, it } from 'vitest';
import { kmenyDotazu, odpovidaHledani, proHledani } from '../src/lib/temata/normalizace';
import { UKAZKOVA_TEMATA, overitUkazky, rozdelitTemata, textProHledani } from '../src/lib/temata/temata';
import ukazky from '../src/lib/temata/ukazky.json';

const kopie = () => structuredClone(ukazky.temata) as Record<string, unknown>[];

describe('ukázková témata (rozhodnutí z 9. 11. 2026)', () => {
  it('soubor s ukázkami projde kontrolou a dělí se na zodpovězená a čekající', () => {
    const { zodpovezena, cekajici } = rozdelitTemata(UKAZKOVA_TEMATA);
    expect(zodpovezena.length).toBeGreaterThanOrEqual(10);
    expect(cekajici.length).toBeGreaterThanOrEqual(5);
    expect(zodpovezena.length + cekajici.length).toBe(UKAZKOVA_TEMATA.length);
    expect(new Set(UKAZKOVA_TEMATA.map((t) => t.id)).size).toBe(UKAZKOVA_TEMATA.length);
  });

  it('každá odpověď má věty s citací ze zdroje na webu obce nebo Nezávislých', () => {
    for (const tema of rozdelitTemata(UKAZKOVA_TEMATA).zodpovezena) {
      expect(tema.typ).toBe('dotaz');
      const cisla = tema.odpoved!.zdroje.map((z) => z.cislo);
      for (const veta of tema.odpoved!.vety) expect(cisla).toContain(veta.zdroj);
      for (const zdroj of tema.odpoved!.zdroje) {
        expect(zdroj.url).toMatch(/^https:\/\/(prisovice\.cz|nezavisli-prisovice\.cz)\//);
        expect(zdroj.uryvek.length).toBeGreaterThan(10);
        expect(zdroj.datum).toMatch(/\d{4}/);
        expect(zdroj.oznaceni).toBe(zdroj.web === 'prisovice.cz' ? 'Odpověď z webu obce' : 'Podle webu Nezávislých pro Příšovice');
      }
    }
  });

  it('čekající témata odpověď nemají a pochvala mezi ukázkami není', () => {
    for (const tema of rozdelitTemata(UKAZKOVA_TEMATA).cekajici) expect(tema.odpoved).toBeUndefined();
    expect(UKAZKOVA_TEMATA.some((t) => t.typ === 'pochvala')).toBe(false);
  });

  // Pokyn z 11. 11. 2026: čekat smí jen dotaz, ke kterému index nic nemá. Proti indexu to hlídá
  // nastroje/index/kontrola-ukazek.ts, tady se kontroluje, že každý čekající dotaz hlídané vzory má.
  it('každý čekající dotaz má platné hlídané vzory, ostatní témata žádné', () => {
    for (const tema of UKAZKOVA_TEMATA) {
      if (tema.stav === 'ceka-na-spravce' && tema.typ === 'dotaz') {
        expect(tema.hlidat?.length).toBeGreaterThan(0);
        for (const vzor of tema.hlidat!) expect(() => new RegExp(vzor, 'u')).not.toThrow();
        // Vzor se hledá v textu bez diakritiky a velkých písmen.
        expect(tema.hlidat!.join(' ')).toBe(tema.hlidat!.join(' ').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase());
      } else {
        expect(tema.hlidat).toBeUndefined();
      }
    }

    const bezVzoru = kopie();
    delete bezVzoru.find((t) => t.stav === 'ceka-na-spravce' && t.typ === 'dotaz')!.hlidat;
    expect(() => overitUkazky(bezVzoru)).toThrow(/nemá hlídané vzory/);

    const spatnyVzor = kopie();
    spatnyVzor.find((t) => t.stav === 'ceka-na-spravce' && t.typ === 'dotaz')!.hlidat = ['(bankomat'];
    expect(() => overitUkazky(spatnyVzor)).toThrow(/není platný/);

    const uZodpovezeneho = kopie();
    uZodpovezeneho[0].hlidat = ['lekarn'];
    expect(() => overitUkazky(uZodpovezeneho)).toThrow(/jen k čekajícímu dotazu/);
  });

  it('odmítne vymyšleného autora, hlasy nebo datum podání', () => {
    for (const pole of ['autor', 'hlasy', 'palceNahoru', 'podano']) {
      const data = kopie();
      data[0][pole] = pole === 'autor' ? 'Jan Novák' : 12;
      expect(() => overitUkazky(data)).toThrow(/neznámá pole/);
    }
  });

  it('odmítne odpověď bez citace, zdroj z cizího webu a odpověď u čekajícího tématu', () => {
    const bezCitace = kopie();
    (bezCitace[0].odpoved as { zdroje: { uryvek: string }[] }).zdroje[0].uryvek = '';
    expect(() => overitUkazky(bezCitace)).toThrow(/citaci/);

    const ciziWeb = kopie();
    (ciziWeb[0].odpoved as { zdroje: { url: string }[] }).zdroje[0].url = 'https://example.com/clanek';
    expect(() => overitUkazky(ciziWeb)).toThrow(/povoleného webu/);

    const vetaBezZdroje = kopie();
    (vetaBezZdroje[0].odpoved as { vety: { zdroj: number }[] }).vety[0].zdroj = 99;
    expect(() => overitUkazky(vetaBezZdroje)).toThrow(/zdroj, který chybí/);

    const cekajici = kopie();
    const prvniCekajici = cekajici.find((t) => t.stav === 'ceka-na-spravce')!;
    prvniCekajici.odpoved = cekajici[0].odpoved;
    expect(() => overitUkazky(cekajici)).toThrow(/nesmí mít odpověď/);
  });

  it('hledá bez diakritiky v názvu, dotazu i odpovědi', () => {
    expect(proHledani('  Kolik stojí „pronájem“ sálu?\n')).toBe('kolik stoji pronajem salu');
    const lekarna = UKAZKOVA_TEMATA.find((t) => t.nazev.includes('lékárny'))!;
    const text = textProHledani(lekarna);
    expect(text).toContain('lekarny');
    expect(text).toContain('ctvrtek');
    // Čas z odpovědi: „od 07.30 do 12.00“.
    expect(text).toContain('07 30');
  });

  it('hledá podle začátků slov, aby našlo i jiný pád', () => {
    expect(kmenyDotazu('Lékárna ve čtvrtek 2027')).toEqual(['lekar', 've', 'ctvrt', '2027']);
    expect(kmenyDotazu('  ')).toEqual([]);
    const najde = (dotaz: string) => UKAZKOVA_TEMATA.filter((t) => odpovidaHledani(textProHledani(t), kmenyDotazu(dotaz))).map((t) => t.nazev);
    expect(najde('lékárna')).toEqual(['Otevírací doba lékárny na zdravotním středisku']);
    expect(najde('defibrilátory nejbližší')).toEqual(['Nejbližší defibrilátor v obci']);
    expect(najde('sokolovna')).toEqual(expect.arrayContaining(['Pronájem sálu v Sokolovně', 'Hospoda v Sokolovně', 'Pítko pro cyklisty u Sokolovny']));
    // Prázdné hledání ukáže všechno, slovo uprostřed jiného slova se nepočítá.
    expect(najde('')).toHaveLength(UKAZKOVA_TEMATA.length);
    expect(odpovidaHledani('nova okna v kapli', ['kna'])).toBe(false);
    expect(najde('xyzneni')).toEqual([]);
  });
});
