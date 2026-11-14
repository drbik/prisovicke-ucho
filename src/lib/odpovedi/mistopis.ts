// Místní názvy v obci (Tomáš 14. 11. 2026). Občané říkají místům po svém a model zná „Cecilku“ jako jméno ženy. Výklad
// se přidá k dotazu jen tehdy, když se název objeví v dotazu nebo v nalezených úryvcích, a slouží jen k porozumění:
// údaj z výkladu se do odpovědi nepíše, tvrzení musí mít oporu v úryvku. Seznam doplňuje tým, každé místo má popis,
// který tým ověřil, a volitelná slova, která se přidají do fulltextového hledání.
export interface MistniNazev {
  nazev: string;
  // Kmeny bez diakritiky, podle kterých se název pozná v ohnutých tvarech (Cecilka, Cecilku, Na Cecilce).
  tvary: string[];
  popis: string;
  // Slova navíc pro fulltext, když se dotaz ptá na toto místo (třeba sousední obec, kterou zápisy místo vyjadřují).
  hledat?: string[];
}

export const MISTNI_NAZVY: MistniNazev[] = [
  {
    nazev: 'Cecilka (Na Cecilce)',
    tvary: ['cecilk', 'cecilc'],
    popis: 'Místní název části Příšovic, ne jméno osoby. Je to nejnovější zástavba rodinných domů na východním okraji Příšovic, u silnice směrem na Přepeře. Dokumenty obce píšou „lokalita Cecilka“, „část obce Na Cecilce“, nebo místo jen popisují (třeba cyklostezka „od Přepeř k břehové části řeky Jizery“).',
    hledat: ['Přepeře'],
  },
  {
    nazev: 'Písečáky',
    tvary: ['pisecak'],
    popis: 'Rekreační oblast Malý a Velký Písečák, vodní plochy v Příšovicích.',
  },
];

const bezDiakritiky = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Místní názvy, které se objevují aspoň v jednom z textů.
export function mistniNazvyVTextech(...texty: string[]): MistniNazev[] {
  const text = bezDiakritiky(texty.join('\n'));
  return MISTNI_NAZVY.filter((m) => m.tvary.some((tvar) => text.includes(tvar)));
}

// Blok pro model. Prázdný, když dotaz ani úryvky žádné místní jméno nemají.
export function blokMistnichNazvu(...texty: string[]): string {
  const nazvy = mistniNazvyVTextech(...texty);
  if (!nazvy.length) return '';
  const radky = nazvy.map((m) => `- ${m.nazev}: ${m.popis}`).join('\n');
  return `\n\n<mistni_nazvy>\n${radky}\n</mistni_nazvy>`;
}

// Slova navíc do fulltextového hledání podle místních názvů v dotazu.
export function rozsireniHledani(dotaz: string): string {
  return mistniNazvyVTextech(dotaz).flatMap((m) => m.hledat ?? []).join(' ');
}
