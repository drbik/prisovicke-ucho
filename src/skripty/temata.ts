// Feed vedle ucha po tématech (13. 11. 2026, F-33 až F-37): jedna položka na téma s odpovědí tématu, poddotazy
// a připojenými vzkazy. Filtry stavu a typu a hledání nahoře. Data přinese stránka v <script id="feed-data">.
// Změněné téma z panelu přijde událostí „ucho:zmena-tematu“, skok na téma událostí „ucho:ukazat-tema“
// (posílá je src/skripty/podani.ts).
import { TYPY_PODNETU } from '../lib/oblasti';
import { JMENA_STYLU } from '../lib/odpovedi/mluvci';
import { kmenyDotazu, odpovidaHledani, proHledani } from '../lib/temata/normalizace';
import type { TemaFeedu } from '../lib/vzkazy/typy';
import { ceskeDatum, element, metaTematu, popisVztahu, vytvoritOdpovedTematu } from './odpoved-tematu';

const koren = document.querySelector<HTMLElement>('[data-feed]');
const seznam = koren?.querySelector<HTMLUListElement>('[data-feed-seznam]');
const pole = koren?.querySelector<HTMLInputElement>('[data-feed-hledat]');
const nic = koren?.querySelector<HTMLElement>('[data-feed-nic]');

function stylVzkazu(styl: TemaFeedu['styl'], textStylu?: string) {
  if (!styl || styl === 'spisovne' || !textStylu) return null;
  const detail = element('details', 'polozka__styl');
  detail.append(element('summary', '', `Ve stylu: ${JMENA_STYLU[styl]}`), element('p', 'polozka__text-stylu', textStylu));
  return detail;
}

function vytvoritPolozku(t: TemaFeedu) {
  const li = element('li', `polozka polozka--${t.stav}`);
  li.id = `tema-${t.id}`;
  li.dataset.stav = t.stav;
  li.dataset.typ = t.typ;
  li.dataset.hledani = proHledani([
    t.nazev, t.text, TYPY_PODNETU[t.typ], ...t.vzkazy.map((v) => v.text), ...(t.odpoved?.vety.map((v) => v.text) ?? []), ...t.cekajici,
  ].join(' '));

  const detail = element('details', 'polozka__detail');
  const souhrn = element('summary', 'polozka__souhrn');
  souhrn.append(element('span', 'polozka__nazev', t.nazev), metaTematu(t));

  const telo = element('div', 'polozka__telo');
  telo.append(element('blockquote', 'prepis', t.text));
  const styl = stylVzkazu(t.styl, t.textStylu);
  if (styl) telo.append(styl);
  if (t.odpoved) {
    telo.append(vytvoritOdpovedTematu(t.odpoved, `tema-${t.id}`));
  } else {
    telo.append(element('p', 'drobne', t.typ === 'dotaz'
      ? 'Ucho odpověď na webu obce ani na webu Nezávislých pro Příšovice nenašlo. Dotaz čeká na odpověď člověka.'
      : 'Návrhy, stížnosti a pochvaly ucho na webu nehledá. Téma čeká na vyjádření.'));
  }
  if (t.cekajici.length) {
    const cekajici = element('div', 'polozka__cekajici');
    const seznamCekajicich = element('ul');
    for (const otazka of t.cekajici) seznamCekajicich.append(element('li', '', otazka));
    cekajici.append(element('h4', '', 'Čeká na odpověď'), seznamCekajicich);
    telo.append(cekajici);
  }
  if (t.vzkazy.length) {
    const vzkazy = element('details', 'polozka__vzkazy');
    vzkazy.append(element('summary', '', `${t.ukazka ? 'Vzkazy k tématu' : 'Další vzkazy k tématu'} (${t.vzkazy.length})`));
    const seznamVzkazu = element('ul');
    for (const v of t.vzkazy) {
      const polozka = element('li');
      polozka.append(
        element('p', 'polozka__vztah', `${popisVztahu(v.vztah, t.typ)} · ${ceskeDatum(v.datum)}`),
        element('blockquote', 'prepis', v.text),
      );
      const stylV = stylVzkazu(v.styl, v.textStylu);
      if (stylV) polozka.append(stylV);
      seznamVzkazu.append(polozka);
    }
    vzkazy.append(seznamVzkazu);
    telo.append(vzkazy);
  }
  detail.append(souhrn, telo);
  li.append(detail);
  return li;
}

