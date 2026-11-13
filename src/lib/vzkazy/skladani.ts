// Odpověď tématu se skládá z částí (13. 11. 2026, schválený návrh v docs/temata-feedu.md). AI ji nepřepisuje ani
// neshrnuje: každá věta vznikla cestou F-73 až F-76 a složení jen vybírá, čísluje zdroje a hlídá opakování a rozpor.
import type { SluzbaAi } from '../ai/rozhrani';
import type { CitovanyZdroj, VetaZobrazene } from '../odpovedi/odpoved';
import { cislaVTextu, normalizovat } from '../odpovedi/overeni';
import { kosinus } from './podobnost';
import { precistPosouzeni, zpravyPosouzeni, type VztahVet } from './prompt-temat';
import type { CastOdpovedi, ObsahCasti, OdpovedVzkazu, ZdrojCasti } from './typy';

// Dvojice vět s podobností embeddingu aspoň 0,75 posoudí model (měření: různé věci od 0,37 do 0,92, rozpor od 0,85,
// stejná věta jinými slovy 0,90). Pod 0,75 se věty považují za různé.
export const PRAH_PODOBNYCH_VET = 0.75;
const MAX_DVOJIC = 12;

type ZobrazitelnaOdpoved = {
  vety: VetaZobrazene[];
  casti?: { otazka: string; vety: VetaZobrazene[] }[];
  zdroje: CitovanyZdroj[];
  nezodpovezeno?: string[];
};

// Uložitelná podoba odpovědi: věty odkazují na zdroj adresou, ne číslem.
export function obsahZOdpovedi(o: ZobrazitelnaOdpoved): ObsahCasti {
  const url = new Map(o.zdroje.map((z) => [z.cislo, z.url]));
  const vety = (vety: VetaZobrazene[]) => vety.flatMap((v) => (url.has(v.zdroj) ? [{ text: v.text, url: url.get(v.zdroj)! }] : []));
  return {
    casti: o.casti?.length ? o.casti.map((c) => ({ otazka: c.otazka || null, vety: vety(c.vety) })) : [{ otazka: null, vety: vety(o.vety) }],
    zdroje: o.zdroje.map(({ url: adresa, nazev, datum, web, oznaceni, uryvek, misto }) => ({ url: adresa, nazev, datum, web, oznaceni, uryvek, misto })),
    ...(o.nezodpovezeno?.length ? { nezodpovezeno: o.nezodpovezeno } : {}),
  };
}

function spojitMisto(a: string, b: string) {
  return [...new Set([...a.split(', '), ...b.split(', ')].filter(Boolean))].join(', ');
}

// Hlavní odpověď je první, části poddotazů za ní od nejstarší. Části bez platného stavu se nezobrazí.
export function seraditCasti(casti: CastOdpovedi[]) {
  return casti.filter((c) => c.stav === 'platna')
    .sort((a, b) => Number(a.vzkazId !== null) - Number(b.vzkazId !== null) || a.vytvoreno.localeCompare(b.vytvoreno));
}

