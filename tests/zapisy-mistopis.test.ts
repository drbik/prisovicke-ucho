import { describe, expect, it } from 'vitest';
import { vytvorFalesneAi } from '../src/lib/ai/falesna';
import { vytvorFalesnyIndex } from '../src/lib/odpovedi/falesny';
import { dotazProFulltext } from '../src/lib/odpovedi/hledani';
import { blokMistnichNazvu, mistniNazvyVTextech, rozsireniHledani } from '../src/lib/odpovedi/mistopis';
import { odpovedetNaDotaz } from '../src/lib/odpovedi/odpoved';
import { zpravyOdpovedi, zpravyOvereni } from '../src/lib/odpovedi/prompt-odpovedi';
import type { NalezenyUsek, ZdrojovyDokument } from '../src/lib/odpovedi/typy';
import { datumZasedani, nejnovejsiZapis, rozpoznatPosledniZapis, vybratProSouhrn } from '../src/lib/odpovedi/zapisy';
import { hlavickaUseku } from '../src/lib/odpovedi/zdroje';

function dokument(id: string, nazev: string): ZdrojovyDokument {
  return {
    id, url: `https://prisovice.cz/wp-content/uploads/2026/10/${id}.pdf`, nazev, web: 'prisovice.cz', typ: 'pdf',
    zverejneno: '2026-10-22', zmeneno: null, mesicNahrani: '2026-10', otisk: id, stazeno: '2026-11-14T08:00:00.000Z', nadrazenyUrl: null,
  };
}
function usek(d: ZdrojovyDokument, poradi: number, text: string): NalezenyUsek {
  return { id: `${d.id}-${poradi}`, dokumentId: d.id, poradi, strana: 1, hlavicka: hlavickaUseku(d, 1), text, dokument: d };
}

const RADA_STARA = dokument('rada-stara', 'Zápis č. 14/2026 z jednání rady obce konaného dne 07.10.2026');
const RADA_NOVA = dokument('rada-nova', 'Zápis č. 15/2026 z jednání rady obce konaného dne 21.10.2026');
const ZASTUPITELSTVO = dokument('zo', 'Zápis č. 5/2026 z ustavujícího veřejného zasedání zastupitelstva obce konaného dne 04.11.2026');

describe('dotaz na poslední zasedání (14. 11. 2026)', () => {
  it('pozná dotaz na poslední zasedání a orgán', () => {
    expect(rozpoznatPosledniZapis('Co se řešilo na posledním zasedání Rady a zastupitelstva?')).toEqual(['rada', 'zastupitelstvo']);
    expect(rozpoznatPosledniZapis('Co bylo na poslední schůzi rady?')).toEqual(['rada']);
    expect(rozpoznatPosledniZapis('Co řešilo naposledy zastupitelstvo na jednání?')).toEqual(['zastupitelstvo']);
    expect(rozpoznatPosledniZapis('Kde najdu nejnovější zápis?')).toEqual(['rada', 'zastupitelstvo']);
  });

  it('obyčejný dotaz za dotaz na poslední zasedání nepovažuje', () => {
    expect(rozpoznatPosledniZapis('Kolik stojí pronájem sálu v Sokolovně?')).toBeNull();
    expect(rozpoznatPosledniZapis('Kdy bylo zasedání rady o stravném?')).toBeNull();
    expect(rozpoznatPosledniZapis('Kdy bylo poslední rozsvícení stromku?')).toBeNull();
  });

  it('datum zasedání vezme z názvu zápisu a vybere nejnovější', () => {
    expect(datumZasedani(RADA_NOVA.nazev)).toBe('2026-10-21');
    expect(datumZasedani('Zápis ze schůze rady obce konané dne 10.01.2024')).toBe('2024-01-10');
    expect(datumZasedani('Pozvánka na zasedání')).toBeNull();
    expect(nejnovejsiZapis([RADA_STARA, RADA_NOVA])).toBe(RADA_NOVA);
  });

  it('souhrn se opře o nejnovější zápis rady a zastupitelstva, ne o starší', async () => {
    const useky = [
      usek(RADA_STARA, 0, 'Program: Schválení rozpočtu. Kontrola usnesení.'),
      usek(RADA_NOVA, 0, 'Program: Pronájem kadeřnictví v DPS. Schválení cenové nabídky na osvětlení.'),
      usek(ZASTUPITELSTVO, 0, 'Program: Složení slibu. Volba starosty a místostarosty.'),
    ];
    const vystup = JSON.stringify({ vety: [{ veta: 'Rada projednala pronájem kadeřnictví v DPS.', usek: 1, citace: 'Pronájem kadeřnictví v DPS' }, { veta: 'Zastupitelstvo volilo starostu a místostarostu.', usek: 2, citace: 'Volba starosty a místostarosty' }] });
    const { ai, generovani } = vytvorFalesneAi({ vystupyGenerovani: [vystup, JSON.stringify({ vysledky: [{ cislo: 1, plyne: true }, { cislo: 2, plyne: true }] })] });
    const index = vytvorFalesnyIndex(useky, () => 0.1);
    const v = await odpovedetNaDotaz('Co se řešilo na posledním zasedání Rady a zastupitelstva?', { ai, index });
    expect(v.vysledek).toBe('odpoved');
    const vstup = String(generovani[0][1].content);
    expect(vstup).toContain('kadeřnictví');
    expect(vstup).toContain('Volba starosty');
    expect(vstup).not.toContain('Schválení rozpočtu');
  });
});

