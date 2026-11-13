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
import type { DuvodPredani, VetaZobrazene, ZobrazenaOdpoved } from '../lib/odpovedi/odpoved';
import type { UdalostDotazu, VysledekDotazu } from '../lib/odpovedi/zpracovani';
import { OBLASTI, TYPY_PODNETU } from '../lib/oblasti';
import { JMENA_STYLU, POPISY_TLACITKA, jeStyl, type KlicMluvciho, type KlicStylu } from '../lib/odpovedi/mluvci';
import type { PodepsanyPodklad } from '../lib/odpovedi/styl';
import { stylizovatVzkaz, ukazatelNacitani, vytvoritPrevypraveni } from './mluvci';

type Pohled = 'zadost' | 'nahravani' | 'odesilani' | 'text' | 'vysledek' | 'potvrzeno' | 'chyba';

const API = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/vzkaz`;
const API_DOTAZU = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/dotaz`;

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

// Krok 8.7: proč odpověď není. Stránka nesmí tvrdit, že dotaz někam odešel (fronta správce zatím není).
const NENALEZENO = 'Na webu obce ani na webu Nezávislých pro Příšovice jsme odpověď na tento dotaz nenašli.';
const BEZ_OPORY = 'Na webu jsme našli související informace, ale ne takové, ze kterých by šlo spolehlivě odpovědět.';
const DUVODY_BEZ_ODPOVEDI: Record<DuvodPredani, string> = {
  'nic-nenalezeno': NENALEZENO,
  'model-nevi': NENALEZENO,
  'chyba-ai': 'Odpověď se teď nepodařilo vyhledat. Zkuste to prosím za chvíli znovu.',
  'neplatny-json': BEZ_OPORY,
  'chybi-citace': BEZ_OPORY,
  'spatny-usek': BEZ_OPORY,
  'citace-neni-v-useku': BEZ_OPORY,
  'cislo-neni-v-citaci': BEZ_OPORY,
  'neplyne-z-citace': BEZ_OPORY,
  'soukroma-osoba': BEZ_OPORY,
};
const ODPOVED_SITE = 'Odpověď se nepodařilo vyhledat, spojení selhalo. Zkontrolujte připojení a zkuste to znovu.';
// Průběh hledání (12. 11. 2026): autor vidí, na jaké části AI dotaz rozdělila a co se u které právě děje.
const CTEME_DOTAZ = 'Čteme dotaz a zjišťujeme, na co všechno se ptáte.';
const HLEDAME = 'Hledáme odpověď na webu obce a na webu Nezávislých pro Příšovice.';
const STAVY_CASTI = {
  hledani: 'Hledáme odpověď…',
  odpoved: 'Odpověď jsme našli.',
  zastupitelum: 'Ve zdrojích jsme odpověď nenašli.',
} as const;
const TYP_PRUBEHU = 'application/x-ndjson';
const ODPOVED_LIMIT = 'Během chvilky přišlo moc požadavků. Počkejte prosím minutu a zkuste to znovu.';
// Odkaz smí vést jen na zdroje indexu, i kdyby server vrátil něco jiného.
const POVOLENY_ZDROJ = /^https:\/\/(?:prisovice\.cz|nezavisli-prisovice\.cz)\//;

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
const odpoved = prvek('[data-odpoved]', panel);
const oznaceniOdpovedi = prvek('[data-odpoved-oznaceni]', panel);
const vetyOdpovedi = prvek('[data-odpoved-vety]', panel);
const mluvciOdpovedi = prvek('[data-odpoved-mluvci]', panel);
const zdrojeOdpovedi = prvek('[data-odpoved-zdroje]', panel);
const chybiOdpovedi = prvek('[data-odpoved-chybi]', panel);
const chybiSeznam = prvek('[data-odpoved-chybi-seznam]', panel);
const upozorneniOdpovedi = prvek('[data-odpoved-upozorneni]', panel);
const duvodBezOdpovedi = prvek('[data-odpoved-duvod]', panel);
const hledatZnovu = prvek('[data-odpoved-znovu]', panel);
const prubehPopis = prvek('[data-prubeh-popis]', panel);
const prubeh = prvek('[data-prubeh]', panel);
// Styl vzkazu (13. 11. 2026): sluníčko postav kolem tlačítka a stejná volba při kontrole vzkazu.
const mikrofon = prvek<HTMLButtonElement>('[data-nahrat]');
const ikonaMikrofonu = prvek('[data-mikrofon-ikona]');
const popisMikrofonu = prvek('[data-mikrofon-popis]');
const paprsky = prvek('[data-styly]');
const puvodniIkona = ikonaMikrofonu.firstElementChild!.cloneNode(true);
const stavStylu = prvek('[data-styl-stav]', panel);

