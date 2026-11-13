import type { ZpravaModelu } from './prompt-upravy';
import type { UpravaVzkazu } from './uprava';

export interface VysledekPrepisu {
  text: string;
  delkaS?: number;
  pocetSlov?: number;
}

export interface VysledekUpravy {
  uprava: UpravaVzkazu;
  model: string;
  verzePromptu: number;
  pokusu: number;
}

// AI je za vlastním rozhraním, aby šel poskytovatel vyměnit a testy běžely bez sítě (krok 1.3).
export interface SluzbaAi {
  prepsat(audio: Uint8Array): Promise<VysledekPrepisu>;
  upravit(text: string): Promise<VysledekUpravy>;
  // Odpovědi z webu (krok 8): embeddingy pro hledání a jazykový model pro odpověď a její ověření.
  readonly modelOdpovedi: string;
  vektory(texty: string[]): Promise<number[][]>;
  // Přeřazení nalezených úseků: ke každému textu skóre 0 až 1, jak dobře odpovídá na dotaz. Nepovinné,
  // bez něj hledání bere pořadí z vektorů a fulltextu.
  preradit?(dotaz: string, texty: string[]): Promise<number[]>;
  // Teplota je bez zadání 0: odpověď a ověření mají být co nejstálejší. Vyšší chce jen převyprávění mluvčím.
  generovat(zpravy: ZpravaModelu[], moznosti: { maxTokenu: number; teplota?: number }): Promise<string>;
}
