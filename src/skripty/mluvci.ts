// Alternativní mluvčí (13. 11. 2026): řada tlačítek pod odpovědí. Kliknutí nechá AI převyprávět odpověď hlasem
// postavy. Převyprávění je jen v rámečku pod tlačítky, věcná odpověď a zdroje zůstávají beze změny.
import { JMENA_MLUVCICH, KLICE_MLUVCICH, type KlicMluvciho } from '../lib/odpovedi/mluvci';
import type { PodkladPrevypraveni, VysledekPrevypraveni } from '../lib/odpovedi/styl';

const API_STYLU = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/odpoved/styl`;
const NEZVLADL = 'Tenhle mluvčí to tentokrát nezvládl. Platí věcná odpověď.';
const LIMIT = 'Během chvilky přišlo moc převyprávění. Počkejte prosím minutu a zkuste to znovu.';
const BEZ_SPOJENI = 'Spojení se nepodařilo. Zkontrolujte připojení a zkuste to znovu.';

export type ZdrojPrevypraveni = { ukazka: string } | { podklad: PodkladPrevypraveni; podpis: string };

let poradi = 0;

export function vytvoritMluvci(zdroj: ZdrojPrevypraveni) {
  const id = `mluvci-${++poradi}`;
  const koren = document.createElement('div');
  koren.className = 'mluvci';

  const titulek = document.createElement('p');
  titulek.className = 'mluvci__titulek';
  titulek.id = `${id}-titulek`;
  titulek.textContent = 'Převyprávět jako';

  const volby = document.createElement('div');
  volby.className = 'mluvci__volby';
  volby.setAttribute('role', 'group');
  volby.setAttribute('aria-labelledby', titulek.id);

  const ramecek = document.createElement('div');
  ramecek.className = 'mluvci__ramecek';
  ramecek.id = `${id}-ramecek`;
  ramecek.hidden = true;
  ramecek.setAttribute('aria-live', 'polite');
  const stitek = document.createElement('p');
  stitek.className = 'mluvci__stitek';
  const text = document.createElement('p');
  text.className = 'mluvci__text';
  const poznamka = document.createElement('p');
  poznamka.className = 'drobne';
  poznamka.textContent = 'Převyprávěla AI pro pobavení. Platí věcná odpověď a zdroje.';
  ramecek.append(stitek, text, poznamka);

  // Hotová převyprávění se pamatují, opakované kliknutí na stejného mluvčího nic nestojí.
  const hotova = new Map<KlicMluvciho, string>();
  let aktivni: KlicMluvciho | null = null;
  let probihajici: AbortController | null = null;

  const tlacitka = KLICE_MLUVCICH.map((klic) => {
    const tlacitko = document.createElement('button');
    tlacitko.type = 'button';
    tlacitko.className = 'mluvci__volba';
    tlacitko.textContent = JMENA_MLUVCICH[klic];
    tlacitko.setAttribute('aria-pressed', 'false');
    tlacitko.setAttribute('aria-controls', ramecek.id);
    tlacitko.addEventListener('click', () => void zvolit(klic));
    return tlacitko;
  });
  volby.append(...tlacitka);

  function oznacit(klic: KlicMluvciho | null) {
    aktivni = klic;
    tlacitka.forEach((tlacitko, i) => tlacitko.setAttribute('aria-pressed', String(KLICE_MLUVCICH[i] === klic)));
  }

  function ukazat(obsah: string | HTMLElement, nacita = false) {
    text.replaceChildren(obsah);
    ramecek.setAttribute('aria-busy', String(nacita));
    ramecek.hidden = false;
  }

  async function zvolit(klic: KlicMluvciho) {
    probihajici?.abort();
    // Druhé kliknutí na zvoleného mluvčího převyprávění zavře.
    if (aktivni === klic) {
      oznacit(null);
      ramecek.hidden = true;
      return;
    }
    oznacit(klic);
    stitek.textContent = `Pro pobavení · ${JMENA_MLUVCICH[klic]}`;
    const ulozene = hotova.get(klic);
    if (ulozene) {
      ukazat(ulozene);
      return;
    }
    const nacitani = document.createElement('span');
    const toceni = document.createElement('span');
    toceni.className = 'toceni';
    toceni.setAttribute('aria-hidden', 'true');
    nacitani.append(toceni, `${JMENA_MLUVCICH[klic]} si odpověď čte a přemýšlí…`);
    ukazat(nacitani, true);

    const rizeni = new AbortController();
    probihajici = rizeni;
    let vysledek: string;
    try {
      const odpoved = await fetch(API_STYLU, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mluvci: klic, ...zdroj }),
        signal: rizeni.signal,
      });
      const data = await odpoved.json().catch(() => null) as VysledekPrevypraveni | null;
      if (odpoved.status === 429) vysledek = LIMIT;
      else if (odpoved.ok && data?.vysledek === 'prevypraveno') {
        vysledek = data.text;
        hotova.set(klic, data.text);
      } else vysledek = NEZVLADL;
    } catch (chyba) {
      if (chyba instanceof DOMException && chyba.name === 'AbortError') return;
      vysledek = BEZ_SPOJENI;
    } finally {
      if (probihajici === rizeni) probihajici = null;
    }
    if (aktivni === klic && !rizeni.signal.aborted) ukazat(vysledek);
  }

  koren.append(titulek, volby, ramecek);
  return koren;
}
