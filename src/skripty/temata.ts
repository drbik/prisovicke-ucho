// Feed vedle ucha (13. 11. 2026): jednoduchý seznam s filtry stavu a typu a s hledáním. Data přinese stránka
// v <script id="feed-data">. Nový vzkaz z panelu přijde událostí „ucho:novy-vzkaz“, skok na téma událostí
// „ucho:ukazat-tema“ (posílá je src/skripty/podani.ts).
import { TYPY_PODNETU } from '../lib/oblasti';
import { JMENA_STYLU } from '../lib/odpovedi/mluvci';
import { UPOZORNENI } from '../lib/odpovedi/zdroje';
import { kmenyDotazu, odpovidaHledani, proHledani } from '../lib/temata/normalizace';
import { STAVY_FEEDU, type PolozkaFeedu } from '../lib/vzkazy/typy';

// Odkaz smí vést jen na zdroje indexu.
const POVOLENY_ZDROJ = /^https:\/\/(?:prisovice\.cz|nezavisli-prisovice\.cz)\//;

const koren = document.querySelector<HTMLElement>('[data-feed]');
const seznam = koren?.querySelector<HTMLUListElement>('[data-feed-seznam]');
const pole = koren?.querySelector<HTMLInputElement>('[data-feed-hledat]');
const nic = koren?.querySelector<HTMLElement>('[data-feed-nic]');

function element<K extends keyof HTMLElementTagNameMap>(znacka: K, trida = '', text = '') {
  const el = document.createElement(znacka);
  if (trida) el.className = trida;
  if (text) el.textContent = text;
  return el;
}

function ceskeDatum(iso: string) {
  const [rok, mesic, den] = iso.split('-').map(Number);
  return `${den}. ${mesic}. ${rok}`;
}

function odstavecVet(polozka: PolozkaFeedu, vety: { text: string; zdroj: number }[]) {
  const odstavec = element('p');
  for (const veta of vety) {
    const odkaz = element('a', '', String(veta.zdroj));
    odkaz.href = `#tema-${polozka.id}-zdroj-${veta.zdroj}`;
    odkaz.setAttribute('aria-label', `zdroj ${veta.zdroj}`);
    const index = element('sup');
    index.append(odkaz);
    odstavec.append(veta.text, index, ' ');
  }
  return odstavec;
}

