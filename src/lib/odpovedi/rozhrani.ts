import type { NalezenyUsek, Usek, ZdrojovyDokument } from './typy';
import type { OrganObce } from './zapisy';

export interface Shoda {
  id: string;
  // Vektory: kosinová podobnost (vyšší je lepší). Fulltext: bm25 (nižší je lepší).
  skore: number;
}

// Index je za vlastním rozhraním, aby šel hosting vyměnit a testy běžely bez Cloudflare (zásady v CLAUDE.md).
export interface IndexZdroju {
  hledatVektorem(vektor: number[], pocet: number): Promise<Shoda[]>;
  hledatSlovy(dotazFts: string, pocet: number): Promise<Shoda[]>;
  nacistUseky(id: string[]): Promise<NalezenyUsek[]>;
  // Prvních několik úseků nejnovějšího zápisu rady nebo zastupitelstva podle data zasedání (14. 11. 2026). Nepovinné:
  // bez něj se dotaz na „poslední zasedání“ hledá jako každý jiný.
  nejnovejsiZapis?(organ: OrganObce, pocetUseku: number): Promise<NalezenyUsek[]>;
}

// Zápis používá jen ruční skript indexu (8.5), Worker index jen čte.
export interface ZapisIndexu {
  smazatVse(): Promise<void>;
  nahratDokumenty(dokumenty: ZdrojovyDokument[]): Promise<void>;
  nahratUseky(useky: Usek[]): Promise<void>;
  nahratVektory(vektory: { id: string; hodnoty: number[] }[]): Promise<void>;
  spocitat(): Promise<{ dokumentu: number; useku: number; vektoru: number | null }>;
}
