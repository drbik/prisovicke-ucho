import type { ZpravaModelu } from './prompt-upravy';
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
  // Krok 8: výstupy modelu pro odpověď a ověření v pořadí volání a vektor pro každý text.
  vystupyGenerovani?: string[];
  chybaGenerovani?: Error;
  vektor?: (text: string) => number[];
  ozvena?: boolean;
}

const PLATNY_VYSTUP = JSON.stringify({
  text: 'Toto je falešně upravený vzkaz pro lokální vývoj.',
  nazev: 'Falešný název vzkazu',
  oblast: 'ostatni',
  typ: 'navrh',
});

// Bez zadaných výstupů falešná AI na dotaz „neví“. Lokální vývoj tak vidí cestu k zastupitelům.
const NEVIM = JSON.stringify({ vety: [] });

export function vytvorFalesneAi({
  vysledek,
  chyba,
  vystupyUpravy,
  chybaUpravy,
  zpozdeniUpravyMs,
  vystupyGenerovani,
  chybaGenerovani,
  vektor,
  ozvena,
}: MoznostiFalesneAi = {}) {
  const volani: Uint8Array[] = [];
  const upravy: string[] = [];
  const generovani: ZpravaModelu[][] = [];
  const vektorovano: string[] = [];
  const zbyvajiciVystupy = [...(vystupyGenerovani ?? [])];
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
      // Zkouška vzhledu z telefonu: s ozvěnou vrátí lokální vývoj napsaný text beze změny.
      const vychozi = ozvena
        ? JSON.stringify({ text, nazev: 'Zkušební název vzkazu', oblast: 'ostatni', typ: text.includes('?') ? 'dotaz' : 'navrh' })
        : PLATNY_VYSTUP;
      const vystupy = [...(vystupyUpravy ?? [vychozi])];
      const { uprava, pokusu } = await upravitVzkaz(async () => vystupy.shift() ?? '', text);
      return { uprava, pokusu, model: 'falesny-model', verzePromptu: VERZE_PROMPTU };
    },
    modelOdpovedi: 'falesny-model-odpovedi',
    async vektory(texty) {
      vektorovano.push(...texty);
      return texty.map((text) => vektor?.(text) ?? [1, 0, 0]);
    },
    async generovat(zpravy) {
      generovani.push(zpravy);
      if (chybaGenerovani) throw chybaGenerovani;
      return zbyvajiciVystupy.shift() ?? NEVIM;
    },
  };
  return { ai, volani, upravy, generovani, vektorovano };
}
