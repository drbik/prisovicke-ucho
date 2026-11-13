// Uložené vzkazy občanů a témata ve feedu vedle ucha (13. 11. 2026, F-33 až F-37). Feed ukazuje témata:
// hlavní dotaz, jednu odpověď tématu složenou z ověřených částí, poddotazy a připojené vzkazy.
import type { SlugOblasti, TypPodnetu } from '../oblasti';
import type { CitovanyZdroj, VetaZobrazene } from '../odpovedi/odpoved';
import type { KlicStylu } from '../odpovedi/mluvci';
import type { WebZdroje } from '../odpovedi/typy';

// Dva stavy feedu (Tomáš 13. 11. 2026): zodpovězené, nebo čekají na odpověď.
export type StavVzkazu = 'zodpovezeno' | 'ceka';

export const STAVY_FEEDU: Record<StavVzkazu, string> = {
  zodpovezeno: 'Zodpovězeno',
  ceka: 'Čeká na odpověď',
};

// Vztah vzkazu k tématu podle datového modelu PRD (Podnět).
export type VztahVzkazu = 'zakladatel' | 'totez' | 'poddotaz' | 'doplneni';

// Volba autora (F-35). Poddotaz má jen dotaz, doplnění jen návrh, stížnost a pochvala.
export type VolbaTematu = { tema: string; vztah: 'totez' | 'poddotaz' | 'doplneni' } | { nove: true };

// Odpověď z webu, jak ji autor viděl. Bez podpisu k převyprávění. U části z poddotazu je „nova“.
export interface OdpovedVzkazu {
  vety: VetaZobrazene[];
  casti?: { otazka: string; vety: VetaZobrazene[]; nova?: boolean }[];
  zdroje: CitovanyZdroj[];
  oznaceni: string[];
}

export type StavTematuDb = 'zodpovezeno-z-webu' | 'ceka-na-spravce' | 'sloucene';

export interface RadekTematu {
  id: string;
  ukazka: boolean;
  vytvoreno: string;
  zmeneno: string;
  nazev: string;
  // Hlavní dotaz: kopie textu zakladatele nebo ukázky.
  text: string;
  typ: TypPodnetu;
  oblast: SlugOblasti;
  stav: StavTematuDb;
  hlavniId: string | null;
  skryto: boolean;
}

// Vzkaz, jak patří k tématu. Id je bez předpony „v-“.
export interface VzkazVTematu {
  id: string;
  temaId: string;
  vytvoreno: string;
  text: string;
  nazev: string;
  typ: TypPodnetu;
  styl: KlicStylu;
  textStylu: string | null;
  vztah: VztahVzkazu;
  skryto: boolean;
}

// Část odpovědi tématu (řádek „odpoved“). Věty odkazují na zdroj adresou, čísla dostanou až při složení.
export interface VetaCasti {
  text: string;
  url: string;
}

export interface ZdrojCasti {
  url: string;
  nazev: string;
  datum: string;
  web: WebZdroje;
  oznaceni: string;
  uryvek: string;
  misto: string;
}

export interface ObsahCasti {
  casti: { otazka: string | null; vety: VetaCasti[] }[];
  zdroje: ZdrojCasti[];
  // Otázky poddotazu, na které zdroje neodpovídají.
  nezodpovezeno?: string[];
}

export type StavCasti = 'platna' | 'ke-kontrole' | 'stazena';

export interface CastOdpovedi {
  id: string;
  temaId: string;
  // Poddotaz, ke kterému část patří. Null je odpověď na hlavní dotaz.
  vzkazId: string | null;
  vytvoreno: string;
  puvod: 'web' | 'ukazka';
  stav: StavCasti;
  duvod: string | null;
  nahrazenaId: string | null;
  otazka: string | null;
  obsah: ObsahCasti;
}

export interface UlozeneTema {
  tema: RadekTematu;
  vzkazy: VzkazVTematu[];
  casti: CastOdpovedi[];
}

