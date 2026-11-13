import os from 'node:os';
import path from 'node:path';

// Okno 4 let (2 roky rozhodnuty 9. 11. 2026, rozšířeno na 4 roky 13. 11. 2026, docs/plan-mvp.md, krok 8). Platí pro aktuality, úřední desku a jejich PDF.
export const OKNO_OD = '2022-11-09';
export const OKNO_OD_MESIC = OKNO_OD.slice(0, 7);

// Obecný název bez osobních údajů (zadání kroku 8).
export const USER_AGENT = 'Mozilla/5.0 (compatible; prisovicke-ucho-index/1.0)';
// Nejvýš zhruba jeden požadavek za sekundu: mezi koncem jednoho a začátkem dalšího je aspoň sekunda.
export const ROZESTUP_MS = 1000;

export const WEB_OBCE = 'https://prisovice.cz';
export const WEB_NEZAVISLYCH = 'https://nezavisli-prisovice.cz';

// Stažený obsah nepatří do repozitáře. Výchozí složka je v profilu uživatele, jde změnit proměnnou UCHO_DATA.
export const SLOZKA_DAT = process.env.UCHO_DATA ?? path.join(os.homedir(), '.prisovicke-ucho', 'index');

// Výpisy opakují texty jednotlivých položek. Odpověď má citovat článek nebo dokument, ne výpis.
export const VYPISOVE_STRANKY = new Set([
  'https://prisovice.cz/aktuality/',
  'https://prisovice.cz/aktualne/',
  'https://prisovice.cz/obecni-urad-prisovice/uredni-deska/',
  'https://prisovice.cz/obecni-urad-prisovice/archiv-ud/',
  'https://prisovice.cz/mapa-stranek/',
]);

// Řízení soukromých osob se z úřední desky vynechávají (rozhodnuto 9. 11. 2026): dražby, exekuce
// a řízení stavebního úřadu o rodinných domech, přístavbách, tůních a dělení pozemků.
const SOUKROME_RIZENI = /dražb|exekut|\bEX\b|rodinného domu|RD čp|přístřešku|odstranění rodinného|oplocení u rodinného|Dělení p|tůní/i;

export function jeRizeniSoukromeOsoby(nazev: string, kategorie: readonly string[]) {
  const nazevBezMezer = nazev.replace(/\s+/g, ' ');
  return (kategorie.includes('stavebni-urad') && !nazevBezMezer.includes('106')) || SOUKROME_RIZENI.test(nazevBezMezer);
}
