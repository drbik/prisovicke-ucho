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
  generovat(zpravy: ZpravaModelu[], moznosti: { maxTokenu: number }): Promise<string>;
}
