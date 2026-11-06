import type { SluzbaAi, VysledekPrepisu } from './rozhrani';

interface MoznostiFalesneAi {
  vysledek?: VysledekPrepisu;
  chyba?: Error;
}

export function vytvorFalesneAi({ vysledek, chyba }: MoznostiFalesneAi = {}) {
  const volani: Uint8Array[] = [];
  const ai: SluzbaAi = {
    async prepsat(audio) {
      volani.push(audio);
      if (chyba) throw chyba;
      return vysledek ?? { text: 'Toto je falešný přepis vzkazu pro lokální vývoj.', delkaS: 4, pocetSlov: 8 };
    },
  };
  return { ai, volani };
}
