// Feed vedle ucha (13. 11. 2026): témata od poslední změny, za nimi ukázky od týmu se štítkem Ukázka (F-33).
import type { TemaFeedu } from './typy';

export { sestavitFeed, temaZUkazky } from './temata';

export const POCET_VE_FEEDU = 200;

// Data feedu jdou do stránky jako JSON v <script type="application/json">. „<“ se escapuje, aby text vzkazu
// nemohl ukončit značku script.
export function feedDoStranky(temata: TemaFeedu[]) {
  return JSON.stringify(temata).replace(/</g, '\\u003c');
}
