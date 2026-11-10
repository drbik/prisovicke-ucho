import { normalizovat } from './overeni';
import type { NalezenyUsek } from './typy';

// Nadpis oddílu na začátku řádku: „čl. 9“, „Článek 3“, „§ 12“. Odkaz uprostřed věty („podle § 59 zákona“)
// nadpis není, proto se bere jen začátek řádku.
const NADPIS_ODDILU = /^[ \t]*(?<druh>čl\.|článek|§)[ \t]*(?<cislo>\d+[a-z]?)(?![\p{L}\d])/gimu;
const NADPIS_ODDILU_NA_ZACATKU = /^[ \t]*(?:čl\.|článek|§)[ \t]*\d+[a-z]?(?![\p{L}\d])/imu;
// Číslovaný odstavec na začátku řádku: „3) Text“ nebo „(3) Text“.
const ODSTAVEC = /^[ \t]*\(?(?<cislo>\d{1,2})\)[ \t]/gmu;

// Kde v původním textu úseku začíná hledaný text. Porovnává se stejně jako v ověření (bez mezer, velikosti písmen
// a typografie), proto se text projde po znacích a zapamatuje se, odkud který znak normalizovaného textu pochází.
function polohaVTextu(text: string, hledany: string) {
  const hledanyNorm = normalizovat(hledany);
  if (!hledanyNorm) return -1;
  let norm = '';
  const odkud: number[] = [];
  let i = 0;
  for (const znak of text) {
    const n = normalizovat(znak);
    for (let k = 0; k < n.length; k += 1) odkud.push(i);
    norm += n;
    i += znak.length;
  }
  const poloha = norm.indexOf(hledanyNorm);
  return poloha === -1 ? -1 : odkud[poloha];
}

// Oddíl dokumentu, ve kterém stojí citace: „čl. 9“, „čl. 1 odst. 3“, „§ 12“. Odvozuje ho kód z textu úseku,
// ne model: poslední nadpis před citací. Když ho v úseku není (nadpis je v předchozím úseku, nebo ho OCR zkomolilo),
// vrátí null a zdroj ukáže jen stranu.
export function oddilCitace(usek: NalezenyUsek, citace: string): string | null {
  const prvniCast = citace.split(' … ')[0];
  let poloha = -1;
  for (const varianta of [prvniCast, prvniCast.replace(/[.,;:]+$/, '')]) {
    poloha = polohaVTextu(usek.text, varianta);
    if (poloha !== -1) break;
  }
  if (poloha === -1) return null;

  // Citace může nadpis oddílu sama obsahovat („čl.9 V obou jezerech…“). Pak se počítá i s ním.
  const predCitaci = `${usek.text.slice(0, poloha)}\n${NADPIS_ODDILU_NA_ZACATKU.exec(prvniCast)?.[0] ?? ''}`;
  let nadpis: RegExpMatchArray | null = null;
  for (const shoda of predCitaci.matchAll(NADPIS_ODDILU)) nadpis = shoda;
  if (!nadpis?.groups) return null;

  const oddil = nadpis.groups.druh === '§' ? `§ ${nadpis.groups.cislo}` : `čl. ${nadpis.groups.cislo}`;
  // Odstavec má smysl jen uvnitř tohoto oddílu, tedy za nadpisem.
  const zaNadpisem = predCitaci.slice((nadpis.index ?? 0) + nadpis[0].length);
  let odstavec: RegExpMatchArray | null = null;
  for (const shoda of zaNadpisem.matchAll(ODSTAVEC)) odstavec = shoda;
  return odstavec?.groups ? `${oddil} odst. ${odstavec.groups.cislo}` : oddil;
}
