// Alternativní mluvčí (13. 11. 2026): volání serveru a rámeček s odpovědí hlasem postavy. Postavu volí autor
// kolem tlačítka ucha, viz podani.ts.
import { JMENA_MLUVCICH, type KlicMluvciho } from '../lib/odpovedi/mluvci';
import type { PodepsanyPodklad, VysledekPrevypraveni } from '../lib/odpovedi/styl';

const ZAKLAD = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;
const LIMIT = 'Během chvilky přišlo moc požadavků na postavy. Počkejte prosím minutu a zkuste to znovu.';
const BEZ_SPOJENI = 'Spojení se nepodařilo. Zkontrolujte připojení a zkuste to znovu.';

export type VysledekStylu = { text: string; podpis?: string } | { chyba: string };

async function zavolat(cesta: string, telo: Record<string, unknown>, mluvci: KlicMluvciho, signal?: AbortSignal): Promise<VysledekStylu> {
  try {
    const odpoved = await fetch(`${ZAKLAD}${cesta}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mluvci, ...telo }),
      signal,
    });
    if (odpoved.status === 429) return { chyba: LIMIT };
    const data = await odpoved.json().catch(() => null) as (VysledekPrevypraveni & { podpis?: string }) | null;
    if (odpoved.ok && data?.vysledek === 'prevypraveno') return { text: data.text, ...(data.podpis ? { podpis: data.podpis } : {}) };
    return { chyba: `${JMENA_MLUVCICH[mluvci]} to tentokrát nezvládl.` };
  } catch (chyba) {
    if (chyba instanceof DOMException && chyba.name === 'AbortError') throw chyba;
    return { chyba: BEZ_SPOJENI };
  }
}

// Autorův vzkaz hlasem postavy. Vstupem je spisovné znění z AI úpravy.
export function stylizovatVzkaz(text: string, mluvci: KlicMluvciho, signal?: AbortSignal) {
  return zavolat('/vzkaz/styl', { text }, mluvci, signal);
}

function nacitani(text: string) {
  const obsah = document.createElement('span');
  const toceni = document.createElement('span');
  toceni.className = 'toceni';
  toceni.setAttribute('aria-hidden', 'true');
  obsah.append(toceni, text);
  return obsah;
}

export { nacitani as ukazatelNacitani };

// Odpověď hlasem postavy: rámeček se načte sám. Věcná odpověď se zdroji je pod ním a platí.
export function vytvoritPrevypraveni(zdroj: PodepsanyPodklad, mluvci: KlicMluvciho) {
  const jmeno = JMENA_MLUVCICH[mluvci];
  const ramecek = document.createElement('div');
  ramecek.className = 'mluvci__ramecek';
  ramecek.setAttribute('aria-live', 'polite');
  ramecek.setAttribute('aria-busy', 'true');
  const stitek = document.createElement('p');
  stitek.className = 'mluvci__stitek';
  stitek.textContent = `Odpovídá ${jmeno} · pro pobavení`;
  const text = document.createElement('p');
  text.className = 'mluvci__text';
  text.append(nacitani(`${jmeno} si odpověď čte a přemýšlí…`));
  const poznamka = document.createElement('p');
  poznamka.className = 'drobne';
  poznamka.textContent = 'Převyprávěla AI pro pobavení. Platí věcný text a zdroje níže.';
  ramecek.append(stitek, text, poznamka);

  const rizeni = new AbortController();
  void zavolat('/odpoved/styl', { podklad: zdroj.podklad, podpis: zdroj.podpis }, mluvci, rizeni.signal)
    .then((vysledek) => {
      text.replaceChildren('text' in vysledek ? vysledek.text : `${vysledek.chyba} Platí věcný text níže.`);
      ramecek.setAttribute('aria-busy', 'false');
    })
    .catch(() => {});
  return { ramecek, zrusit: () => rizeni.abort() };
}
