// Feed vedle ucha (13. 11. 2026): uložené vzkazy od nejnovějšího, za nimi ukázky od týmu se štítkem Ukázka.
import { UKAZKOVA_TEMATA, type UkazkoveTema } from '../temata/temata';
import type { PolozkaFeedu } from './typy';

export const POCET_VE_FEEDU = 200;

export function polozkaUkazky(tema: UkazkoveTema): PolozkaFeedu {
  return {
    id: tema.id,
    ukazka: true,
    nazev: tema.nazev,
    text: tema.text,
    typ: tema.typ,
    oblast: tema.oblast,
    stav: tema.stav === 'zodpovezeno-z-webu' ? 'zodpovezeno' : 'ceka',
    styl: 'spisovne',
    ...(tema.odpoved ? { odpoved: { vety: tema.odpoved.vety, zdroje: tema.odpoved.zdroje, oznaceni: tema.odpoved.oznaceni } } : {}),
  };
}

export const NAZVY_UKAZEK = new Map(UKAZKOVA_TEMATA.map((t) => [t.id, t.nazev]));

export function sestavitFeed(ulozene: PolozkaFeedu[], ukazky: UkazkoveTema[] = UKAZKOVA_TEMATA) {
  return [...ulozene, ...ukazky.map(polozkaUkazky)];
}

// Data feedu jdou do stránky jako JSON v <script type="application/json">. „<“ se escapuje, aby text vzkazu
// nemohl ukončit značku script.
export function feedDoStranky(polozky: PolozkaFeedu[]) {
  return JSON.stringify(polozky).replace(/</g, '\\u003c');
}
