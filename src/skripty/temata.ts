// Hledání v přehledu témat. Text každého tématu připraví stránka do data-hledani (bez diakritiky),
// tady se jen porovná se začátky napsaných slov. Bez skriptu přehled funguje, jen se v něm nedá hledat.
import { kmenyDotazu, odpovidaHledani } from '../lib/temata/normalizace';
import { vytvoritMluvci } from './mluvci';

const koren = document.querySelector<HTMLElement>('[data-temata]');
const pole = koren?.querySelector<HTMLInputElement>('[data-temata-hledat]');

if (koren && pole) {
  const sloupce = [...koren.querySelectorAll<HTMLElement>('[data-temata-sloupec]')];

  const filtrovat = () => {
    const kmeny = kmenyDotazu(pole.value);
    for (const sloupec of sloupce) {
      let videt = 0;
      for (const tema of sloupec.querySelectorAll<HTMLElement>('[data-tema]')) {
        const shoda = odpovidaHledani(tema.dataset.hledani ?? '', kmeny);
        tema.hidden = !shoda;
        if (shoda) videt += 1;
      }
      for (const pocet of koren.querySelectorAll(`[data-temata-pocet="${sloupec.dataset.temataSloupec}"]`)) {
        pocet.textContent = String(videt);
      }
      const nic = sloupec.querySelector<HTMLElement>('[data-temata-nic]');
      if (nic) nic.hidden = videt > 0;
    }
  };

  pole.addEventListener('input', filtrovat);
  // Prohlížeč po návratu na stránku může pole předvyplnit.
  if (pole.value) filtrovat();
}

// Alternativní mluvčí u zodpovězených ukázek (13. 11. 2026). Server ukázku najde podle id.
for (const misto of document.querySelectorAll<HTMLElement>('[data-mluvci-ukazka]')) {
  const id = misto.dataset.mluvciUkazka;
  if (id) misto.replaceChildren(vytvoritMluvci({ ukazka: id }));
}
// Tlačítka jsou až v rozbalené ukázce. Nápověda nad seznamem a štítek u ukázky říkají, že tam jsou.
for (const napoveda of document.querySelectorAll<HTMLElement>('[data-mluvci-napoveda]')) napoveda.hidden = false;