let nahravani: Nahravani | null = null;
let odeslani: AbortController | null = null;
let poOpakovani: () => void = () => {};
// Zavření panelu zneplatní rozběhnutý pokus, třeba když čeká na povolení mikrofonu.
let cisloPokusu = 0;
let aktualniPohled: Pohled | null = null;
// Návrh AI, se kterým se při potvrzení porovná, co autor změnil.
let navrh: PotvrzenyVzkaz | null = null;
// Potvrzený dotaz, na který se hledá odpověď. Hledat znovu ho pošle ještě jednou.
let hledanyDotaz: PotvrzenyVzkaz | null = null;
let hledani: AbortController | null = null;
// Zvolený styl. Spisovně je základ. Při kontrole vzkazu je text postavy jen k přečtení a opravuje se spisovné znění,
// podle kterého se hledá i odpověď.
let styl: KlicStylu = 'spisovne';
let spisovnyText = '';
let poleUkazuje: KlicStylu = 'spisovne';
const vzkazyPostav = new Map<KlicMluvciho, string>();
let stylovani: AbortController | null = null;
// Postava, která odpoví na potvrzený dotaz, a rámeček s její odpovědí.
let stylOdpovedi: KlicStylu = 'spisovne';
let odpovedPostavy: { zrusit: () => void } | null = null;

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
  spisovnyText = text;
  vzkazyPostav.clear();
  ukazat('vysledek', 'Vzkaz je upravený. Zkontrolujte ho a potvrďte.');
  void ukazatStylVzkazu();
}

// Postava kolem tlačítka (13. 11. 2026): ťuknutí jen promění velké tlačítko, nahrávat se začne až jím.
// Při kontrole vzkazu se stejnou volbou přepne text vzkazu.
function nastavitStyl(novy: KlicStylu) {
  styl = novy;
  for (const tlacitko of document.querySelectorAll<HTMLElement>('[data-styl]')) {
    tlacitko.setAttribute('aria-pressed', String(tlacitko.dataset.styl === novy));
  }
  popisMikrofonu.textContent = POPISY_TLACITKA[novy];
  mikrofon.classList.toggle('mikrofon--postava', novy !== 'spisovne');
  const ikona = novy === 'spisovne' ? puvodniIkona.cloneNode(true) : paprsky.querySelector(`[data-styl="${novy}"] svg`)?.cloneNode(true);
  if (ikona instanceof SVGElement) {
    ikona.setAttribute('width', '44');
    ikona.setAttribute('height', '44');
    ikonaMikrofonu.replaceChildren(ikona);
  }
  if (aktualniPohled === 'vysledek') void ukazatStylVzkazu();
}

function ukazatTextVzkazu(text: string, ukazuje: KlicStylu, stav = '') {
  polePotvrzeni.text.value = text;
  (polePotvrzeni.text as HTMLTextAreaElement).readOnly = ukazuje !== 'spisovne';
  poleUkazuje = ukazuje;
  stavStylu.replaceChildren(stav);
}

// Text vzkazu v zvoleném stylu. Hotové texty postav se pamatují, dokud autor nezmění spisovné znění.
async function ukazatStylVzkazu() {
  stylovani?.abort();
  stylovani = null;
  if (styl === 'spisovne') {
    ukazatTextVzkazu(spisovnyText, 'spisovne');
    return;
  }
  const mluvci = styl;
  const jmeno = JMENA_STYLU[mluvci];
  const popis = `Vzkaz ve stylu: ${jmeno}. Opravy dělejte ve spisovném znění, podle něj hledáme i odpověď.`;
  const hotovy = vzkazyPostav.get(mluvci);
  if (hotovy) {
    ukazatTextVzkazu(hotovy, mluvci, popis);
    return;
  }
  ukazatTextVzkazu(spisovnyText, 'spisovne');
  (polePotvrzeni.text as HTMLTextAreaElement).readOnly = true;
  stavStylu.replaceChildren(ukazatelNacitani(`${jmeno} si vzkaz přebírá…`));
  const rizeni = new AbortController();
  stylovani = rizeni;
  let vysledek: Awaited<ReturnType<typeof stylizovatVzkaz>>;
  try {
    vysledek = await stylizovatVzkaz(spisovnyText, mluvci, rizeni.signal);
  } catch {
    return;
  }
  if (stylovani !== rizeni) return;
  stylovani = null;
  if ('text' in vysledek) {
    vzkazyPostav.set(mluvci, vysledek.text);
    ukazatTextVzkazu(vysledek.text, mluvci, popis);
  } else {
    ukazatTextVzkazu(spisovnyText, 'spisovne', `${vysledek.chyba} Vzkaz zůstává spisovně.`);
  }
}

