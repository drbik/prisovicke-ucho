import type { HTMLElement } from 'node-html-parser';
import { cistyText, rozebratHtml, textPrvku } from './html';

export interface Karta {
  slug: string;
  nazev: string;
  text: string;
}

// Karty projektů na titulní stránce webu Nezávislých: <article id="slug" data-story-card>.
// Bere se jen text karty, ne dokumenty u ní ani navigace mezi kartami.
export function precistKarty(html: string): Karta[] {
  const koren = rozebratHtml(html);
  const preskocit = (prvek: HTMLElement) => {
    const trida = prvek.getAttribute('class') ?? '';
    return /\bproject-documents\b|\bdirection\b/.test(trida) || prvek.rawTagName?.toLowerCase() === 'a' && /\bdirection/.test(trida);
  };
  return koren.querySelectorAll('article[data-story-card]').flatMap((karta) => {
    const slug = karta.getAttribute('id') ?? karta.getAttribute('data-project') ?? '';
    const telo = karta.querySelector('.story-card__body') ?? karta;
    const nazev = cistyText(telo.querySelector('.story-card__title') ?? telo.querySelector('h2'));
    if (!slug || !nazev) return [];
    return [{ slug, nazev, text: textPrvku(telo, preskocit) }];
  });
}
