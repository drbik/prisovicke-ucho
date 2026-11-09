import { formatovatCas } from '../lib/nahravani/casovac';
import type { DruhChybyMikrofonu } from '../lib/nahravani/format';
import { ChybaMikrofonu, spustitNahravani, type HotovaNahravka, type Nahravani } from '../lib/nahravani/nahravac';
import type { KodChyby } from '../lib/podani/chyby';
import { MAX_ZNAKU_TEXTU, MIN_DELKA_NAHRAVKY_S, MIN_ZNAKU_TEXTU, jeTextPlatny } from '../lib/podani/limity';
import {
  POLE_POTVRZENI,
  overitPotvrzeni,
  zmenenaPole,
  type PolePotvrzeni,
  type PotvrzenyVzkaz,
} from '../lib/podani/potvrzeni';
import type { TechnickeUdaje, VysledekPodani } from '../lib/podani/zpracovani';
import { OBLASTI, TYPY_PODNETU } from '../lib/oblasti';

type Pohled = 'zadost' | 'nahravani' | 'odesilani' | 'text' | 'vysledek' | 'potvrzeno' | 'chyba';

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
  'uprava-selhala': 'Text se nepodařilo upravit. Vzkaz zůstává ve vašem prohlížeči, můžete ho poslat znovu.',
};
const OBECNA_CHYBA = 'Něco se nepovedlo. Zkuste to prosím znovu.';
const CHYBA_SITE = 'Spojení se nepodařilo. Zkontrolujte připojení a zkuste to znovu.';
const OTAZKA_ZAHOZENI = 'Opravdu vzkaz zahodit? Nikam se neuložil, takže se k němu už nevrátíte.';
const NAZVY_POLI: Record<PolePotvrzeni, string> = { text: 'text', nazev: 'název', typ: 'typ', oblast: 'oblast' };

function prvek<T extends HTMLElement>(selektor: string, koren: ParentNode = document) {
  const nalezeny = koren.querySelector<T>(selektor);
  if (!nalezeny) throw new Error(`Na stránce chybí ${selektor}.`);
  return nalezeny;
}

const panel = prvek<HTMLDialogElement>('#podani-panel');
const obsahPanelu = prvek('.panel__obsah', panel);
const oznameni = prvek('[data-oznameni]', panel);
const cas = prvek('[data-cas]', panel);
const hladina = prvek('[data-hladina]', panel);
const upozorneni = prvek('[data-upozorneni]', panel);
const vysvetleni = prvek('[data-vysvetleni]', panel);
const pole = prvek<HTMLTextAreaElement>('[data-pole]', panel);
const pocet = prvek('[data-pocet]', panel);
const chybaTextu = prvek('[data-chyba-textu]', panel);
const polePotvrzeni: Record<PolePotvrzeni, HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement> = {
  text: prvek<HTMLTextAreaElement>('[data-upraveny]', panel),
  nazev: prvek<HTMLInputElement>('[data-nazev]', panel),
  typ: prvek<HTMLSelectElement>('[data-typ]', panel),
  oblast: prvek<HTMLSelectElement>('[data-oblast]', panel),
};
const popisPuvodniho = prvek('[data-popis-puvodniho]', panel);
const puvodni = prvek('[data-puvodni]', panel);
const technickeSeznam = prvek('[data-technicke-seznam]', panel);
const potvrzenyNazev = prvek('[data-potvrzeny-nazev]', panel);
const potvrzenyTyp = prvek('[data-potvrzeny-typ]', panel);
const potvrzenaOblast = prvek('[data-potvrzena-oblast]', panel);
const potvrzenyText = prvek('[data-potvrzeny-text]', panel);
const zmeny = prvek('[data-zmeny]', panel);
const textChyby = prvek('[data-chyba]', panel);
const opakovat = prvek<HTMLButtonElement>('[data-opakovat]', panel);

let nahravani: Nahravani | null = null;
let odeslani: AbortController | null = null;
let poOpakovani: () => void = () => {};
// Zavření panelu zneplatní rozběhnutý pokus, třeba když čeká na povolení mikrofonu.
let cisloPokusu = 0;
let aktualniPohled: Pohled | null = null;
// Návrh AI, se kterým se při potvrzení porovná, co autor změnil.
let navrh: PotvrzenyVzkaz | null = null;

