// Oblasti MVP: pět budoucích projektů z webu a Ostatní (F-30). Slug je stabilní klíč karty na webu.
export const OBLASTI = [
  { slug: 'dostupne-bydleni', nazev: 'Patnáct dostupných bytů', popis: 'nové nájemní byty v obci, bydlení pro seniory a mladé lidi' },
  { slug: 'bezpecne-trasy', nazev: 'Bezpečně pěšky i na kole', popis: 'chodníky, cyklostezky a bezpečnost chodců a cyklistů' },
  { slug: 'kanalizace-zahumeni', nazev: 'Vodovod a kanalizace na Záhumení', popis: 'stavba vodovodu a kanalizace na Záhumení, přípojky' },
  { slug: 'verejna-prostranstvi', nazev: 'Příjemnější centrum obce', popis: 'okolí obecního úřadu a kaple, okna kostela, park u zdravotního střediska' },
  { slug: 'komunitni-energetika', nazev: 'Elektřina zůstane v obci', popis: 'sdílení elektřiny ze solárních střech, energetické společenství' },
  { slug: 'ostatni', nazev: 'Ostatní', popis: 'všechno, co nepatří do předchozích oblastí' },
] as const;

export type SlugOblasti = (typeof OBLASTI)[number]['slug'];

// Typy podnětu podle F-13.
export const TYPY_PODNETU = {
  navrh: 'Návrh',
  stiznost: 'Stížnost',
  dotaz: 'Dotaz',
  pochvala: 'Pochvala',
} as const;

export type TypPodnetu = keyof typeof TYPY_PODNETU;

export function jeOblast(hodnota: unknown): hodnota is SlugOblasti {
  return OBLASTI.some((oblast) => oblast.slug === hodnota);
}

export function jeTyp(hodnota: unknown): hodnota is TypPodnetu {
  return typeof hodnota === 'string' && Object.hasOwn(TYPY_PODNETU, hodnota);
}
