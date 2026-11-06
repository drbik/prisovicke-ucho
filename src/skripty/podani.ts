import { formatovatCas } from '../lib/nahravani/casovac';
import type { DruhChybyMikrofonu } from '../lib/nahravani/format';
import { ChybaMikrofonu, spustitNahravani, type HotovaNahravka, type Nahravani } from '../lib/nahravani/nahravac';
import type { KodChyby } from '../lib/podani/chyby';
import { MAX_ZNAKU_TEXTU, MIN_DELKA_NAHRAVKY_S, MIN_ZNAKU_TEXTU, jeTextPlatny } from '../lib/podani/limity';
import type { TechnickeUdaje, VysledekPodani } from '../lib/podani/zpracovani';

type Pohled = 'zadost' | 'nahravani' | 'odesilani' | 'text' | 'vysledek' | 'chyba';

const API = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/vzkaz`;

const DUVODY_BEZ_MIKROFONU: Record<DruhChybyMikrofonu, string> = {
  zakazano: 'Mikrofon je pro tuto stránku zakázaný. Povolte ho v nastavení prohlížeče, nebo vzkaz napište.',
  chybi: 'V zařízení jsme nenašli mikrofon. Vzkaz můžete napsat.',
  obsazeno: 'Mikrofon teď používá jiná aplikace. Zavřete ji, nebo vzkaz napište.',
  nepodporovano: 'Tento prohlížeč nahrávání nepodporuje. Vzkaz můžete napsat.',
  jina: 'Mikrofon se nepodařilo spustit. Vzkaz můžete napsat.',
};

const TEXTY_CHYB: Partial<Record<KodChyby, string>> = {
  'limit-pozadavku': 'Během chvilky přišlo moc vzkazů. Počkejte prosím minutu a zkuste to znovu.',
  'spatny-typ': 'Tento formát nahrávky neumíme zpracovat. Vzkaz prosím napište.',
  'prilis-velke': 'Nahrávka je příliš velká. Vzkaz prosím napište.',
  'prazdna-nahravka': 'Nahrávka je prázdná. Zkontrolujte mikrofon a zkuste to znovu.',
  'prazdny-prepis': 'V nahrávce jsme nezachytili žádnou řeč. Zkuste to znovu, nebo vzkaz napište.',
  'prepis-selhal': 'Přepis se nepovedl. Nahrávka zůstává ve vašem prohlížeči, můžete ji poslat znovu.',
};
const OBECNA_CHYBA = 'Něco se nepovedlo. Zkuste to prosím znovu.';
const CHYBA_SITE = 'Spojení se nepodařilo. Zkontrolujte připojení a zkuste to znovu.';

function prvek<T extends HTMLElement>(selektor: string, koren: ParentNode = document) {
  const nalezeny = koren.querySelector<T>(selektor);
  if (!nalezeny) throw new Error(`Na stránce chybí ${selektor}.`);
  return nalezeny;
}

const panel = prvek<HTMLDialogElement>('#podani-panel');
const oznameni = prvek('[data-oznameni]', panel);
const cas = prvek('[data-cas]', panel);
const hladina = prvek('[data-hladina]', panel);
const upozorneni = prvek('[data-upozorneni]', panel);
const vysvetleni = prvek('[data-vysvetleni]', panel);
const pole = prvek<HTMLTextAreaElement>('[data-pole]', panel);
const pocet = prvek('[data-pocet]', panel);
const chybaTextu = prvek('[data-chyba-textu]', panel);
const odeslatText = prvek<HTMLButtonElement>('[data-odeslat]', panel);
const vysledek = prvek('[data-vysledek]', panel);
const technicke = prvek('[data-technicke]', panel);
const technickeSeznam = prvek('[data-technicke-seznam]', panel);
const textChyby = prvek('[data-chyba]', panel);
const opakovat = prvek<HTMLButtonElement>('[data-opakovat]', panel);

let nahravani: Nahravani | null = null;
let odeslani: AbortController | null = null;
let poOpakovani: () => void = () => {};
// Zavření panelu zneplatní rozběhnutý pokus, třeba když čeká na povolení mikrofonu.
let cisloPokusu = 0;

function ukazat(pohled: Pohled, hlaseni = '') {
  for (const sekce of panel.querySelectorAll<HTMLElement>('[data-pohled]')) {
    sekce.hidden = sekce.dataset.pohled !== pohled;
  }
  if (!panel.open) panel.showModal();
  oznameni.textContent = hlaseni;
  const sekce = prvek(`[data-pohled="${pohled}"]`, panel);
  (sekce.querySelector<HTMLElement>('[data-fokus]') ?? sekce.querySelector<HTMLElement>('h2'))?.focus();
}

function ukazatChybu(text: string, opakovani: () => void) {
  textChyby.textContent = text;
  poOpakovani = opakovani;
  ukazat('chyba', text);
}

function ukazatText(duvod = '') {
  vysvetleni.textContent = duvod;
  vysvetleni.hidden = !duvod;
  chybaTextu.hidden = true;
  ukazat('text', duvod);
}

function ukazatTechnicke(udaje?: TechnickeUdaje) {
  technicke.hidden = !udaje;
  technickeSeznam.replaceChildren();
  if (!udaje) return;
  const radky: [string, string][] = [
    ['Formát', udaje.typ],
    ['Velikost', `${(udaje.velikostB / 1024).toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} kB`],
    ['Přepis trval', `${(udaje.prepisMs / 1000).toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} s`],
  ];
  if (udaje.delkaS !== undefined) radky.push(['Délka podle Whisperu', formatovatCas(udaje.delkaS)]);
  for (const [nazev, hodnota] of radky) {
    const dt = document.createElement('dt');
    dt.textContent = nazev;
    const dd = document.createElement('dd');
    dd.textContent = hodnota;
    technickeSeznam.append(dt, dd);
  }
}

function ukazatVysledek(data: VysledekPodani) {
  vysledek.textContent = data.text;
  ukazatTechnicke(data.technicke);
  ukazat('vysledek', 'Přepis je hotový.');
}

async function odeslat(cesta: string, init: RequestInit) {
  odeslani = new AbortController();
  try {
    const odpoved = await fetch(`${API}/${cesta}`, { ...init, method: 'POST', signal: odeslani.signal });
    const data: unknown = await odpoved.json().catch(() => null);
    if (odpoved.ok) return { data: data as VysledekPodani };
    return { chyba: TEXTY_CHYB[(data as { chyba?: KodChyby } | null)?.chyba as KodChyby] ?? OBECNA_CHYBA };
  } catch (chyba) {
    if (chyba instanceof DOMException && chyba.name === 'AbortError') return { zruseno: true };
    return { chyba: CHYBA_SITE };
  } finally {
    odeslani = null;
  }
}

async function odeslatNahravku(nahravka: HotovaNahravka) {
  ukazat('odesilani', 'Přepisuji vzkaz.');
  const vystup = await odeslat('hlas', { headers: { 'content-type': nahravka.typ }, body: nahravka.blob });
  if (vystup.zruseno) return;
  if (vystup.data) ukazatVysledek(vystup.data);
  else ukazatChybu(vystup.chyba ?? OBECNA_CHYBA, () => void odeslatNahravku(nahravka));
}

function poDokonceni(nahravka: HotovaNahravka) {
  nahravani = null;
  if (nahravka.delkaS < MIN_DELKA_NAHRAVKY_S) {
    ukazatChybu('Nahrávka je moc krátká. Podržte mikrofon zapnutý aspoň dvě sekundy.', () => void zacitNahravat());
    return;
  }
  void odeslatNahravku(nahravka);
}

async function zacitNahravat() {
  const pokus = ++cisloPokusu;
  cas.textContent = '0:00';
  hladina.style.transform = 'scaleX(0)';
  upozorneni.hidden = true;
  ukazat('zadost');
  try {
    const bezici = await spustitNahravani({
      naCas: (uplynulo) => { cas.textContent = formatovatCas(uplynulo); },
      naUpozorneni: () => {
        upozorneni.hidden = false;
        oznameni.textContent = 'Zbývá 30 sekund.';
      },
      naHlasitost: (uroven) => { hladina.style.transform = `scaleX(${uroven})`; },
      naKonec: poDokonceni,
      naChybu: () => {
        nahravani = null;
        ukazatText(DUVODY_BEZ_MIKROFONU.jina);
      },
    });
    if (pokus !== cisloPokusu) {
      bezici.zrusit();
      return;
    }
    nahravani = bezici;
    ukazat('nahravani', 'Nahrávám.');
  } catch (chyba) {
    if (pokus !== cisloPokusu) return;
    ukazatText(DUVODY_BEZ_MIKROFONU[chyba instanceof ChybaMikrofonu ? chyba.druh : 'jina']);
  }
}

async function odeslatFormular(udalost: SubmitEvent) {
  udalost.preventDefault();
  const text = pole.value;
  if (!jeTextPlatny(text)) {
    chybaTextu.textContent = `Vzkaz musí mít ${MIN_ZNAKU_TEXTU} až ${MAX_ZNAKU_TEXTU.toLocaleString('cs-CZ')} znaků.`;
    chybaTextu.hidden = false;
    pole.focus();
    return;
  }
  chybaTextu.hidden = true;
  odeslatText.disabled = true;
  const vystup = await odeslat('text', {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  odeslatText.disabled = false;
  if (vystup.zruseno) return;
  if (vystup.data) {
    pole.value = '';
    pocet.textContent = '0';
    ukazatVysledek(vystup.data);
  } else {
    chybaTextu.textContent = vystup.chyba ?? OBECNA_CHYBA;
    chybaTextu.hidden = false;
  }
}

prvek('[data-nahrat]').addEventListener('click', () => void zacitNahravat());
prvek('[data-napsat]').addEventListener('click', () => ukazatText());
prvek('[data-hotovo]', panel).addEventListener('click', () => nahravani?.dokoncit());
prvek('[data-zavrit]', panel).addEventListener('click', () => panel.close());
prvek('[data-novy]', panel).addEventListener('click', () => panel.close());
prvek('[data-prejit-na-text]', panel).addEventListener('click', () => ukazatText());
opakovat.addEventListener('click', () => poOpakovani());
for (const zrusit of panel.querySelectorAll('[data-zrusit]')) zrusit.addEventListener('click', () => panel.close());

pole.addEventListener('input', () => { pocet.textContent = String(pole.value.length); });
prvek<HTMLFormElement>('[data-formular]', panel).addEventListener('submit', (udalost) => void odeslatFormular(udalost));

// Tlačítko Zavřít i klávesa Escape končí tady: rozdělanou nahrávku zahodí a odeslání přeruší.
panel.addEventListener('close', () => {
  cisloPokusu += 1;
  nahravani?.zrusit();
  nahravani = null;
  odeslani?.abort();
});
