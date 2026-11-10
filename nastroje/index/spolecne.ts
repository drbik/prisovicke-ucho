import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SLOZKA_DAT } from './nastaveni';
import type { TypPolozky } from './wordpress';

export interface StavStazeni {
  html: Record<string, { typ: TypPolozky; lastmod: string | null; soubor: string; stazeno: string }>;
  pdf: Record<string, { soubor: string; stazeno: string; velikostB: number }>;
  karty: { stazeno: string; etag?: string | null } | null;
  posledniBeh?: string;
}

export type StavPolozky =
  | 'stazeno' | 'beze-zmeny' | 'vypis' | 'robots' | 'mimo-okno' | 'chyba' | 'bez-obsahu'
  | 'cizi-domena' | 'jiny-format' | 'vynechano';

export interface ZaznamSeznamu {
  url: string;
  typ: TypPolozky | 'pdf' | 'karty';
  stav: StavPolozky;
  duvod?: string;
  nazev?: string;
  datum?: string | null;
  rodic?: string;
}

export const souborStavu = () => path.join(SLOZKA_DAT, 'stav.json');

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
