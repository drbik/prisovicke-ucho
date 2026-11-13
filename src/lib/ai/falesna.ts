import { POKYNY_ROZDELENI } from '../odpovedi/prompt-odpovedi';
import { ZACATEK_POKYNU_STYLU, ZACATEK_POKYNU_VZKAZU } from '../odpovedi/styl';
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
  // Výstupy rozdělení dotazu na části v pořadí volání. Bez nich se dotaz nerozdělí a hledá se celý.
  vystupyRozdeleni?: string[];
  ozvena?: boolean;
  // Lokální vývoj: zdržení hledání a odpovědi, aby byl na stránce vidět průběh.
  zpozdeniMs?: number;
}

const pockat = (ms?: number) => (ms ? new Promise((hotovo) => setTimeout(hotovo, ms)) : Promise.resolve());

// Ozvěna rozdělí dotaz podle otazníků, aby šel průběh po částech zkusit i bez skutečné AI.
function rozdelitOzvenou(zpravy: ZpravaModelu[]) {
  const dotaz = (zpravy[1]?.content ?? '').replace(/^<dotaz>\n|\n<\/dotaz>$/g, '');
  const otazky = dotaz.split(/(?<=\?)\s+/).map((otazka) => otazka.trim()).filter((otazka) => otazka.endsWith('?'));
  return JSON.stringify({ casti: otazky.length > 1 ? otazky : [dotaz] });
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
  vystupyRozdeleni,
  ozvena,
  zpozdeniMs,
}: MoznostiFalesneAi = {}) {
  const volani: Uint8Array[] = [];
  const upravy: string[] = [];
  const generovani: ZpravaModelu[][] = [];
  const vektorovano: string[] = [];
  const zbyvajiciVystupy = [...(vystupyGenerovani ?? [])];
  const zbyvajiciRozdeleni = [...(vystupyRozdeleni ?? [])];
  const rozdeleni: string[] = [];
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
      // Různě dlouhé části trvají různě dlouho, aby se na stránce střídaly hotové a hledané.
      await pockat(zpozdeniMs && (zpozdeniMs * (1 + ((texty[0]?.length ?? 0) % 3))) / 2);
      return texty.map((text) => vektor?.(text) ?? [1, 0, 0]);
    },
    async generovat(zpravy) {
      // Rozdělení dotazu má vlastní frontu výstupů, aby testy odpovědí nemusely počítat s dalším voláním.
      if (zpravy[0]?.content === POKYNY_ROZDELENI) {
        rozdeleni.push(zpravy[1]?.content ?? '');
        if (chybaGenerovani) throw chybaGenerovani;
        return zbyvajiciRozdeleni.shift() ?? (ozvena ? rozdelitOzvenou(zpravy) : JSON.stringify({ casti: [] }));
      }
      generovani.push(zpravy);
      await pockat(zpozdeniMs);
      if (chybaGenerovani) throw chybaGenerovani;
      // Lokální vývoj: postava vrátí odpověď nebo vzkaz beze změny s poznámkou na začátku.
      const pokyny = zpravy[0]?.content ?? '';
      if (ozvena && !zbyvajiciVystupy.length && (pokyny.startsWith(ZACATEK_POKYNU_STYLU) || pokyny.startsWith(ZACATEK_POKYNU_VZKAZU))) {
        const text = /<(odpoved|vzkaz)>\n([\s\S]*)\n<\/\1>/.exec(zpravy[1]?.content ?? '')?.[2] ?? '';
        return `(Falešná AI, styl se lokálně nezkouší.) ${text}`;
      }
      return zbyvajiciVystupy.shift() ?? NEVIM;
    },
  };
  return { ai, volani, upravy, generovani, vektorovano, rozdeleni };
}
