// Uložené vzkazy občanů a položky feedu vedle ucha (13. 11. 2026). Feed ukazuje uložené vzkazy i ukázky od týmu.
import type { SlugOblasti, TypPodnetu } from '../oblasti';
import type { CitovanyZdroj, VetaZobrazene } from '../odpovedi/odpoved';
import type { KlicStylu } from '../odpovedi/mluvci';

// Dva stavy feedu (Tomáš 13. 11. 2026): zodpovězené, nebo čekají na odpověď.
export type StavVzkazu = 'zodpovezeno' | 'ceka';

export const STAVY_FEEDU: Record<StavVzkazu, string> = {
  zodpovezeno: 'Zodpovězeno',
  ceka: 'Čeká na odpověď',
};

// Odpověď z webu, jak ji autor viděl. Bez podpisu k převyprávění.
export interface OdpovedVzkazu {
  vety: VetaZobrazene[];
  casti?: { otazka: string; vety: VetaZobrazene[] }[];
  zdroje: CitovanyZdroj[];
  oznaceni: string[];
}

export interface PolozkaFeedu {
  // Uložený vzkaz má id „v-…“, ukázka svoje id z ukazky.json.
  id: string;
  ukazka: boolean;
  nazev: string;
  // Potvrzené spisovné znění.
  text: string;
  typ: TypPodnetu;
  oblast: SlugOblasti;
  stav: StavVzkazu;
  // Datum podání (RRRR-MM-DD). Ukázky ho nemají.
  datum?: string;
  // Styl, ve kterém autor vzkaz poslal, a text postavy.
  styl: KlicStylu;
  textStylu?: string;
  odpoved?: OdpovedVzkazu;
  // Dříve zodpovězený podobný dotaz.
  podobny?: { id: string; nazev: string };
}

export interface NovyVzkaz {
  klicNavrhu: string;
  vstup: 'hlas' | 'text';
  surovyText: string;
  navrhText: string;
  text: string;
  nazev: string;
  typ: TypPodnetu;
  oblast: SlugOblasti;
  styl: KlicStylu;
  textStylu: string | null;
  podobnyId: string | null;
  vektor: number[] | null;
}

// Zodpovězený dotaz, se kterým se porovná nový dotaz.
export interface KandidatPodobnosti {
  id: string;
  nazev: string;
  vektor: Float32Array;
}

// Úložiště je za vlastním rozhraním, aby šel hosting vyměnit a lokální vývoj nepsal do ostré databáze.
export interface UlozisteVzkazu {
  // Uloží vzkaz, nebo přepíše ten se stejným klíčem návrhu. Vrátí id a datum vytvoření.
  ulozit(vzkaz: NovyVzkaz, ted: Date): Promise<{ id: string; vytvoreno: string }>;
  zapsatVysledek(id: string, stav: StavVzkazu, odpoved: OdpovedVzkazu | null, podobnyId: string | null, ted: Date): Promise<void>;
  feed(pocet: number): Promise<PolozkaFeedu[]>;
  zodpovezene(): Promise<KandidatPodobnosti[]>;
  vektoryUkazek(): Promise<Map<string, { otisk: string; vektor: Float32Array }>>;
  ulozitVektorUkazky(id: string, otisk: string, vektor: number[]): Promise<void>;
  skryt(id: string, skryto: boolean): Promise<boolean>;
}