describe('souhrn zasedání z usnesení (14. 11. 2026)', () => {
  const zapis = [
    usek(ZASTUPITELSTVO, 0, 'Zápis č. 5/2026\nProgram: 1) Zahájení 2) Složení slibu 3) Volba starosty'),
    usek(ZASTUPITELSTVO, 1, 'Usnesení UZ č. 57/2026 - Zastupitelstvo obce volí starostou Františka Drbohlava.\nHlasování\nPro: 15 | Proti: 0'),
    usek(ZASTUPITELSTVO, 2, 'Pro: 15 | Proti: 0\nUsnesení UZ č. 58/2026 - Zastupitelstvo obce volí místostarostou Jana Koška.\nHlasování\nUsnesení UZ č. 59/2026 – Zastupitelstvo obce schvaluje'),
    usek(ZASTUPITELSTVO, 3, 'Usnesení UZ č. 59/2026 – Zastupitelstvo obce schvaluje časový plán jednání.\nHlasování'),
  ];

  it('vezme začátek zápisu a přehled všech usnesení, každé jednou a bez hlasování', () => {
    const [prvni, prehled] = vybratProSouhrn([...zapis].reverse());
    expect(prvni.id).toBe('zo-0');
    expect(prehled.strana).toBeNull();
    expect(prehled.text).toContain('volí starostou Františka Drbohlava.');
    expect(prehled.text).toContain('volí místostarostou Jana Koška.');
    expect(prehled.text).toContain('schvaluje časový plán jednání.');
    expect(prehled.text).not.toContain('Hlasování');
    expect(prehled.text.match(/UZ č\. 59\/2026/g)).toHaveLength(1);
  });

  it('zápis bez usnesení dá první úseky', () => {
    expect(vybratProSouhrn([zapis[0]])).toEqual([zapis[0]]);
    expect(vybratProSouhrn([])).toEqual([]);
  });

  it('neověřený bod souhrnu se vynechá a ostatní zůstanou', async () => {
    const vystup = JSON.stringify({ vety: [
      { veta: 'Zastupitelstvo obce na zasedání 4. 11. 2026 zvolilo starostou Františka Drbohlava.', usek: 2, citace: 'Zastupitelstvo obce volí starostou Františka Drbohlava' },
      { veta: 'Zvolilo místostarostou Jana Koška.', usek: 2, citace: 'Zastupitelstvo obce volí místostarostou Jana Koška' },
      { veta: 'Schválilo nový rozpočet.', usek: 2, citace: 'Zastupitelstvo obce schvaluje časový plán jednání' },
    ] });
    const overeni = JSON.stringify({ vysledky: [{ cislo: 1, plyne: true }, { cislo: 2, plyne: true }, { cislo: 3, plyne: false }] });
    const { ai } = vytvorFalesneAi({ vystupyGenerovani: [vystup, overeni] });
    const v = await odpovedetNaDotaz('Co se řešilo na posledním zasedání zastupitelstva?', { ai, index: vytvorFalesnyIndex(zapis, () => 0.1) });
    if (v.vysledek !== 'odpoved') throw new Error(`Čekal jsem odpověď, přišlo ${v.vysledek}.`);
    expect(v.odpoved.vety.map((x) => x.text)).toEqual(['Zastupitelstvo obce na zasedání 4. 11. 2026 zvolilo starostou Františka Drbohlava.', 'Zvolilo místostarostou Jana Koška.']);
  });
});

describe('místní názvy (14. 11. 2026)', () => {
  it('pozná Cecilku v ohnutých tvarech a bez diakritiky', () => {
    expect(mistniNazvyVTextech('Co je nového na Cecilce?')).toHaveLength(1);
    expect(mistniNazvyVTextech('lokalita „Cecilka“')).toHaveLength(1);
    expect(mistniNazvyVTextech('cyklostezka přes Cecilku')).toHaveLength(1);
    expect(mistniNazvyVTextech('Cecílie je hezké jméno')).toHaveLength(0);
    expect(mistniNazvyVTextech('Kolik stojí pronájem sálu?')).toHaveLength(0);
  });

  it('výklad se přidá k dotazu a k ověření jen tehdy, když se místo objeví', () => {
    const d = dokument('x', 'Zápis');
    const sCecilkou = zpravyOdpovedi('Kdy se postaví cyklostezka na Cecilce?', [usek(d, 0, 'Text o stezce.')]);
    expect(String(sCecilkou[1].content)).toContain('<mistni_nazvy>');
    expect(String(sCecilkou[1].content)).toContain('ne jméno osoby');
    const bez = zpravyOdpovedi('Kolik stojí sál?', [usek(d, 0, 'Cena sálu 4 000 Kč.')]);
    expect(String(bez[1].content)).not.toContain('<mistni_nazvy>');
    expect(String(zpravyOvereni('Co je na Cecilce?', [{ veta: 'a', citace: 'b', zdroj: 'c' }])[1].content)).toContain('<mistni_nazvy>');
    expect(blokMistnichNazvu('nic')).toBe('');
  });

  it('místo v dotazu přidá do fulltextu slova, kterými ho zdroje vyjadřují', () => {
    expect(rozsireniHledani('Cyklostezka na Cecilce')).toBe('Přepeře Greenway E102');
    // SO E.102 je cyklostezka přes Cecilku (potvrdil Tomáš 14. 11. 2026), dotaz na ni dostane i slovo Cecilka.
    expect(mistniNazvyVTextech('smlouva na SO E.102')).toHaveLength(1);
    expect(mistniNazvyVTextech('Greenway Jizera SO E102')).toHaveLength(1);
    expect(rozsireniHledani('smlouva na SO E.102')).toBe('Cecilka Přepeře');
    expect(dotazProFulltext('Cyklostezka na Cecilce Přepeře', 14)).toContain('"prepe"*');
    expect(rozsireniHledani('Cena sálu')).toBe('');
  });
});