// Zkušební provoz: potvrzení zatím nic neodesílá, uložení přijde s přihlášením (krok 4, F-14).
function potvrdit(udalost: SubmitEvent) {
  udalost.preventDefault();
  // Kontroluje se a hledá spisovné znění. Text postavy je jen jeho převyprávění.
  const zobrazeny = polePotvrzeni.text.value;
  const overeni = overitPotvrzeni({
    text: spisovnyText,
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
  potvrzenyText.textContent = poleUkazuje === 'spisovne' ? vzkaz.text : zobrazeny;
  const zmenene = navrh ? zmenenaPole(navrh, vzkaz) : [];
  zmeny.textContent = (zmenene.length
    ? `Změny oproti návrhu AI: ${zmenene.map((pole) => NAZVY_POLI[pole]).join(', ')}.`
    : 'Návrh AI zůstal beze změny.')
    + (poleUkazuje === 'spisovne' ? '' : ` Vzkaz ve stylu: ${JMENA_STYLU[poleUkazuje]}. Odpověď hledáme podle spisovného znění.`);
  stylOdpovedi = styl;
  ukazat('potvrzeno', 'Vzkaz je potvrzený.');
  // F-72: návrhy, stížnosti a pochvaly se nehledají.
  if (vzkaz.typ === 'dotaz') void hledatOdpoved(vzkaz);
  else ukazatStavOdpovedi(null);
}

// Odpověď hlasem postavy zvolené při potvrzení. Má ji odpověď z webu i dotaz bez odpovědi, když je server podepsal.
function ukazatOdpovedPostavy(zdroj?: PodepsanyPodklad) {
  odpovedPostavy?.zrusit();
  odpovedPostavy = null;
  if (!zdroj || stylOdpovedi === 'spisovne') {
    mluvciOdpovedi.replaceChildren();
    return;
  }
  const { ramecek, zrusit } = vytvoritPrevypraveni(zdroj, stylOdpovedi);
  odpovedPostavy = { zrusit };
  mluvciOdpovedi.replaceChildren(ramecek);
}

function ukazatStavOdpovedi(stav: 'hledani' | 'nalezena' | 'zastupitelum' | null) {
  if (stav === null || stav === 'hledani') ukazatOdpovedPostavy();
  odpoved.hidden = stav === null;
  for (const cast of odpoved.querySelectorAll<HTMLElement>('[data-odpoved-stav]')) {
    cast.hidden = cast.dataset.odpovedStav !== stav;
  }
}

function odstavecVet(vety: VetaZobrazene[]) {
  const odstavec = document.createElement('p');
  for (const veta of vety) {
    const odkaz = document.createElement('a');
    odkaz.href = `#odpoved-zdroj-${veta.zdroj}`;
    odkaz.textContent = String(veta.zdroj);
    odkaz.setAttribute('aria-label', `zdroj ${veta.zdroj}`);
    const index = document.createElement('sup');
    index.append(odkaz);
    odstavec.append(veta.text, index, ' ');
  }
  return odstavec;
}

function ukazatOdpoved(data: ZobrazenaOdpoved) {
  oznaceniOdpovedi.textContent = data.oznaceni.join(' · ');
  // Dotaz na víc věcí: pod každou zodpovězenou otázkou její věty.
  if (data.casti?.length) {
    vetyOdpovedi.replaceChildren(...data.casti.flatMap((cast) => {
      const otazka = document.createElement('h4');
      otazka.className = 'odpoved__cast';
      otazka.textContent = cast.otazka;
      return [otazka, odstavecVet(cast.vety)];
    }));
  } else {
    vetyOdpovedi.replaceChildren(odstavecVet(data.vety));
  }
  // Částečná odpověď: části dotazu, na které zdroje neodpovídají.
  chybiSeznam.replaceChildren(...data.nezodpovezeno.map((cast) => {
    const polozka = document.createElement('li');
    polozka.textContent = cast;
    return polozka;
  }));
  chybiOdpovedi.hidden = data.nezodpovezeno.length === 0;
  zdrojeOdpovedi.replaceChildren(...data.zdroje.map((zdroj) => {
    const polozka = document.createElement('li');
    polozka.id = `odpoved-zdroj-${zdroj.cislo}`;
    const oznaceni = document.createElement('span');
    oznaceni.className = 'zdroj__oznaceni';
    oznaceni.textContent = zdroj.oznaceni;
    const nazev = document.createElement(POVOLENY_ZDROJ.test(zdroj.url) ? 'a' : 'span');
    nazev.textContent = zdroj.nazev;
    if (nazev instanceof HTMLAnchorElement) {
      nazev.href = zdroj.url;
      nazev.target = '_blank';
      nazev.rel = 'noopener noreferrer';
    }
    const datum = document.createElement('span');
    datum.className = 'zdroj__datum';
    // Datum a místo v dokumentu: „zveřejněno 12. 11. 2024 · strana 5, čl. 9“.
    datum.textContent = zdroj.misto ? `${zdroj.datum} · ${zdroj.misto}` : zdroj.datum;
    const uryvek = document.createElement('blockquote');
    uryvek.className = 'zdroj__uryvek';
    uryvek.textContent = `„${zdroj.uryvek}“`;
    polozka.append(oznaceni, nazev, datum, uryvek);
    return polozka;
  }));
  upozorneniOdpovedi.textContent = data.upozorneni;
  ukazatStavOdpovedi('nalezena');
  oznameni.textContent = 'Odpověď je připravená pod souhrnem vzkazu.';
}

function ukazatBezOdpovedi(duvod: string, muzeZnovu: boolean) {
  duvodBezOdpovedi.textContent = duvod;
  hledatZnovu.hidden = !muzeZnovu;
  ukazatStavOdpovedi('zastupitelum');
  oznameni.textContent = 'Odpověď jsme na webu nenašli. Dotaz převezmou zastupitelé.';
}

// Části dotazu, jak je rozdělila AI. Jedna část se jako seznam neukazuje.
function ukazatCasti(casti: string[]) {
  if (casti.length < 2) {
    prubeh.hidden = true;
    prubehPopis.textContent = HLEDAME;
    oznameni.textContent = HLEDAME;
    return;
  }
  prubehPopis.textContent = `Dotaz má ${casti.length} části. Odpověď hledáme ke každé zvlášť.`;
  prubeh.replaceChildren(...casti.map((otazka, i) => {
    const polozka = document.createElement('li');
    polozka.dataset.stav = 'hledani';
    const znak = document.createElement('span');
    znak.className = 'prubeh__znak';
    znak.setAttribute('aria-hidden', 'true');
    const toceni = document.createElement('span');
    toceni.className = 'toceni';
    znak.append(toceni);
    const text = document.createElement('span');
    text.className = 'prubeh__otazka';
    text.textContent = `${i + 1}. ${otazka}`;
    const stav = document.createElement('span');
    stav.className = 'prubeh__stav';
    stav.textContent = STAVY_CASTI.hledani;
    polozka.append(znak, text, stav);
    return polozka;
  }));
  prubeh.hidden = false;
  oznameni.textContent = `Dotaz má ${casti.length} části. Hledáme odpověď na každou zvlášť. ${casti.map((otazka, i) => `${i + 1}. ${otazka}`).join(' ')}`;
}

function ukazatHotovouCast(cislo: number, vysledek: 'odpoved' | 'zastupitelum') {
  const polozka = prubeh.children[cislo - 1];
  if (prubeh.hidden || !(polozka instanceof HTMLElement)) return;
  polozka.dataset.stav = vysledek;
  polozka.querySelector('.prubeh__znak')?.replaceChildren(vysledek === 'odpoved' ? '✓' : '–');
  const stav = polozka.querySelector('.prubeh__stav');
  if (stav) stav.textContent = STAVY_CASTI[vysledek];
  oznameni.textContent = `Část ${cislo} ze ${prubeh.children.length}: ${vysledek === 'odpoved' ? 'odpověď jsme našli' : 'odpověď ve zdrojích není'}.`;
}

// Server posílá průběh po řádcích JSON. Poslední řádek nese výsledek.
async function cistPrubeh(telo: ReadableStream<Uint8Array>, priUdalosti: (udalost: UdalostDotazu) => void) {
  const ctecka = telo.getReader();
  const dekoder = new TextDecoder();
  let zbytek = '';
  for (;;) {
    const { value, done } = await ctecka.read();
    zbytek += dekoder.decode(value, { stream: !done });
    let konec = zbytek.indexOf('\n');
    while (konec !== -1) {
      const radek = zbytek.slice(0, konec).trim();
      zbytek = zbytek.slice(konec + 1);
      if (radek) priUdalosti(JSON.parse(radek) as UdalostDotazu);
      konec = zbytek.indexOf('\n');
    }
    if (done) break;
  }
  if (zbytek.trim()) priUdalosti(JSON.parse(zbytek) as UdalostDotazu);
}

// Krok 8.7: potvrzený dotaz projde hledáním na webu obce a v kartách webu Nezávislých (F-70 až F-76).
async function hledatOdpoved(vzkaz: PotvrzenyVzkaz) {
  hledani?.abort();
  const rizeni = new AbortController();
  hledani = rizeni;
  hledanyDotaz = vzkaz;
  prubeh.hidden = true;
  prubeh.replaceChildren();
  prubehPopis.textContent = CTEME_DOTAZ;
  ukazatStavOdpovedi('hledani');
  oznameni.textContent = `Vzkaz je potvrzený. ${CTEME_DOTAZ}`;
  try {
    const vysledek = await fetch(API_DOTAZU, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: TYP_PRUBEHU },
      body: JSON.stringify({ text: vzkaz.text, typ: vzkaz.typ }),
      signal: rizeni.signal,
    });
    const prijato: { data: VysledekDotazu | null } = { data: null };
    if (vysledek.ok && vysledek.body && (vysledek.headers.get('content-type') ?? '').includes(TYP_PRUBEHU)) {
      await cistPrubeh(vysledek.body, (udalost) => {
        if (rizeni.signal.aborted) return;
        if (udalost.udalost === 'casti') ukazatCasti(udalost.casti);
        else if (udalost.udalost === 'cast') ukazatHotovouCast(udalost.cislo, udalost.vysledek);
        else prijato.data = udalost.vysledek;
      });
    } else {
      prijato.data = await vysledek.json().catch(() => null) as VysledekDotazu | null;
    }
    const { data } = prijato;
    if (rizeni.signal.aborted) return;
    if (!vysledek.ok || !data) {
      ukazatBezOdpovedi(vysledek.status === 429 ? ODPOVED_LIMIT : DUVODY_BEZ_ODPOVEDI['chyba-ai'], true);
    } else if (data.vysledek === 'odpoved') {
      ukazatOdpoved(data.odpoved);
      ukazatOdpovedPostavy(data.prevypraveni);
    } else if (data.vysledek === 'zastupitelum') {
      ukazatBezOdpovedi(DUVODY_BEZ_ODPOVEDI[data.duvod] ?? NENALEZENO, data.duvod === 'chyba-ai');
      ukazatOdpovedPostavy('prevypraveni' in data ? data.prevypraveni : undefined);
    } else {
      ukazatStavOdpovedi(null);
    }
  } catch (chyba) {
    if (chyba instanceof DOMException && chyba.name === 'AbortError') return;
    ukazatBezOdpovedi(ODPOVED_SITE, true);
  } finally {
    if (hledani === rizeni) hledani = null;
  }
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
    ukazat('nahravani', 'Naslouchám.');
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
prvek('[data-zpet-k-uprave]', panel).addEventListener('click', () => {
  hledani?.abort();
  ukazatStavOdpovedi(null);
  ukazat('vysledek');
});
prvek('[data-hledat-znovu]', panel).addEventListener('click', () => {
  if (hledanyDotaz) void hledatOdpoved(hledanyDotaz);
});
prvek('[data-prejit-na-text]', panel).addEventListener('click', () => ukazatText());
opakovat.addEventListener('click', () => poOpakovani());
for (const zrusit of panel.querySelectorAll('[data-zrusit]')) zrusit.addEventListener('click', () => panel.close());

pole.addEventListener('input', () => { pocet.textContent = String(pole.value.length); });
// Oprava spisovného znění zneplatní texty postav, ty se pak přepíšou z opraveného.
polePotvrzeni.text.addEventListener('input', () => {
  if (poleUkazuje !== 'spisovne') return;
  spisovnyText = polePotvrzeni.text.value;
  vzkazyPostav.clear();
});
// Sluníčko postav a volba při kontrole vzkazu. Bez skriptu zůstanou skryté.
for (const tlacitko of document.querySelectorAll<HTMLElement>('[data-styl]')) {
  tlacitko.addEventListener('click', () => {
    if (jeStyl(tlacitko.dataset.styl)) nastavitStyl(tlacitko.dataset.styl);
  });
}
for (const skryte of document.querySelectorAll<HTMLElement>('[data-styly], [data-styl-napoveda], [data-styly-kontroly]')) skryte.hidden = false;
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
  hledani?.abort();
  stylovani?.abort();
  stylovani = null;
  ukazatStavOdpovedi(null);
});
