import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { precistKarty } from '../nastroje/index/karty';
import { jeRizeniSoukromeOsoby } from '../nastroje/index/nastaveni';
import { odstranitOpakovane, spojitRadky } from '../nastroje/index/pdf';
import { jeCitelnyOcr, textOcr, textWordu } from '../nastroje/index/prevod';
import { precistRobots } from '../nastroje/index/sit';
import { formatPrilohy, souborPrilohy } from '../nastroje/index/spolecne';
import { DELKA_USEKU, PREKRYV, prekryv, rozdelitNaMisto, rozdelitNaUseky } from '../nastroje/index/useky';
import { naIsoDatum, precistSitemapu, rozebratClanek, typSitemapy } from '../nastroje/index/wordpress';

const CLANEK = `<html><body><nav>Menu Úvod Kontakty</nav>
<article id="post-20383" class="art-post post-20383 post type-post category-aktuality">
  <div class="art-postmetadataheader"><h1 class="art-postheader entry-title">Vlaková&nbsp;výluka</h1>
  <span class="entry-date updated" title="12:50">07.10.2026</span></div>
  <div class="art-postcontent clearfix">
    <p>Od 3.10 &#8211; 27.11 je výluka.<br />Autobusy staví na sídlišti.</p>
    <ul><li>první bod</li><li>druhý bod</li></ul>
    <table><tr><td>Po</td><td>7.00 – 11.00</td></tr></table>
    <p><a href="/wp-content/uploads/2026/10/vyluka.pdf">Jízdní řád</a> <a href="https://prisovice.cz/wp-content/uploads/2026/10/vyluka.pdf#page=2">znovu</a></p>
    <script>alert(1)</script>
  </div>
</article>
<footer>Starosta Ing. František Drbohlav</footer></body></html>`;

describe('stránky webu obce (8.4)', () => {
  it('vezme jen obsah článku, bez menu, skriptů a patičky', () => {
    const clanek = rozebratClanek(CLANEK, 'https://prisovice.cz/2026/10/vlakova-vyluka/');
    expect(clanek).toMatchObject({ nazev: 'Vlaková výluka', datum: '2026-10-07', kategorie: ['aktuality'] });
    expect(clanek?.text).toBe('Od 3.10 – 27.11 je výluka.\nAutobusy staví na sídlišti.\n\n- první bod\n\n- druhý bod\n\nPo | 7.00 – 11.00\n\nJízdní řád znovu');
    expect(clanek?.text).not.toContain('Drbohlav');
    expect(clanek?.text).not.toContain('alert');
    expect(clanek?.dokumenty).toEqual([{ url: 'https://prisovice.cz/wp-content/uploads/2026/10/vyluka.pdf', text: 'Jízdní řád' }]);
  });

  it('přečte sitemapu a její druh', () => {
    const xml = '<urlset><url><loc>https://prisovice.cz/a/?x=1&amp;y=2</loc><lastmod>2026-01-02T10:00:00+01:00</lastmod></url><url><loc>https://prisovice.cz/b/</loc></url></urlset>';
    expect(precistSitemapu(xml).adresy).toEqual([
      { url: 'https://prisovice.cz/a/?x=1&y=2', lastmod: '2026-01-02T10:00:00+01:00' },
      { url: 'https://prisovice.cz/b/', lastmod: null },
    ]);
    expect(typSitemapy('https://prisovice.cz/wp-sitemap-posts-urednideska-1.xml')).toBe('uredni-deska');
    expect(typSitemapy('https://prisovice.cz/wp-sitemap-taxonomies-category-1.xml')).toBeNull();
    expect(naIsoDatum('Publikováno 7.1.2026')).toBe('2026-01-07');
  });

  it('robots.txt: zakázaná cesta, povolená výjimka a ostatní povolené', () => {
    const jePovoleno = precistRobots('User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\n');
    expect(jePovoleno('https://prisovice.cz/wp-admin/edit.php')).toBe(false);
    expect(jePovoleno('https://prisovice.cz/wp-admin/admin-ajax.php')).toBe(true);
    expect(jePovoleno('https://prisovice.cz/aktuality/')).toBe(true);
  });

  it('pozná řízení soukromých osob na úřední desce', () => {
    expect(jeRizeniSoukromeOsoby('Dražební vyhláška č.j. 120 EX 242', ['ostatni-dokumenty'])).toBe(true);
    expect(jeRizeniSoukromeOsoby('Dělení pozemků parc. č. 488/1', ['stavebni-urad'])).toBe(true);
    expect(jeRizeniSoukromeOsoby('Veřejná vyhláška – povolení stavby Záhumení vodovod a kanalizace', ['ostatni-dokumenty'])).toBe(false);
    expect(jeRizeniSoukromeOsoby('Zápis č. 14/2025 ze schůze rady obce', ['zapisy-ro'])).toBe(false);
  });
});

