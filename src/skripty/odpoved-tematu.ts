// Společné vykreslení tématu pro feed a pro nabídku podobných témat v panelu (13. 11. 2026, F-34, F-37).
// Modul nemá vedlejší účinky, importují ho src/skripty/temata.ts i src/skripty/podani.ts.
import { TYPY_PODNETU } from '../lib/oblasti';
import { UPOZORNENI } from '../lib/odpovedi/zdroje';
import { STAVY_FEEDU, type OdpovedVzkazu, type TemaFeedu, type VztahVzkazu } from '../lib/vzkazy/typy';

// Odkaz smí vést jen na zdroje indexu.
const POVOLENY_ZDROJ = /^https:\/\/(?:prisovice\.cz|nezavisli-prisovice\.cz)\//;

export function element<K extends keyof HTMLElementTagNameMap>(znacka: K, trida = '', text = '') {
  const el = document.createElement(znacka);
  if (trida) el.className = trida;
  if (text) el.textContent = text;
  return el;
}

export function ceskeDatum(iso: string) {
  const [rok, mesic, den] = iso.split('-').map(Number);
  return `${den}. ${mesic}. ${rok}`;
}

export function pocetVzkazu(pocet: number) {
  return `${pocet} ${pocet === 1 ? 'vzkaz' : pocet >= 2 && pocet <= 4 ? 'vzkazy' : 'vzkazů'}`;
}

export function popisVztahu(vztah: VztahVzkazu, typ: TemaFeedu['typ']) {
  if (vztah === 'poddotaz') return 'Ptá se na víc';
  if (vztah === 'doplneni') return 'Doplňuje';
  if (vztah === 'zakladatel') return 'Založil téma';
  return typ === 'dotaz' ? 'Ptá se na totéž' : 'Říká totéž';
}

function odstavecVet(predpona: string, vety: { text: string; zdroj: number }[]) {
  const odstavec = element('p');
  for (const veta of vety) {
    const odkaz = element('a', '', String(veta.zdroj));
    odkaz.href = `#${predpona}-zdroj-${veta.zdroj}`;
    odkaz.setAttribute('aria-label', `zdroj ${veta.zdroj}`);
    const index = element('sup');
    index.append(odkaz);
    odstavec.append(veta.text, index, ' ');
  }
  return odstavec;
}

// Odpověď tématu: hlavní odpověď bez nadpisu, části poddotazů pod svou otázkou, zdroje číslované přes celé téma.
// Používá ji feed i nabídka podobných témat v panelu.
export function vytvoritOdpovedTematu(odpoved: OdpovedVzkazu, predpona: string, zdrojeSbalene = false) {
  const obal = document.createDocumentFragment();
  obal.append(element('p', 'odpoved__oznaceni', odpoved.oznaceni.join(' · ')));
  const text = element('div', 'odpoved__text');
  for (const cast of odpoved.casti ?? [{ otazka: '', vety: odpoved.vety }]) {
    if (cast.otazka) text.append(element('h4', 'odpoved__cast', cast.otazka));
    text.append(odstavecVet(predpona, cast.vety));
  }
  const zdroje = element('ol', 'odpoved__zdroje');
  for (const zdroj of odpoved.zdroje) {
    const polozka = element('li');
    polozka.id = `${predpona}-zdroj-${zdroj.cislo}`;
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
  if (zdrojeSbalene) {
    const sbalene = element('details', 'odpoved__sbalene-zdroje');
    sbalene.append(element('summary', '', `Zdroje (${odpoved.zdroje.length})`), zdroje);
    obal.append(text, sbalene);
  } else {
    obal.append(text, element('h4', 'odpoved__zdroje-titulek', 'Zdroje'), zdroje);
  }
  obal.append(element('p', 'drobne', UPOZORNENI));
  return obal;
}

export function metaTematu(t: TemaFeedu) {
  const meta = element('span', 'polozka__meta');
  const tecka = element('span', `polozka__tecka polozka__tecka--${t.stav}`);
  tecka.setAttribute('aria-hidden', 'true');
  meta.append(tecka, [
    STAVY_FEEDU[t.stav],
    TYPY_PODNETU[t.typ],
    t.ukazka ? 'Ukázka' : '',
    t.pocet ? pocetVzkazu(t.pocet) : '',
    !t.ukazka && t.zmeneno ? ceskeDatum(t.zmeneno) : '',
  ].filter(Boolean).join(' · '));
  return meta;
}

