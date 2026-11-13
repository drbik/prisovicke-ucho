import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SLOZKA_DAT } from './nastaveni';
import type { TypPolozky } from './wordpress';

export interface StavStazeni {
  html: Record<string, { typ: TypPolozky; lastmod: string | null; soubor: string; stazeno: string }>;
  // Přiložené soubory: PDF a od 10. 11. 2026 i Word a ODT. Klíč „pdf“ zůstal kvůli uloženým datům.
  pdf: Record<string, { soubor: string; stazeno: string; velikostB: number }>;
  karty: { stazeno: string; etag?: string | null } | null;
  // Tlampač a podklady webu Nezávislých (rozšíření z 10. 11. 2026). Otisk je sha1 stažené podoby.
  nezavisli?: { soubory: Record<string, { soubor: string; stazeno: string; otisk: string }> };
  // Obrázky pozvánek a plakátů v aktualitách a na úřední desce pro OCR (rozšíření z 13. 11. 2026).
  obrazky?: Record<string, { soubor: string; stazeno: string; velikostB: number }>;
  posledniBeh?: string;
}

export type StavPolozky =
  | 'stazeno' | 'beze-zmeny' | 'vypis' | 'robots' | 'mimo-okno' | 'chyba' | 'bez-obsahu'
  | 'cizi-domena' | 'jiny-format' | 'vynechano';

export interface ZaznamSeznamu {
  url: string;
  // „pdf“ je přiložený soubor, tedy PDF, Word nebo ODT. „nezavisli“ je Tlampač nebo soubor podkladů webu Nezávislých.
  typ: TypPolozky | 'pdf' | 'karty' | 'nezavisli' | 'obrazek';
  stav: StavPolozky;
  duvod?: string;
  nazev?: string;
  datum?: string | null;
  rodic?: string;
}

export const souborStavu = () => path.join(SLOZKA_DAT, 'stav.json');

export const sha1 = (text: string) => createHash('sha1').update(text).digest('hex');

// Přílohy, ze kterých index bere text. Word a ODT přibyly 10. 11. 2026 se souhlasem Tomáše.
// Excel, zip a další formáty se nestahují.
export type FormatPrilohy = 'pdf' | 'word';

export function formatPrilohy(url: string): FormatPrilohy | null {
  const cesta = new URL(url).pathname;
  if (/\.pdf$/i.test(cesta)) return 'pdf';
  if (/\.(?:docx?|odt)$/i.test(cesta)) return 'word';
  return null;
}

// Kam se příloha uloží: PDF do pdf/, Word a ODT do word/ s původní příponou.
export function souborPrilohy(url: string) {
  const format = formatPrilohy(url);
  if (format === 'pdf') return path.join('pdf', `${sha1(url)}.pdf`);
  const pripona = /\.(docx?|odt)$/i.exec(new URL(url).pathname)?.[1].toLowerCase() ?? 'bin';
  return path.join('word', `${sha1(url)}.${pripona}`);
}

// Text vytažený Wordem a text rozpoznaný OCR leží vedle stažených souborů.
export const souborTextuWordu = (url: string) => path.join('word', `${sha1(url)}.txt`);
export const souborOcr = (url: string, strana: number) => path.join('ocr', `${sha1(url)}-${strana}.txt`);
// Obrázek z článku a jeho text z OCR (rozšíření z 13. 11. 2026).
export const souborObrazku = (url: string) =>
  path.join('obrazky', `${sha1(url)}.${/\.(jpe?g|png)$/i.exec(new URL(url).pathname)?.[1].toLowerCase() ?? 'bin'}`);
export const souborOcrObrazku = (url: string) => path.join('ocr', `${sha1(url)}-obrazek.txt`);

export async function nacistJson<T>(soubor: string, vychozi: T): Promise<T> {
  if (!existsSync(soubor)) return vychozi;
  return JSON.parse(await fs.readFile(soubor, 'utf8')) as T;
}

export async function ulozitJson(soubor: string, data: unknown) {
  await fs.mkdir(path.dirname(soubor), { recursive: true });
  const docasny = `${soubor}.tmp`;
  await fs.writeFile(docasny, JSON.stringify(data, null, 1), 'utf8');
  await fs.rename(docasny, soubor);
}

// Měsíc nahrání z adresy WordPressu /wp-content/uploads/RRRR/MM/.
export function mesicNahrani(url: string) {
  const shoda = /\/wp-content\/uploads\/(\d{4})\/(\d{2})\//.exec(url);
  return shoda ? `${shoda[1]}-${shoda[2]}` : null;
}