function ukazat(pohled: Pohled, hlaseni = '') {
  aktualniPohled = pohled;
  for (const sekce of panel.querySelectorAll<HTMLElement>('[data-pohled]')) {
    sekce.hidden = sekce.dataset.pohled !== pohled;
  }
  if (!panel.open) panel.showModal();
  // Dlouhý formulář nechává panel odrolovaný, další pohled má začít nahoře.
  obsahPanelu.scrollTop = 0;
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

function sekundy(ms: number) {
  return `${(ms / 1000).toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} s`;
}

function ukazatTechnicke(udaje: TechnickeUdaje) {
  technickeSeznam.replaceChildren();
  const radky: [string, string][] = [];
  if (udaje.typ) radky.push(['Formát', udaje.typ]);
  if (udaje.velikostB !== undefined) {
    radky.push(['Velikost', `${(udaje.velikostB / 1024).toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} kB`]);
  }
  if (udaje.prepisMs !== undefined) radky.push(['Přepis trval', sekundy(udaje.prepisMs)]);
  if (udaje.delkaS !== undefined) radky.push(['Délka podle Whisperu', formatovatCas(udaje.delkaS)]);
  radky.push(
    ['Úprava trvala', sekundy(udaje.upravaMs)],
    ['Model úpravy', udaje.modelUpravy],
    ['Verze promptu', String(udaje.verzePromptu)],
    ['Pokusů o úpravu', String(udaje.pokusuUpravy)],
  );
  for (const [nazev, hodnota] of radky) {
    const dt = document.createElement('dt');
    dt.textContent = nazev;
    const dd = document.createElement('dd');
    dd.textContent = hodnota;
    technickeSeznam.append(dt, dd);
  }
}

function ukazatChybyPoli(chyby: Partial<Record<PolePotvrzeni, string>>) {
  for (const pole of POLE_POTVRZENI) {
    const chyba = prvek(`[data-chyba-pole="${pole}"]`, panel);
    chyba.textContent = chyby[pole] ?? '';
    chyba.hidden = !chyby[pole];
    if (chyby[pole]) polePotvrzeni[pole].setAttribute('aria-invalid', 'true');
    else polePotvrzeni[pole].removeAttribute('aria-invalid');
  }
}

function ukazatVysledek(data: VysledekPodani) {
  const { text, nazev, typ, oblast } = data.uprava;
  navrh = { text, nazev, typ, oblast };
  for (const pole of POLE_POTVRZENI) polePotvrzeni[pole].value = navrh[pole];
  ukazatChybyPoli({});
  popisPuvodniho.textContent = data.vstup === 'hlas' ? 'Původní přepis' : 'Původní text';
  puvodni.textContent = data.surovyText;
  ukazatTechnicke(data.technicke);
  ukazat('vysledek', 'Vzkaz je upravený. Zkontrolujte ho a potvrďte.');
}

// Zkušební provoz: potvrzení zatím nic neodesílá, uložení přijde s přihlášením (krok 4, F-14).
function potvrdit(udalost: SubmitEvent) {
  udalost.preventDefault();
  const overeni = overitPotvrzeni({
    text: polePotvrzeni.text.value,
    nazev: polePotvrzeni.nazev.value,
    typ: polePotvrzeni.typ.value,
    oblast: polePotvrzeni.oblast.value,
  });
  if (!overeni.platne) {
    ukazatChybyPoli(overeni.chyby);
    const prvni = POLE_POTVRZENI.find((pole) => overeni.chyby[pole]);
    if (prvni) polePotvrzeni[prvni].focus();
    return;
  }
  ukazatChybyPoli({});
  const { vzkaz } = overeni;
  potvrzenyNazev.textContent = vzkaz.nazev;
  potvrzenyTyp.textContent = TYPY_PODNETU[vzkaz.typ];
  potvrzenaOblast.textContent = OBLASTI.find((o) => o.slug === vzkaz.oblast)?.nazev ?? vzkaz.oblast;
  potvrzenyText.textContent = vzkaz.text;
  const zmenene = navrh ? zmenenaPole(navrh, vzkaz) : [];
  zmeny.textContent = zmenene.length
    ? `Změny oproti návrhu AI: ${zmenene.map((pole) => NAZVY_POLI[pole]).join(', ')}.`
    : 'Návrh AI zůstal beze změny.';
  ukazat('potvrzeno', 'Vzkaz je potvrzený.');
}

// Upravený vzkaz existuje jen v prohlížeči, proto se před zahozením ptáme.
function muzeZavrit() {
  return aktualniPohled !== 'vysledek' || window.confirm(OTAZKA_ZAHOZENI);
}

function zavrit() {
  if (muzeZavrit()) panel.close();
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
  ukazat('odesilani', 'Přepisuji a upravuji vzkaz.');
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
  ukazat('odesilani', 'Upravuji vzkaz.');
  const vystup = await odeslat('text', {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (vystup.zruseno) return;
  if (vystup.data) {
    pole.value = '';
    pocet.textContent = '0';
    ukazatVysledek(vystup.data);
  } else {
    ukazatText();
    chybaTextu.textContent = vystup.chyba ?? OBECNA_CHYBA;
    chybaTextu.hidden = false;
  }
}

prvek('[data-nahrat]').addEventListener('click', () => void zacitNahravat());
prvek('[data-napsat]').addEventListener('click', () => ukazatText());
prvek('[data-hotovo]', panel).addEventListener('click', () => nahravani?.dokoncit());
prvek('[data-zavrit]', panel).addEventListener('click', zavrit);
prvek('[data-zahodit]', panel).addEventListener('click', zavrit);
prvek('[data-novy]', panel).addEventListener('click', () => panel.close());
prvek('[data-zpet-k-uprave]', panel).addEventListener('click', () => ukazat('vysledek'));
prvek('[data-prejit-na-text]', panel).addEventListener('click', () => ukazatText());
opakovat.addEventListener('click', () => poOpakovani());
for (const zrusit of panel.querySelectorAll('[data-zrusit]')) zrusit.addEventListener('click', () => panel.close());

pole.addEventListener('input', () => { pocet.textContent = String(pole.value.length); });
prvek<HTMLFormElement>('[data-formular]', panel).addEventListener('submit', (udalost) => void odeslatFormular(udalost));
prvek<HTMLFormElement>('[data-formular-potvrzeni]', panel).addEventListener('submit', potvrdit);

// Escape a na Androidu i gesto zpět. Bez nedávné aktivity uživatele prohlížeč zavření zrušit nedovolí.
panel.addEventListener('cancel', (udalost) => {
  if (udalost.cancelable && !muzeZavrit()) udalost.preventDefault();
});

// Všechny cesty k zavření končí tady: rozdělanou nahrávku zahodí a odeslání přeruší.
panel.addEventListener('close', () => {
  aktualniPohled = null;
  cisloPokusu += 1;
  nahravani?.zrusit();
  nahravani = null;
  odeslani?.abort();
});
