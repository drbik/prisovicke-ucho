import type { SluzbaAi, VysledekPrepisu, VysledekUpravy } from './rozhrani';
import { VERZE_PROMPTU } from './prompt-upravy';
import { upravitVzkaz } from './uprava';

interface MoznostiFalesneAi {
  vysledek?: VysledekPrepisu;
  chyba?: Error;
  // Odpovědi jazykového modelu v pořadí pokusů. Bez nich jde úprava přes platný výstup.
  vystupyUpravy?: string[];
  chybaUpravy?: Error;
  zpozdeniUpravyMs?: number;
}

const PLATNY_VYSTUP = JSON.stringify({
  text: 'Toto je falešně upravený vzkaz pro lokální vývoj.',
  nazev: 'Falešný název vzkazu',
  oblast: 'ostatni',
  typ: 'navrh',
});

export function vytvorFalesneAi({ vysledek, chyba, vystupyUpravy, chybaUpravy, zpozdeniUpravyMs }: MoznostiFalesneAi = {}) {
  const volani: Uint8Array[] = [];
  const upravy: string[] = [];
  const ai: SluzbaAi = {
    async prepsat(audio) {
      volani.push(audio);
      if (chyba) throw chyba;
      return vysledek ?? { text: 'Toto je falešný přepis vzkazu pro lokální vývoj.', delkaS: 4, pocetSlov: 8 };
    },
    async upravit(text): Promise<VysledekUpravy> {
      upravy.push(text);
      if (chybaUpravy) throw chybaUpravy;
      if (zpozdeniUpravyMs) await new Promise((hotovo) => setTimeout(hotovo, zpozdeniUpravyMs));
      const vystupy = [...(vystupyUpravy ?? [PLATNY_VYSTUP])];
      const { uprava, pokusu } = await upravitVzkaz(async () => vystupy.shift() ?? '', text);
      return { uprava, pokusu, model: 'falesny-model', verzePromptu: VERZE_PROMPTU };
    },
  };
  return { ai, volani, upravy };
}
