// Krok 8.4: text z PDF po stranách přes pdfjs-dist (čistý JavaScript, bez dalších programů).
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Strana s méně znaky se počítá jako sken bez textové vrstvy (krok 8, architektura).
export const MIN_ZNAKU_STRANY = 50;

const balicek = path.dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'));
const cMapUrl = pathToFileURL(path.join(balicek, 'cmaps') + path.sep).href;
const standardFontDataUrl = pathToFileURL(path.join(balicek, 'standard_fonts') + path.sep).href;

interface PolozkaTextu {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
}

export interface StranaPdf {
  strana: number;
  text: string;
}

// Složí řádky z položek textu. Nový řádek začíná při změně svislé polohy, odstavec při větší mezeře.
function slozitStranu(polozky: PolozkaTextu[]) {
  const radky: { y: number; vyska: number; text: string }[] = [];
  let radek: { y: number; vyska: number; text: string; konecX: number } | null = null;
  for (const polozka of polozky) {
    if (!polozka.str && !polozka.hasEOL) continue;
    const x = polozka.transform[4];
    const y = polozka.transform[5];
    const vyska = Math.abs(polozka.height) || Math.abs(polozka.transform[3]) || 10;
    if (radek && Math.abs(y - radek.y) <= vyska * 0.5) {
      const mezera = x - radek.konecX;
      if (mezera > vyska * 0.15 && !/\s$/.test(radek.text) && !/^\s/.test(polozka.str)) radek.text += ' ';
      radek.text += polozka.str;
      radek.konecX = x + polozka.width;
    } else if (polozka.str) {
      if (radek) radky.push(radek);
      radek = { y, vyska, text: polozka.str, konecX: x + polozka.width };
    }
    if (polozka.hasEOL && radek) {
      radky.push(radek);
      radek = null;
    }
  }
  if (radek) radky.push(radek);

  const odstavce: string[][] = [];
  let predchozi: { y: number; vyska: number } | null = null;
  for (const r of radky) {
    const text = r.text.replace(/[\u00a0\u2007\u202f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const novyOdstavec = !predchozi || Math.abs(predchozi.y - r.y) > Math.max(predchozi.vyska, r.vyska) * 1.8;
    if (novyOdstavec || !odstavce.length) odstavce.push([text]);
    else odstavce.at(-1)!.push(text);
    predchozi = r;
  }
  return odstavce.map((o) => spojitRadky(o)).join('\n\n');
}

// Slovo rozdělené na konci řádku spojí, když další řádek začíná malým písmenem.
export function spojitRadky(radky: string[]) {
  let vysledek = '';
  for (const radek of radky) {
    if (!vysledek) vysledek = radek;
    else if (/\p{L}-$/u.test(vysledek) && /^\p{Ll}/u.test(radek)) vysledek = vysledek.slice(0, -1) + radek;
    else vysledek += `\n${radek}`;
  }
  return vysledek;
}

const otiskRadku = (radek: string) => radek.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase();

// Záhlaví (nejvýš 4 řádky) a zápatí (nejvýš 2 řádky), které se opakují na většině stran, se odstraní.
// Číslo strany se při porovnání nepočítá. Zápatí je přísnější: zápisy často končí stranu stejným
// „Usnesení přijato.“, a to je obsah. Proto jde pryč jen řádek s číslem (strana, datum), nebo řádek
// na skoro každé straně.
const ZAHLAVI = 4;
const ZAPATI = 2;

export function odstranitOpakovane(strany: StranaPdf[]) {
  if (strany.length < 3) return strany;
  const pocty = new Map<string, number>();
  const okraje = (text: string) => {
    const radky = text.split('\n').filter((r) => r.trim());
    return [...new Set([...radky.slice(0, ZAHLAVI), ...radky.slice(-ZAPATI)].map(otiskRadku))];
  };
  for (const s of strany) for (const o of okraje(s.text)) pocty.set(o, (pocty.get(o) ?? 0) + 1);
  const opakovane = new Set([...pocty].filter(([, n]) => n >= Math.max(3, strany.length * 0.5)).map(([o]) => o));
  if (!opakovane.size) return strany;
  const jeZapati = (otisk: string) => opakovane.has(otisk) && (otisk.includes('#') || (pocty.get(otisk) ?? 0) >= strany.length * 0.8);
  return strany.map((s) => {
    const radky = s.text.split('\n');
    let zacatek = 0;
    let konec = radky.length;
    for (let odebrano = 0; zacatek < konec && odebrano < ZAHLAVI; zacatek += 1) {
      if (!radky[zacatek].trim()) continue;
      if (!opakovane.has(otiskRadku(radky[zacatek]))) break;
      odebrano += 1;
    }
    for (let odebrano = 0; konec > zacatek && odebrano < ZAPATI; konec -= 1) {
      if (!radky[konec - 1].trim()) continue;
      if (!jeZapati(otiskRadku(radky[konec - 1]))) break;
      odebrano += 1;
    }
    return { ...s, text: radky.slice(zacatek, konec).join('\n').trim() };
  });
}

export async function textPdf(data: Uint8Array): Promise<StranaPdf[]> {
  const uloha = getDocument({
    data,
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl,
    disableFontFace: true,
    useSystemFonts: false,
    verbosity: 0,
  });
  const dokument = await uloha.promise;
  try {
    const strany: StranaPdf[] = [];
    for (let cislo = 1; cislo <= dokument.numPages; cislo += 1) {
      const strana = await dokument.getPage(cislo);
      const obsah = await strana.getTextContent();
      strany.push({ strana: cislo, text: slozitStranu(obsah.items as PolozkaTextu[]) });
      strana.cleanup();
    }
    return odstranitOpakovane(strany);
  } finally {
    await uloha.destroy();
  }
}
