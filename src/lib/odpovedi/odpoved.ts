import type { SluzbaAi } from '../ai/rozhrani';
import { PRAH_PODOBNOSTI, hledatUseky } from './hledani';
import { ZamitnutaOdpoved, overitKodem, precistOdpoved, precistOvereni, type DuvodZamitnuti } from './overeni';
import { VERZE_PROMPTU_ODPOVEDI, zpravyOdpovedi, zpravyOvereni } from './prompt-odpovedi';
import type { IndexZdroju } from './rozhrani';
import type { NalezenyUsek, WebZdroje } from './typy';
import { OZNACENI_ZDROJE, UPOZORNENI, datumZdroje, odkazNaZdroj } from './zdroje';

export interface CitovanyZdroj {
  cislo: number;
  url: string;
  nazev: string;
  datum: string;
  web: WebZdroje;
  oznaceni: string;
  uryvek: string;
}

export interface ZobrazenaOdpoved {
  vety: { text: string; zdroj: number }[];
  zdroje: CitovanyZdroj[];
  oznaceni: string[];
  upozorneni: string;
}

export type DuvodPredani =
  | 'nic-nenalezeno'
  | 'model-nevi'
  | 'chyba-ai'
  | DuvodZamitnuti;

export interface TechnickeOdpovedi {
  useku: number;
  nejlepsiPodobnost: number;
  hledaniMs: number;
  odpovedMs?: number;
  overeniMs?: number;
  model: string;
  verzePromptu: number;
}

export type VysledekOdpovedi =
  | { vysledek: 'odpoved'; odpoved: ZobrazenaOdpoved; technicke: TechnickeOdpovedi }
  | { vysledek: 'zastupitelum'; duvod: DuvodPredani; technicke: TechnickeOdpovedi };

export interface ZavislostiOdpovedi {
  ai: SluzbaAi;
  index: IndexZdroju;
  ted?: () => number;
  prahPodobnosti?: number;
  // Jen pro vyhodnocení (8.8): které úseky hledání našlo. Do logu nic z toho nejde.
  naHledani?: (useky: NalezenyUsek[], nejlepsiPodobnost: number) => void;
}

const MAX_TOKENU_ODPOVEDI = 900;
const MAX_TOKENU_OVERENI = 200;

// Odpověď ukáže citace v pořadí prvního použití. Jeden úsek je jeden zdroj, i když z něj čerpá víc vět.
function sestavitOdpoved(vety: { veta: string; usek: number; citace: string }[], useky: NalezenyUsek[]): ZobrazenaOdpoved {
  const poradi = new Map<number, number>();
  const zdroje: CitovanyZdroj[] = [];
  const vystup = vety.map((veta) => {
    let cislo = poradi.get(veta.usek);
    if (cislo === undefined) {
      const usek = useky[veta.usek - 1];
      cislo = zdroje.length + 1;
      poradi.set(veta.usek, cislo);
      zdroje.push({
        cislo,
        url: odkazNaZdroj(usek.dokument, usek.strana),
        nazev: usek.dokument.nazev,
        datum: datumZdroje(usek.dokument),
        web: usek.dokument.web,
        oznaceni: OZNACENI_ZDROJE[usek.dokument.web],
        uryvek: veta.citace,
      });
    } else if (!zdroje[cislo - 1].uryvek.includes(veta.citace)) {
      zdroje[cislo - 1].uryvek = `${zdroje[cislo - 1].uryvek} … ${veta.citace}`;
    }
    return { text: veta.veta, zdroj: cislo };
  });
  return {
    vety: vystup,
    zdroje,
    oznaceni: [...new Set(zdroje.map((z) => z.oznaceni))],
    upozorneni: UPOZORNENI,
  };
}

// F-73 až F-76: hledání, odpověď jen z úryvků a ověření. Když cokoli neprojde, dotaz jde zastupitelům.
export async function odpovedetNaDotaz(dotaz: string, z: ZavislostiOdpovedi): Promise<VysledekOdpovedi> {
  const ted = z.ted ?? Date.now;
  const zacatek = ted();
  const [vektor] = await z.ai.vektory([dotaz]);
  const hledani = await hledatUseky(z.index, vektor, dotaz);
  z.naHledani?.(hledani.useky, hledani.nejlepsiPodobnost);
  const technicke: TechnickeOdpovedi = {
    useku: hledani.useky.length,
    nejlepsiPodobnost: Math.round(hledani.nejlepsiPodobnost * 1000) / 1000,
    hledaniMs: ted() - zacatek,
    model: z.ai.modelOdpovedi,
    verzePromptu: VERZE_PROMPTU_ODPOVEDI,
  };
  if (!hledani.useky.length || hledani.nejlepsiPodobnost < (z.prahPodobnosti ?? PRAH_PODOBNOSTI)) {
    return { vysledek: 'zastupitelum', duvod: 'nic-nenalezeno', technicke };
  }

  const predOdpovedi = ted();
  const vystup = await z.ai.generovat(zpravyOdpovedi(dotaz, hledani.useky), { maxTokenu: MAX_TOKENU_ODPOVEDI });
  technicke.odpovedMs = ted() - predOdpovedi;
  try {
    const navrzene = precistOdpoved(vystup);
    if (!navrzene.length) return { vysledek: 'zastupitelum', duvod: 'model-nevi', technicke };
    const vety = overitKodem(navrzene, hledani.useky);
    const predOverenim = ted();
    const kOvereni = vety.map((v) => ({ ...v, zdroj: hledani.useky[v.usek - 1].hlavicka }));
    const overeni = await z.ai.generovat(zpravyOvereni(dotaz, kOvereni), { maxTokenu: MAX_TOKENU_OVERENI });
    technicke.overeniMs = ted() - predOverenim;
    precistOvereni(overeni, vety.length);
    return { vysledek: 'odpoved', odpoved: sestavitOdpoved(vety, hledani.useky), technicke };
  } catch (chyba) {
    if (chyba instanceof ZamitnutaOdpoved) return { vysledek: 'zastupitelum', duvod: chyba.duvod, technicke };
    throw chyba;
  }
}
