import type { HTMLElement } from 'node-html-parser';
import { cistyText, rozebratHtml, textPrvku } from './html';

export interface PolozkaSitemapy {
  url: string;
  lastmod: string | null;
}

function odEntit(text: string) {
  return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");
}

// Sitemapa WordPressu: buď seznam dílčích sitemap, nebo seznam adres s datem poslední změny.
export function precistSitemapu(xml: string) {
  const sitemapy = [...xml.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>/g)].map((m) => odEntit(m[1].trim()));
  const adresy: PolozkaSitemapy[] = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    url: odEntit(/<loc>([^<]+)<\/loc>/.exec(m[1])?.[1].trim() ?? ''),
    lastmod: /<lastmod>([^<]+)<\/lastmod>/.exec(m[1])?.[1].trim() ?? null,
  })).filter((a) => a.url);
  return { sitemapy, adresy };
}

export type TypPolozky = 'stranka' | 'aktualita' | 'uredni-deska';

// Druh dílčí sitemapy podle názvu: wp-sitemap-posts-post-1.xml, -page-, -urednideska-.
export function typSitemapy(url: string): TypPolozky | null {
  const shoda = /wp-sitemap-posts-([a-z_-]+)-\d+\.xml$/.exec(url);
  if (!shoda) return null;
  return ({ post: 'aktualita', page: 'stranka', urednideska: 'uredni-deska' } as const)[shoda[1] as 'post' | 'page' | 'urednideska'] ?? null;
}

export interface OdkazNaDokument {
  url: string;
  text: string;
}

export interface Clanek {
  nazev: string;
  // Datum zveřejnění z hlavičky článku (dd.mm.rrrr). Stálé stránky ho nemají.
  datum: string | null;
  kategorie: string[];
  text: string;
  dokumenty: OdkazNaDokument[];
  // Obrázky v obsahu článku v plné velikosti (rozšíření z 13. 11. 2026: OCR pozvánek a plakátů).
  obrazky: string[];
}

const PRIPONY_DOKUMENTU = /\.(pdf|docx?|xlsx?|odt|ods|rtf|zip)$/i;
const PRIPONY_OBRAZKU = /\.(jpe?g|png)$/i;
// Zmenšenina WordPressu má v názvu rozměr (plakat-267x400.jpg), původní soubor ho nemá.
const ROZMER_ZMENSENINY = /-\d+x\d+(\.[a-z]+)$/i;

export function naIsoDatum(text: string | null | undefined) {
  const shoda = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(text ?? '');
  if (!shoda) return null;
  return `${shoda[3]}-${shoda[2].padStart(2, '0')}-${shoda[1].padStart(2, '0')}`;
}

function hlavniClanek(koren: HTMLElement) {
  // Šablona webu obce má článek <article id="post-…" class="art-post …">, na úřední desce za ním ještě widgety.
  return koren.querySelectorAll('article').find((a) => /^(post|page)-\d+$/.test(a.getAttribute('id') ?? '')) ?? null;
}

// Jen obsah článku, bez menu, postranních panelů a patičky se jmény vedení obce (krok 8, architektura).
export function rozebratClanek(html: string, adresa: string): Clanek | null {
  const koren = rozebratHtml(html);
  const clanek = hlavniClanek(koren);
  if (!clanek) return null;
  const tridy = (clanek.getAttribute('class') ?? '').split(/\s+/);
  const kategorie = tridy.flatMap((t) => /^(?:kategorie|category|sekce_ud)-(.+)$/.exec(t)?.[1] ?? []);
  const obsah = clanek.querySelector('.art-postcontent');
  const dokumenty: OdkazNaDokument[] = [];
  const videne = new Set<string>();
  for (const odkaz of obsah?.querySelectorAll('a[href]') ?? []) {
    let url: URL;
    try {
      url = new URL(odkaz.getAttribute('href') ?? '', adresa);
    } catch {
      continue;
    }
    url.hash = '';
    if (!PRIPONY_DOKUMENTU.test(url.pathname) || videne.has(url.href)) continue;
    videne.add(url.href);
    dokumenty.push({ url: url.href, text: cistyText(odkaz) });
  }
  // Obrázek v plné velikosti: odkaz kolem obrázku (lightbox), jinak adresa obrázku bez rozměru zmenšeniny.
  const obrazky: string[] = [];
  for (const obrazek of obsah?.querySelectorAll('img') ?? []) {
    const odkaz = obrazek.closest('a')?.getAttribute('href') ?? '';
    const zLightboxu = PRIPONY_OBRAZKU.test(odkaz.split(/[?#]/)[0]);
    let url: URL;
    try {
      url = new URL(zLightboxu ? odkaz : obrazek.getAttribute('src') ?? '', adresa);
    } catch {
      continue;
    }
    url.hash = '';
    url.search = '';
    if (!zLightboxu) url.pathname = url.pathname.replace(ROZMER_ZMENSENINY, '$1');
    if (!PRIPONY_OBRAZKU.test(url.pathname) || obrazky.includes(url.href)) continue;
    obrazky.push(url.href);
  }
  return {
    nazev: cistyText(clanek.querySelector('h1.entry-title') ?? clanek.querySelector('h1')),
    datum: naIsoDatum(cistyText(clanek.querySelector('.entry-date'))),
    kategorie,
    // Nevykreslené zkratky WordPressu ([cmplz-document …], [yottie …]) nejsou obsah.
    text: obsah ? textPrvku(obsah).replace(/\[\/?[a-z][\w-]*(?:\s[^\]]*)?\]/g, '').replace(/\n{3,}/g, '\n\n').trim() : '',
    dokumenty,
    obrazky,
  };
}

export interface ZaznamRest {
  link: string;
  date: string;
  modified: string;
}