// Téma ve feedu a v nabídce podobných témat (F-34).
export interface TemaFeedu {
  // Téma má id „t-…“, ukázka svoje id z ukazky.json.
  id: string;
  ukazka: boolean;
  nazev: string;
  // Hlavní dotaz.
  text: string;
  typ: TypPodnetu;
  oblast: SlugOblasti;
  stav: StavVzkazu;
  // Kolik vzkazů k tématu patří (bez přihlášení vzkazy, ne lidé). Ukázka sama se nepočítá.
  pocet: number;
  // Datum poslední změny (RRRR-MM-DD). Ukázky bez vzkazů ho nemají.
  zmeneno?: string;
  // Styl a text postavy zakladatele, když téma založil vzkaz.
  styl?: KlicStylu;
  textStylu?: string;
  odpoved?: OdpovedVzkazu;
  // Poddotazy, na které odpověď zatím není.
  cekajici: string[];
  // Ostatní vzkazy k tématu, bez zakladatele. V nabídce chybí.
  vzkazy: { id: string; text: string; vztah: VztahVzkazu; datum: string; styl: KlicStylu; textStylu?: string }[];
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
  vektor: number[] | null;
  vektorNazvu: number[] | null;
}

// Vektory vzkazů v tématech stejného typu (nabídka podobných témat).
export interface VektorClena {
  temaId: string;
  vzkazId: string;
  vektor: Float32Array;
  vektorNazvu: Float32Array | null;
}

export interface VektorUkazky {
  otisk: string;
  vektor: Float32Array;
  vektorNazvu: Float32Array | null;
}

// Vzkaz z doby před tématy (převod, docs/temata-feedu.md).
export interface VzkazBezTematu extends Omit<VzkazVTematu, 'temaId' | 'vztah'> {
  oblast: SlugOblasti;
  stav: StavVzkazu;
  odpoved: OdpovedVzkazu | null;
  vektor: Float32Array | null;
  vektorNazvu: Float32Array | null;
}

// Úložiště je za vlastním rozhraním, aby šel hosting vyměnit a lokální vývoj nepsal do ostré databáze.
// Je záměrně jednoduché, logika zařazení a skládání odpovědi je v temata.ts a skladani.ts.
export interface UlozisteVzkazu {
  // Uloží vzkaz, nebo přepíše ten se stejným klíčem návrhu. Vrátí i předchozí zařazení přepsaného vzkazu.
  ulozitVzkaz(vzkaz: NovyVzkaz, ted: Date): Promise<{ id: string; vytvoreno: string; predchozi: { temaId: string; vztah: VztahVzkazu } | null }>;
  // Co autor viděl: stav a odpověď u vzkazu.
  zapsatVysledek(id: string, stav: StavVzkazu, odpoved: OdpovedVzkazu | null, ted: Date): Promise<void>;
  pripojit(id: string, temaId: string | null, vztah: VztahVzkazu | null, ted: Date): Promise<void>;
  zapsatPotvrzeni(klicNavrhu: string, potvrzeni: 'staci' | 'doptani'): Promise<boolean>;
  skrytVzkaz(id: string, skryto: boolean): Promise<VzkazVTematu | null>;
  nacistVzkaz(id: string): Promise<VzkazVTematu | null>;
  // Založí téma, když ještě není. Vrátí, jestli ho založilo.
  zalozitTema(tema: RadekTematu): Promise<boolean>;
  upravitTema(tema: RadekTematu): Promise<void>;
  // Téma se všemi vzkazy (i skrytými) a všemi částmi odpovědi.
  nacistTema(id: string): Promise<UlozeneTema | null>;
  // Feed: viditelná témata od poslední změny s viditelnými vzkazy a platnými částmi. Id všech ukázek, které už
  // v databázi jsou, vrátí zvlášť, aby se neukázaly ještě jednou ze souboru ukázek.
  temataFeedu(pocet: number): Promise<{ temata: UlozeneTema[]; ukazkyVDb: string[] }>;
  vzkazPodleKlice(klicNavrhu: string): Promise<{ id: string; temaId: string | null } | null>;
  // Vektory viditelných vzkazů ve viditelných tématech daného typu a id témat, která se nabízet nesmí.
  vektoryTemat(typ: TypPodnetu): Promise<{ clenove: VektorClena[]; vyloucena: string[] }>;
  ulozitCast(cast: CastOdpovedi): Promise<void>;
  zmenitCast(id: string, stav: StavCasti, duvod: string | null, nahrazenaId?: string | null): Promise<void>;
  vektoryUkazek(): Promise<Map<string, VektorUkazky>>;
  ulozitVektorUkazky(id: string, otisk: string, vektor: number[], vektorNazvu: number[]): Promise<void>;
  // Převod a příkazy pro tým.
  vzkazyBezTematu(): Promise<VzkazBezTematu[]>;
  doplnitVektory(id: string, vektor: number[], vektorNazvu: number[]): Promise<void>;
  seznamTemat(): Promise<(RadekTematu & { pocet: number })[]>;
}
