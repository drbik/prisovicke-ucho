// Rozšíření indexu z 10. 11. 2026 (se souhlasem Tomáše): kromě karet projektů i Tlampač a veřejné podklady
// webu Nezávislých pro Příšovice. Podklady jsou soubory Markdown, které web sám zveřejňuje pro čtení strojem
// (nezavisli-prisovice.cz/podklady/). Tady jsou jen čisté funkce, stahování dělá stahnout.ts.
//
// Mimo index zůstává `akce-prisovice-timeline.md` z projektu webu (neveřejné záměry a neověřené údaje), rozcestník
// podkladů (index.md) a soubor vse.md, který jen skládá ostatní do jednoho a obsahuje pokyny pro chatboty.
import type { HTMLElement } from 'node-html-parser';
import { cistyText, rozebratHtml, textPrvku } from './html';

export interface PrispevekTlampace {
  // Kotva příspěvku na stránce Tlampače, například prispevek-ustavujici-zasedani-2026.
  id: string;
  nazev: string;
  // Datum zveřejnění RRRR-MM-DD.
  datum: string;
  text: string;
}

// Příspěvky na stránce Tlampače: <article id="prispevek-…" data-tlampac-post> s datem v <time datetime>.
export function precistTlampac(html: string): PrispevekTlampace[] {
  const koren = rozebratHtml(html);
  return koren.querySelectorAll('article[data-tlampac-post]').flatMap((clanek: HTMLElement) => {
    const id = clanek.getAttribute('id') ?? '';
    const datum = clanek.querySelector('time')?.getAttribute('datetime')?.slice(0, 10) ?? '';
    const nazev = cistyText(clanek.querySelector('h3') ?? clanek.querySelector('h2'));
    const telo = clanek.querySelector('.tlampac__text') ?? clanek;
    const text = textPrvku(telo);
    return id && /^\d{4}-\d{2}-\d{2}$/.test(datum) && nazev && text ? [{ id, nazev, datum, text }] : [];
  });
}

// Soubory podkladů, které se indexují. index.md je rozcestník, vse.md skládá ostatní soubory do jednoho a novinky.md
// opakuje Tlampač, který se bere ze stránky s kotvami jednotlivých příspěvků.
const MIMO_INDEX = new Set(['index', 'vse', 'novinky']);

// Adresy souborů Markdown z rozcestníku /podklady/.
export function odkazyPodkladu(html: string, zaklad: string): string[] {
  const hostitel = new URL(zaklad).hostname;
  const adresy = new Set<string>();
  for (const odkaz of rozebratHtml(html).querySelectorAll('a')) {
    const href = odkaz.getAttribute('href');
    if (!href) continue;
    let adresa: URL;
    try {
      adresa = new URL(href, zaklad);
    } catch {
      continue;
    }
    const shoda = /^\/podklady\/([a-z0-9-]+)\.md$/i.exec(adresa.pathname);
    if (adresa.hostname !== hostitel || !shoda || MIMO_INDEX.has(shoda[1].toLowerCase())) continue;
    adresa.hash = '';
    adresa.search = '';
    adresy.add(adresa.href);
  }
  return [...adresy];
}

export interface Podklad {
  nazev: string;
  text: string;
}

// Markdown převede na prostý text tak, jak ho dávají stránky: bez značek nadpisů, tučného písma a odkazů,
// tabulky po řádcích s buňkami oddělenými svislou čárou. Text zůstává doslovný, ze kterého se citují věty.
export function precistPodklad(markdown: string): Podklad | null {
  const radky = markdown.replace(/^\ufeff/, '').replace(/\r\n?/g, '\n').split('\n');
  const prvni = radky.findIndex((radek) => radek.trim());
  const nadpis = prvni === -1 ? null : /^#\s+(.+?)\s*#*\s*$/.exec(radky[prvni]);
  if (!nadpis) return null;
  const vystup: string[] = [];
  for (const surovy of radky.slice(prvni + 1)) {
    let radek = surovy.trim();
    // Oddělovač záhlaví tabulky: | --- | ---: |
    if (/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(radek)) continue;
    radek = radek
      .replace(/^#{1,6}\s+/, '')
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/(?<![\w*])\*([^*\s][^*]*)\*(?![\w*])/g, '$1');
    if (radek.startsWith('|')) {
      radek = radek.replace(/^\|\s*/, '').replace(/\s*\|$/, '').split(/\s*\|\s*/).join(' | ');
    }
    vystup.push(radek.replace(/[\u00a0\u2007\u202f]/g, ' ').replace(/[ \t]+/g, ' ').trim());
  }
  const text = vystup.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return text ? { nazev: nadpis[1].trim(), text } : null;
}