// Jedna odpověď tématu: zdroje se číslují přes celé téma podle adresy (jeden odkaz je jeden zdroj) a žádná věta
// se neukáže dvakrát. Část z právě zpracovaného poddotazu dostane „nova“.
export function slozitOdpoved(casti: CastOdpovedi[], novaCastId?: string | null): OdpovedVzkazu | undefined {
  const zdroje: CitovanyZdroj[] = [];
  const cisla = new Map<string, number>();
  const videne = new Set<string>();
  const vystup: { otazka: string; vety: VetaZobrazene[]; nova?: boolean }[] = [];
  const cisloZdroje = (zdroj: ZdrojCasti) => {
    let cislo = cisla.get(zdroj.url);
    if (cislo === undefined) {
      cislo = zdroje.length + 1;
      cisla.set(zdroj.url, cislo);
      zdroje.push({ ...zdroj, cislo });
    } else {
      const puvodni = zdroje[cislo - 1];
      if (!puvodni.uryvek.includes(zdroj.uryvek)) puvodni.uryvek = `${puvodni.uryvek} … ${zdroj.uryvek}`;
      puvodni.misto = spojitMisto(puvodni.misto, zdroj.misto);
    }
    return cislo;
  };
  for (const cast of seraditCasti(casti)) {
    const podleUrl = new Map(cast.obsah.zdroje.map((z) => [z.url, z]));
    for (const podcast of cast.obsah.casti) {
      const vety = podcast.vety.flatMap((v) => {
        const zdroj = podleUrl.get(v.url);
        const klic = normalizovat(v.text);
        // Věta bez zdroje se neukáže (F-74), opakovaná taky ne.
        if (!zdroj || videne.has(klic)) return [];
        videne.add(klic);
        return [{ text: v.text, zdroj: cisloZdroje(zdroj) }];
      });
      if (!vety.length) continue;
      const otazka = podcast.otazka ?? (cast.vzkazId ? cast.otazka ?? '' : '');
      vystup.push({ otazka, vety, ...(novaCastId && cast.id === novaCastId ? { nova: true } : {}) });
    }
  }
  if (!vystup.length) return undefined;
  const sCastmi = vystup.length > 1 || Boolean(vystup[0].otazka);
  return {
    vety: vystup.flatMap((c) => c.vety),
    ...(sCastmi ? { casti: vystup } : {}),
    zdroje,
    oznaceni: [...new Set(zdroje.map((z) => z.oznaceni))],
  };
}

// Pořadí data zdroje pro rozpor: „zveřejněno 24. 9. 2025“ → 2025-09-24, „nahráno 1/2024“ → 2024-01-00.
// Neznámé datum je prázdné, takže nikdy není novější.
export function poradiData(datum: string) {
  const den = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(datum);
  if (den) return `${den[3]}-${den[2].padStart(2, '0')}-${den[1].padStart(2, '0')}`;
  const mesic = /(\d{1,2})\/(\d{4})/.exec(datum);
  return mesic ? `${mesic[2]}-${mesic[1].padStart(2, '0')}-00` : '';
}

// Obsah bez vybraných vět. Zdroje, na které už žádná věta neodkazuje, odpadnou. Prázdný obsah je null.
export function zbytekObsahu(obsah: ObsahCasti, odebrat: (text: string, poradi: number) => boolean): ObsahCasti | null {
  let poradi = 0;
  const casti = obsah.casti
    .map((c) => ({ otazka: c.otazka, vety: c.vety.filter((v) => !odebrat(v.text, poradi++)) }))
    .filter((c) => c.vety.length);
  if (!casti.length) return null;
  const pouzite = new Set(casti.flatMap((c) => c.vety.map((v) => v.url)));
  return { ...obsah, casti, zdroje: obsah.zdroje.filter((z) => pouzite.has(z.url)) };
}

export interface PorovnaniVet {
  // Nová část bez opakovaných vět a bez vět, které vyvrátil novější zdroj. Null, když nic nezbylo.
  obsah: ObsahCasti | null;
  // Starší části, jejichž věty vyvrátil novější zdroj: id části → texty vyvrácených vět.
  nahradit: Map<string, Set<string>>;
  opakovanych: number;
  rozporu: number;
  posouzeno: number;
  posouzeniSelhalo: boolean;
}

interface VetaKPorovnani {
  text: string;
  datum: string;
  castId?: string;
}

function vetySObsahu(obsah: ObsahCasti, castId?: string): VetaKPorovnani[] {
  const datum = new Map(obsah.zdroje.map((z) => [z.url, poradiData(z.datum)]));
  return obsah.casti.flatMap((c) => c.vety.map((v) => ({ text: v.text, datum: datum.get(v.url) ?? '', ...(castId ? { castId } : {}) })));
}