describe('karty webu Nezávislých (8.4)', () => {
  it('vezme text karty bez dokumentů a navigace', () => {
    const html = `<article id="dostupne-bydleni" class="story-card" data-story-card data-project="dostupne-bydleni"><div class="story-card__body">
      <p class="story-card__eyebrow">15 bytů</p><h2 class="story-card__title">Patnáct dostupných bytů</h2>
      <p class="project-fact"><span>Příprava a plán</span><strong>2026–2027</strong></p>
      <p class="story-card__detail">Stavět chceme v roce 2027.</p>
      <section class="project-documents"><h3>Dokumenty k projektu</h3></section>
      <a class="direction" href="#x">Co připravujeme</a></div></article>`;
    expect(precistKarty(html)).toEqual([{
      slug: 'dostupne-bydleni',
      nazev: 'Patnáct dostupných bytů',
      text: '15 bytů\n\nPatnáct dostupných bytů\n\nPříprava a plán 2026–2027\n\nStavět chceme v roce 2027.',
    }]);
  });
});

describe('PDF (8.4)', () => {
  it('spojí slovo rozdělené na konci řádku jen před malým písmenem', () => {
    expect(spojitRadky(['Rada obce schva-', 'luje rozpočet', 'Česko-', 'Slovensko'])).toBe('Rada obce schvaluje rozpočet\nČesko-\nSlovensko');
  });

  it('odstraní záhlaví a zápatí, která se opakují na většině stran, obsah nechá', () => {
    const obsah = ['', 'Rada schvaluje program.', 'Rada bere na vědomí kontrolu.', 'Rada souhlasí s pronájmem.'];
    const strana = (n: number, konec: string) => ({
      strana: n,
      text: `Obec Příšovice\nZápis ze dne 04.09.2025\nStrana ${n} (celkem 3)\n\n${obsah[n]}\n${konec}\nwww.prisovice.cz | ${n}`,
    });
    const vysledek = odstranitOpakovane([strana(1, 'Usnesení přijato.'), strana(2, 'Usnesení přijato.'), strana(3, 'Podpis starosty')]);
    expect(vysledek.map((s) => s.text)).toEqual([
      'Rada schvaluje program.\nUsnesení přijato.',
      'Rada bere na vědomí kontrolu.\nUsnesení přijato.',
      'Rada souhlasí s pronájmem.\nPodpis starosty',
    ]);
  });
});

describe('úseky (8.4)', () => {
  const veta = (n: number) => `Toto je věta číslo ${n}, která popisuje usnesení rady obce o pronájmu sokolovny a o vratné kauci.`;
  const odstavec = (od: number, pocet: number) => Array.from({ length: pocet }, (_, i) => veta(od + i)).join(' ');

  it('krátký text je jeden úsek a strana zůstane u úseku', () => {
    expect(rozdelitNaUseky([{ strana: 3, text: 'Krátký text.' }])).toEqual([{ strana: 3, text: 'Krátký text.' }]);
  });

  it('dlouhý text rozdělí na konci věty, s překryvem a nejvýš na délku úseku', () => {
    const text = [odstavec(1, 8), odstavec(9, 8), odstavec(17, 8)].join('\n\n');
    const useky = rozdelitNaUseky([{ strana: null, text }]);
    expect(useky.length).toBeGreaterThan(1);
    for (const u of useky) {
      expect(u.text.length).toBeLessThanOrEqual(DELKA_USEKU + 200);
      expect(u.text.trimEnd()).toMatch(/[.!?]$/);
    }
    for (let i = 1; i < useky.length; i += 1) {
      expect(useky[i].text.startsWith(prekryv(useky[i - 1].text, PREKRYV))).toBe(true);
    }
    // Žádná věta se neztratí.
    for (let n = 1; n <= 24; n += 1) expect(useky.some((u) => u.text.includes(veta(n)))).toBe(true);
  });

  it('úseky nepřekročí stranu PDF', () => {
    const useky = rozdelitNaUseky([{ strana: 1, text: odstavec(1, 3) }, { strana: 2, text: odstavec(4, 3) }]);
    expect(useky.map((u) => u.strana)).toEqual([1, 2]);
  });

  it('dělí po větách, ne za zkratkou', () => {
    expect(rozdelitNaMisto('Stavba čp. 145 ve výši 21.000,- Kč. Další věta je delší než místo.', 40)).toEqual([
      'Stavba čp. 145 ve výši 21.000,- Kč.',
      'Další věta je delší než místo.',
    ]);
  });
});

