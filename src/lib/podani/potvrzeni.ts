import { jeOblast, jeTyp, type SlugOblasti, type TypPodnetu } from '../oblasti';
import { MAX_ZNAKU_NAZVU, MAX_ZNAKU_UPRAVY, MIN_ZNAKU_TEXTU } from './limity';

// Co autor potvrdí v kroku 4 (F-14). Teď to ověřuje prohlížeč, s ukládáním totéž ověří i server.
export interface PotvrzenyVzkaz {
  text: string;
  nazev: string;
  typ: TypPodnetu;
  oblast: SlugOblasti;
}

export type PolePotvrzeni = keyof PotvrzenyVzkaz;
export const POLE_POTVRZENI: readonly PolePotvrzeni[] = ['text', 'nazev', 'typ', 'oblast'];

export type OvereniPotvrzeni =
  | { platne: true; vzkaz: PotvrzenyVzkaz }
  | { platne: false; chyby: Partial<Record<PolePotvrzeni, string>> };

const cislo = (hodnota: number) => hodnota.toLocaleString('cs-CZ');

export function overitPotvrzeni(vstup: Record<PolePotvrzeni, string>): OvereniPotvrzeni {
  const text = vstup.text.trim();
  const nazev = vstup.nazev.trim();
  const typ = jeTyp(vstup.typ) ? vstup.typ : null;
  const oblast = jeOblast(vstup.oblast) ? vstup.oblast : null;
  const chyby: Partial<Record<PolePotvrzeni, string>> = {};
  if (text.length < MIN_ZNAKU_TEXTU || text.length > MAX_ZNAKU_UPRAVY) {
    chyby.text = `Vzkaz musí mít ${MIN_ZNAKU_TEXTU} až ${cislo(MAX_ZNAKU_UPRAVY)} znaků.`;
  }
  if (!nazev) chyby.nazev = 'Doplňte název.';
  else if (nazev.length > MAX_ZNAKU_NAZVU) chyby.nazev = `Název může mít nejvýš ${MAX_ZNAKU_NAZVU} znaků.`;
  if (!typ) chyby.typ = 'Vyberte typ.';
  if (!oblast) chyby.oblast = 'Vyberte oblast.';

  if (!typ || !oblast || Object.keys(chyby).length > 0) return { platne: false, chyby };
  return { platne: true, vzkaz: { text, nazev, typ, oblast } };
}

// Která pole autor oproti návrhu AI změnil. Poslouží k vyhodnocení úpravy (krok 3.6).
export function zmenenaPole(navrh: PotvrzenyVzkaz, vzkaz: PotvrzenyVzkaz) {
  return POLE_POTVRZENI.filter((pole) => navrh[pole].trim() !== vzkaz[pole]);
}