function vytvoritPolozku(p: PolozkaFeedu) {
  const li = element('li', `polozka polozka--${p.stav}`);
  li.id = `tema-${p.id}`;
  li.dataset.stav = p.stav;
  li.dataset.typ = p.typ;
  li.dataset.hledani = proHledani([p.nazev, p.text, TYPY_PODNETU[p.typ], ...(p.odpoved?.vety.map((v) => v.text) ?? [])].join(' '));

  const detail = element('details', 'polozka__detail');
  const souhrn = element('summary', 'polozka__souhrn');
  const meta = element('span', 'polozka__meta');
  const tecka = element('span', `polozka__tecka polozka__tecka--${p.stav}`);
  tecka.setAttribute('aria-hidden', 'true');
  meta.append(tecka, [STAVY_FEEDU[p.stav], TYPY_PODNETU[p.typ], p.ukazka ? 'Ukázka' : p.datum ? ceskeDatum(p.datum) : '']
    .filter(Boolean).join(' · '));
  if (p.styl !== 'spisovne') meta.append(' · ', element('span', 'polozka__postava', JMENA_STYLU[p.styl]));
  souhrn.append(element('span', 'polozka__nazev', p.nazev), meta);

  const telo = element('div', 'polozka__telo');
  telo.append(element('blockquote', 'prepis', p.text));
  if (p.textStylu) {
    const styl = element('details', 'polozka__styl');
    styl.append(element('summary', '', `Ve stylu: ${JMENA_STYLU[p.styl]}`), element('p', 'polozka__text-stylu', p.textStylu));
    telo.append(styl);
  }
  if (p.podobny) {
    const podobny = element('p', 'polozka__podobny', 'Podobný dotaz už má odpověď: ');
    const odkaz = element('a', '', p.podobny.nazev);
    odkaz.href = `#tema-${p.podobny.id}`;
    odkaz.dataset.tema = p.podobny.id;
    podobny.append(odkaz);
    telo.append(podobny);
  }
  if (p.odpoved) {
    telo.append(element('p', 'odpoved__oznaceni', p.odpoved.oznaceni.join(' · ')));
    const text = element('div', 'odpoved__text');
    if (p.odpoved.casti?.length) {
      for (const cast of p.odpoved.casti) text.append(element('h4', 'odpoved__cast', cast.otazka), odstavecVet(p, cast.vety));
    } else {
      text.append(odstavecVet(p, p.odpoved.vety));
    }
    telo.append(text, element('h4', 'odpoved__zdroje-titulek', 'Zdroje'));
    const zdroje = element('ol', 'odpoved__zdroje');
    for (const zdroj of p.odpoved.zdroje) {
      const polozka = element('li');
      polozka.id = `tema-${p.id}-zdroj-${zdroj.cislo}`;
      const nazev = element(POVOLENY_ZDROJ.test(zdroj.url) ? 'a' : 'span', '', zdroj.nazev);
      if (nazev instanceof HTMLAnchorElement) {
        nazev.href = zdroj.url;
        nazev.target = '_blank';
        nazev.rel = 'noopener noreferrer';
      }
      polozka.append(
        element('span', 'zdroj__oznaceni', zdroj.oznaceni),
        nazev,
        element('span', 'zdroj__datum', zdroj.misto ? `${zdroj.datum} · ${zdroj.misto}` : zdroj.datum),
        element('blockquote', 'zdroj__uryvek', `„${zdroj.uryvek}“`),
      );
      zdroje.append(polozka);
    }
    telo.append(zdroje, element('p', 'drobne', UPOZORNENI));
  } else {
    telo.append(element('p', 'drobne', p.typ === 'dotaz'
      ? 'Ucho odpověď na webu obce ani na webu Nezávislých pro Příšovice nenašlo. Dotaz čeká na odpověď člověka.'
      : 'Návrhy, stížnosti a pochvaly ucho na webu nehledá. Vzkaz čeká na vyjádření.'));
  }
  detail.append(souhrn, telo);
  li.append(detail);
  return li;
}

if (koren && seznam && pole && nic) {
  let polozky: PolozkaFeedu[] = [];
  try {
    polozky = JSON.parse(document.getElementById('feed-data')?.textContent ?? '[]') as PolozkaFeedu[];
  } catch {
    polozky = [];
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

  // Uložený vzkaz, který autor potvrdil znovu, nahradí svou starší podobu.
  const pridat = (polozka: PolozkaFeedu, naZacatek: boolean) => {
    const li = vytvoritPolozku(polozka);
    prvky.get(polozka.id)?.remove();
    prvky.set(polozka.id, li);
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

  for (const polozka of polozky) pridat(polozka, false);
  filtrovat();

  for (const tlacitko of koren.querySelectorAll<HTMLElement>('[data-filtr]')) {
    tlacitko.addEventListener('click', () => nastavitFiltr(tlacitko.dataset.filtr === 'typ' ? 'typ' : 'stav', tlacitko.dataset.hodnota ?? ''));
  }
  pole.addEventListener('input', filtrovat);

  seznam.addEventListener('click', (udalost) => {
    const odkaz = (udalost.target as HTMLElement).closest<HTMLAnchorElement>('a[data-tema]');
    if (!odkaz?.dataset.tema) return;
    udalost.preventDefault();
    ukazat(odkaz.dataset.tema);
  });
  document.addEventListener('ucho:novy-vzkaz', (udalost) => {
    pridat((udalost as CustomEvent<PolozkaFeedu>).detail, true);
    filtrovat();
  });
  document.addEventListener('ucho:ukazat-tema', (udalost) => ukazat((udalost as CustomEvent<string>).detail));
}