describe('rozšíření indexu o Word, ODT a OCR (10. 11. 2026)', () => {
  it('stahuje jen PDF, Word a ODT', () => {
    expect(formatPrilohy('https://prisovice.cz/wp-content/uploads/2026/03/vyhlaska.PDF')).toBe('pdf');
    expect(formatPrilohy('https://prisovice.cz/wp-content/uploads/2026/03/vyhlaska.docx')).toBe('word');
    expect(formatPrilohy('https://prisovice.cz/wp-content/uploads/2026/03/zprava.doc')).toBe('word');
    expect(formatPrilohy('https://prisovice.cz/wp-content/uploads/2026/01/opatreni.odt')).toBe('word');
    expect(formatPrilohy('https://prisovice.cz/wp-content/uploads/2026/01/rozpocet.xlsx')).toBeNull();
    expect(formatPrilohy('https://prisovice.cz/wp-content/uploads/2026/01/archiv.zip')).toBeNull();
    expect(souborPrilohy('https://prisovice.cz/a/opatreni.ODT').split(path.sep)).toEqual(['word', expect.stringMatching(/^[0-9a-f]{40}\.odt$/)]);
    expect(souborPrilohy('https://prisovice.cz/a/vyhlaska.pdf').split(path.sep)).toEqual(['pdf', expect.stringMatching(/^[0-9a-f]{40}\.pdf$/)]);
  });

  it('text z Wordu: odstavce, tabulky a Enter uprostřed věty', () => {
    const surovy = [
      '\ufeffObecně závazná vyhláška',
      '(dále jen "zákon',
      'o odpadech")',
      '',
      '\tOdsazený odstavec.',
      'Druh\tCena\t\tPoznámka',
      'Papír\t22,2\tsběrné místo',
      'Konec\u000btextu.',
    ].join('\r\n');
    expect(textWordu(surovy)).toBe([
      'Obecně závazná vyhláška',
      '(dále jen "zákon o odpadech")',
      'Odsazený odstavec.',
      'Druh | Cena | Poznámka\nPapír | 22,2 | sběrné místo',
      // Ruční zalomení řádku uprostřed věty se spojí stejně jako Enter.
      'Konec textu.',
    ].join('\n\n'));
  });

  it('text z OCR: řádky a slova rozdělená na konci řádku', () => {
    expect(textOcr('Provozní řád rekre-\r\nační oblasti\n\n  Malý   Písečák  ')).toBe('Provozní řád rekreační oblasti\nMalý Písečák');
  });

  it('nečitelný text z OCR (výkres, razítko) do indexu nejde', () => {
    const odstavec = 'Provozní řád rekreační oblasti Malý a Velký Písečák upravuje pravidla pobytu návštěvníků v areálu. '
      + 'Koupání je na vlastní nebezpečí a psi do vody nesmějí. Parkovat se smí jen na vyhrazených místech u vstupu. '
      + 'Stanovat lze pouze v kempu po dohodě se správcem tábořiště, oheň se rozdělává jen na určených místech.';
    expect(jeCitelnyOcr(odstavec)).toBe(true);
    // Úřední text s čísly parcel: slov z písmen je méně než polovina, přesto je čitelný.
    const parcely = `${'Stavební úřad oznamuje zahájení řízení vlastníkům sousedních pozemků parcel '.repeat(4)}${'110/55, 110/63, 110/64, '.repeat(20)}`;
    expect(jeCitelnyOcr(parcely)).toBe(true);
    expect(jeCitelnyOcr('472/70 1:500 A3 PS-01 2,40 ±0,000 S1 S2 Ing. 12.3.2025 M 1:200 X Y')).toBe(false);
    expect(jeCitelnyOcr('Starosta obce razítko podpis')).toBe(false);
  });
});
