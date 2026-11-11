import { jeOblast, jeTyp, type SlugOblasti, type TypPodnetu } from '../oblasti';
import { MAX_ZNAKU_NAZVU } from '../podani/limity';
import { sestavitZpravy, type ZpravaModelu } from './prompt-upravy';

const MAX_POKUSU = 2;

export interface UpravaVzkazu {
  text: string;
  nazev: string;
  oblast: SlugOblasti;
  typ: TypPodnetu;
}

// Hláška jde do logu, proto v ní nesmí být nic z výstupu modelu.
export class NeplatnyVystup extends Error {}

function vyjmoutJson(vystup: string) {
  const zacatek = vystup.indexOf('{');
  const konec = vystup.lastIndexOf('}');
  if (zacatek === -1 || konec < zacatek) throw new NeplatnyVystup('Výstup neobsahuje JSON.');
  try {
    return JSON.parse(vystup.slice(zacatek, konec + 1)) as Record<string, unknown>;
  } catch {
    throw new NeplatnyVystup('Výstup není platný JSON.');
  }
}

function neprazdny(hodnota: unknown) {
  return typeof hodnota === 'string' ? hodnota.trim() : '';
}

// Workers AI JSON nezaručuje, výstup proto vždy ověřuje kód (F-13, krok 3.2).
export function precistUpravu(vystup: string): UpravaVzkazu {
  const data = vyjmoutJson(vystup);
  const text = neprazdny(data.text);
  const nazev = neprazdny(data.nazev);
  if (!text) throw new NeplatnyVystup('Chybí upravený text.');
  if (!nazev) throw new NeplatnyVystup('Chybí název.');
  if (nazev.length > MAX_ZNAKU_NAZVU) throw new NeplatnyVystup('Název je příliš dlouhý.');
  if (!jeOblast(data.oblast)) throw new NeplatnyVystup('Neznámá oblast.');
  if (!jeTyp(data.typ)) throw new NeplatnyVystup('Neznámý typ.');
  return { text, nazev, oblast: data.oblast, typ: data.typ };
}

export async function upravitVzkaz(generovat: (zpravy: ZpravaModelu[]) => Promise<string>, text: string) {
  const zpravy = sestavitZpravy(text);
  for (let pokus = 1; ; pokus += 1) {
    try {
      return { uprava: precistUpravu(await generovat(zpravy)), pokusu: pokus };
    } catch (chyba) {
      if (!(chyba instanceof NeplatnyVystup) || pokus >= MAX_POKUSU) throw chyba;
    }
  }
}