const stejnaCisla = (a: string, b: string) => {
  const ca = cislaVTextu(a);
  const cb = cislaVTextu(b);
  return ca.size === cb.size && [...ca].every((c) => cb.has(c));
};

// Nová část proti platným částem tématu. Stejnou větu (i jinými slovy) zahodí, při rozporu vyhraje novější zdroj.
// Model jen rozhoduje o dvojicích vět, žádný text nepíše. Když selže, platí záložní pravidlo podle čísel.
export async function porovnatVety(platne: CastOdpovedi[], nova: ObsahCasti, ai: SluzbaAi): Promise<PorovnaniVet> {
  const existujici = platne.flatMap((c) => vetySObsahu(c.obsah, c.id));
  const nove = vetySObsahu(nova);
  const vysledek: PorovnaniVet = { obsah: null, nahradit: new Map(), opakovanych: 0, rozporu: 0, posouzeno: 0, posouzeniSelhalo: false };
  const zahodit = new Set<number>();

  // Doslova stejná věta (bez ohledu na mezery a velikost písmen), i opakovaná uvnitř nové části.
  const znama = new Set(existujici.map((v) => normalizovat(v.text)));
  nove.forEach((v, i) => {
    const klic = normalizovat(v.text);
    if (znama.has(klic)) {
      zahodit.add(i);
      vysledek.opakovanych += 1;
    }
    znama.add(klic);
  });

  const zbyvajici = nove.map((v, i) => ({ ...v, i })).filter((v) => !zahodit.has(v.i));
  if (existujici.length && zbyvajici.length) {
    let vektory: number[][] | null = null;
    try {
      vektory = await ai.vektory([...existujici.map((v) => v.text), ...zbyvajici.map((v) => v.text)]);
    } catch {
      vysledek.posouzeniSelhalo = true;
    }
    if (vektory) {
      const dvojice = zbyvajici.flatMap((n, k) => existujici.map((e, j) => ({
        nova: n,
        stara: e,
        podobnost: kosinus(vektory![existujici.length + k], vektory![j]),
      }))).filter((d) => d.podobnost >= PRAH_PODOBNYCH_VET)
        .sort((a, b) => b.podobnost - a.podobnost)
        .slice(0, MAX_DVOJIC);
      if (dvojice.length) {
        let soudy: (VztahVet | null)[] = dvojice.map(() => null);
        try {
          const vystup = await ai.generovat(zpravyPosouzeni(dvojice.map((d) => ({ a: d.stara.text, b: d.nova.text }))), { maxTokenu: 40 + 25 * dvojice.length });
          soudy = precistPosouzeni(vystup, dvojice.length);
        } catch {
          vysledek.posouzeniSelhalo = true;
        }
        vysledek.posouzeno = dvojice.length;
        dvojice.forEach((d, k) => {
          // Záložní pravidlo: velmi podobná věta se stejnými čísly je opakování, jinak se nechá.
          const soud = soudy[k] ?? (d.podobnost >= 0.9 && stejnaCisla(d.stara.text, d.nova.text) ? 'stejne' : 'jine');
          if (zahodit.has(d.nova.i) || soud === 'jine') return;
          if (soud === 'stejne') {
            zahodit.add(d.nova.i);
            vysledek.opakovanych += 1;
            return;
          }
          vysledek.rozporu += 1;
          // Rozpor: novější zdroj vyhraje (jako prompt odpovědi verze 5). Starší věta se nesmaže, její část půjde
          // ke kontrole. Bez novějšího data zůstává stará věta a nová se zahodí.
          if (d.nova.datum && d.nova.datum > d.stara.datum && d.stara.castId) {
            const texty = vysledek.nahradit.get(d.stara.castId) ?? new Set<string>();
            texty.add(d.stara.text);
            vysledek.nahradit.set(d.stara.castId, texty);
          } else {
            zahodit.add(d.nova.i);
          }
        });
      }
    }
  }
  vysledek.obsah = zbytekObsahu(nova, (_text, poradi) => zahodit.has(poradi));
  return vysledek;
}
