// Rozšíření indexu z 10. 11. 2026 (se souhlasem Tomáše): text z dokumentů Word a ODT a text rozpoznaný OCR
// ze skenů. Tady jsou jen čisté funkce, převod samotný dělají Word a OCR ve Windows (word.ps1, ocr.ps1).
import { spojitRadky } from './pdf';

const RIDICI_ZNAKY = /[\u0000-\u0008\u000e-\u001f\u007f]/g;

// Text, který Word uložil jako prostý text (UTF-8). Odstavec je jeden řádek, buňky tabulky odděluje tabulátor.
// Výsledek: odstavce oddělené prázdným řádkem, řádky tabulky pod sebou s buňkami oddělenými „ | “.
export function textWordu(surovy: string) {
  const radky = surovy
    .replace(/^\ufeff/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\f\v]/g, '\n')
    .replace(RIDICI_ZNAKY, '')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .split('\n');
  const bloky: string[][] = [];
  let tabulka = false;
  for (const surovyRadek of radky) {
    const jeTabulka = /\S\t+\S/.test(surovyRadek.trim());
    const radek = surovyRadek
      .replace(/^[\t ]+|[\t ]+$/g, '')
      .replace(/[ ]*\t+[ ]*/g, ' | ')
      .replace(/ {2,}/g, ' ');
    if (!radek) {
      tabulka = false;
      continue;
    }
    const posledni = bloky.at(-1);
    const predchoziRadek = posledni?.at(-1) ?? '';
    // Řádky jedné tabulky zůstanou pohromadě, ostatní odstavce jsou samostatné bloky.
    // Enter uprostřed věty („zákon“ / „o odpadech“): řádek bez koncové interpunkce pokračuje malým písmenem.
    if (jeTabulka && tabulka) posledni!.push(radek);
    else if (!jeTabulka && !tabulka && posledni && /[^.!?:;]$/.test(predchoziRadek) && /^\p{Ll}/u.test(radek)) {
      posledni[posledni.length - 1] = `${predchoziRadek} ${radek}`;
    } else bloky.push([radek]);
    tabulka = jeTabulka;
  }
  return bloky.map((blok) => blok.join('\n')).join('\n\n');
}

// Text z OCR: řádky strany, slovo rozdělené na konci řádku se spojí. Odstavce OCR nerozlišuje.
export function textOcr(surovy: string) {
  const radky = surovy
    .replace(/\r\n?/g, '\n')
    .replace(RIDICI_ZNAKY, '')
    .split('\n')
    .map((radek) => radek.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return spojitRadky(radky);
}

// Je rozpoznaný text čitelný? Výkresy, mapy, razítka a podpisy dávají krátké útržky a samá čísla.
// Čitelná strana má aspoň 30 slov z písmen a ta tvoří aspoň pětinu útržků. Podle OCR 229 stran
// z 10. 11. 2026: výkresy a grafy mají do 25 slov, úřední text i s čísly parcel a tabulkami víc než 30.
export const MIN_SLOV_OCR = 30;
const MIN_PODIL_SLOV = 0.2;

export function jeCitelnyOcr(text: string) {
  const utrzky = text.split(/\s+/).filter(Boolean);
  const slova = utrzky.filter((utrzek) => /^[„"(]?\p{L}{3,}[.,;:!?)"“]*$/u.test(utrzek));
  return slova.length >= MIN_SLOV_OCR && slova.length / utrzky.length >= MIN_PODIL_SLOV;
}

// Pozvánka nebo plakát má málo slov (jarmark 20, koncert 15), stránka skenu stovky. Mapy a fotografie dají
// útržky s nízkým podílem slov (mapa objízdné trasy 7 z 34). Podle OCR 17 obrázků z 13. 11. 2026.
export const MIN_SLOV_OCR_OBRAZKU = 10;
const MIN_PODIL_SLOV_OBRAZKU = 0.4;

export function jeCitelnyObrazek(text: string) {
  const utrzky = text.split(/\s+/).filter(Boolean);
  const slova = utrzky.filter((utrzek) => /^[„"(]?\p{L}{3,}[.,;:!?)"“]*$/u.test(utrzek));
  return slova.length >= MIN_SLOV_OCR_OBRAZKU && slova.length / utrzky.length >= MIN_PODIL_SLOV_OBRAZKU;
}