if (koren && seznam && pole && nic) {
  let temata: TemaFeedu[] = [];
  try {
    temata = JSON.parse(document.getElementById('feed-data')?.textContent ?? '[]') as TemaFeedu[];
  } catch {
    temata = [];
  }
  const filtr = { stav: '', typ: '' };
  const prvky = new Map<string, HTMLLIElement>();

  const filtrovat = () => {
    const kmeny = kmenyDotazu(pole.value);
    let videt = 0;
    const pocty: Record<string, number> = { '': 0, zodpovezeno: 0, ceka: 0 };
    for (const li of seznam.children as HTMLCollectionOf<HTMLLIElement>) {
      const shodaTypu = !filtr.typ || li.dataset.typ === filtr.typ;
      const shodaHledani = odpovidaHledani(li.dataset.hledani ?? '', kmeny);
      if (shodaTypu && shodaHledani) {
        pocty[''] += 1;
        pocty[li.dataset.stav ?? ''] += 1;
      }
      li.hidden = !(shodaTypu && shodaHledani && (!filtr.stav || li.dataset.stav === filtr.stav));
      if (!li.hidden) videt += 1;
    }
    for (const pocet of koren.querySelectorAll<HTMLElement>('[data-feed-pocet]')) pocet.textContent = String(pocty[pocet.dataset.feedPocet ?? ''] ?? 0);
    nic.hidden = videt > 0;
  };

  const nastavitFiltr = (druh: 'stav' | 'typ', hodnota: string) => {
    filtr[druh] = hodnota;
    for (const tlacitko of koren.querySelectorAll<HTMLElement>(`[data-filtr="${druh}"]`)) {
      tlacitko.setAttribute('aria-pressed', String(tlacitko.dataset.hodnota === hodnota));
    }
    filtrovat();
  };

  // Změněné téma nahradí svou starší podobu a přesune se na začátek.
  const pridat = (tema: TemaFeedu, naZacatek: boolean) => {
    const li = vytvoritPolozku(tema);
    prvky.get(tema.id)?.remove();
    prvky.set(tema.id, li);
    if (naZacatek) seznam.prepend(li);
    else seznam.append(li);
  };

  // Skok na téma: filtry se vynulují, téma se rozbalí a krátce zvýrazní.
  const ukazat = (id: string) => {
    const li = prvky.get(id);
    if (!li) return;
    pole.value = '';
    nastavitFiltr('typ', '');
    nastavitFiltr('stav', '');
    li.querySelector('details')?.setAttribute('open', '');
    li.scrollIntoView({ behavior: 'smooth', block: 'start' });
    li.classList.add('polozka--zvyraznena');
    li.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true });
    setTimeout(() => li.classList.remove('polozka--zvyraznena'), 2500);
  };

  for (const tema of temata) pridat(tema, false);
  filtrovat();

  for (const tlacitko of koren.querySelectorAll<HTMLElement>('[data-filtr]')) {
    tlacitko.addEventListener('click', () => nastavitFiltr(tlacitko.dataset.filtr === 'typ' ? 'typ' : 'stav', tlacitko.dataset.hodnota ?? ''));
  }
  pole.addEventListener('input', filtrovat);

  document.addEventListener('ucho:zmena-tematu', (udalost) => {
    pridat((udalost as CustomEvent<TemaFeedu>).detail, true);
    filtrovat();
  });
  document.addEventListener('ucho:ukazat-tema', (udalost) => ukazat((udalost as CustomEvent<string>).detail));
}
