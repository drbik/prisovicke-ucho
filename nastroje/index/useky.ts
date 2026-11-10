// Krok 8.4: dělení textu na úseky. Nejdřív podle stavby dokumentu (odstavce, body, usnesení),
// teprve dlouhé odstavce po větách, nikdy uprostřed věty. Sousední úseky se překrývají.
export const DELKA_USEKU = 1200;
export const PREKRYV = 150;
// Kratší zbytek strany se připojí k předchozímu úseku, aby nevznikaly úseky z jednoho řádku.
const MIN_ZBYTEK = 200;

export interface CastDokumentu {
  // Číslo strany PDF, u stránek webu null.
  strana: number | null;
  text: string;
}

export interface NovyUsek {
  strana: number | null;
  text: string;
}

// Tečka za zkratkou (č., čp., odst., s.r.o., Ing.) větu nekončí.
const ZKRATKY = ['č', 'čp', 'č.p', 'čj', 'č.j', 'p', 'ppč', 'p.p.č', 'parc', 'odst', 'písm', 'tj', 'tzn', 'např', 'resp',
  'Ing', 'Mgr', 'MUDr', 'JUDr', 'Bc', 'DiS', 'Dis', 's.r.o', 'spol', 'a.s', 'Sb', 'tel', 'ul', 'nám', 'str', 'zák',
  'hod', 'min', 'cca', 'apod', 'atd', 'aj', 'mj', 'viz', 'sv', 'st', 'ml', 'r', 'k.ú', 'ev'];
const KONEC_VETY = new RegExp(
  String.raw`(?<!(?<![\p{L}.])(?:${ZKRATKY.map((z) => z.replaceAll('.', String.raw`\.`)).join('|')}))[.!?…]["“”)]?\s+(?=[„"(]?\p{Lu})`,
  'gu',
);
// Začátek nového bodu: „1)“, „2.“, „a)“, „Usnesení“, „Bod“, „Ad“. Před ním je vhodné úsek ukončit.
const ZACATEK_BODU = /^(?:\d{1,2}[.)]\s|[a-z]\)\s|Usnesení\b|Bod\s|Ad\s|Ad\d|K bodu\b)/u;

// Kde nejpozději jde text rozdělit, aby první část měla nejvýš `misto` znaků:
// na konci věty, jinak na konci řádku, jinak mezi slovy.
export function rozdelitNaMisto(text: string, misto: number): [string, string] {
  if (text.length <= misto) return [text, ''];
  const hranice = (vzor: RegExp) => [...text.matchAll(vzor)].map((m) => m.index + m[0].length);
  for (const vzor of [KONEC_VETY, /\n/g, /\s+/g]) {
    const vhodne = hranice(vzor).filter((i) => i > 0 && i <= misto && text.slice(0, i).trim());
    if (vhodne.length) {
      const i = Math.max(...vhodne);
      return [text.slice(0, i).trim(), text.slice(i).trim()];
    }
  }
  // Jediné slovo delší než místo: rozdělí se za ním.
  const mezera = text.search(/\s/);
  return mezera === -1 ? [text, ''] : [text.slice(0, mezera), text.slice(mezera).trim()];
}

// Konec předchozího úseku do zhruba 150 znaků, od začátku věty, když to jde, jinak od začátku slova.
export function prekryv(text: string, delka = PREKRYV) {
  if (text.length <= delka) return text;
  const konec = text.slice(-delka);
  const veta = konec.search(/[.!?…]\s+\S/u);
  if (veta !== -1) {
    const zacatek = konec.slice(veta + 1).trimStart();
    if (zacatek.length >= 40) return zacatek;
  }
  const mezera = konec.search(/\s/);
  return mezera === -1 ? konec : konec.slice(mezera + 1).trimStart();
}

export function rozdelitNaUseky(casti: CastDokumentu[], { delka = DELKA_USEKU, delkaPrekryvu = PREKRYV } = {}): NovyUsek[] {
  const useky: NovyUsek[] = [];
  for (const { strana, text } of casti) {
    const fronta = text.split(/\n\s*\n/).map((odstavec) => odstavec.trim()).filter(Boolean);
    let kusy: string[] = [];
    let delkaKusu = 0;
    let sPrekryvem = false;
    const obsahu = () => kusy.length - (sPrekryvem ? 1 : 0);
    const pridat = (kus: string) => {
      delkaKusu += (kusy.length ? 2 : 0) + kus.length;
      kusy.push(kus);
    };
    const ulozit = () => {
      const hotovy = kusy.join('\n\n');
      useky.push({ strana, text: hotovy });
      kusy = [];
      delkaKusu = 0;
      pridat(prekryv(hotovy, delkaPrekryvu));
      sPrekryvem = true;
    };

    while (fronta.length) {
      const jednotka = fronta.shift()!;
      const misto = delka - delkaKusu - (kusy.length ? 2 : 0);
      const novyBod = ZACATEK_BODU.test(jednotka) && obsahu() > 0 && delkaKusu >= delka * 0.6;
      if (jednotka.length <= misto && !novyBod) {
        pridat(jednotka);
        continue;
      }
      // Rozpracovaný úsek je krátký, nebo v něm je jen překryv: doplní se začátkem odstavce.
      if (!novyBod && (obsahu() === 0 || delkaKusu < delka * 0.5)) {
        const [prvni, zbytek] = rozdelitNaMisto(jednotka, Math.max(misto, 100));
        pridat(prvni);
        if (zbytek) fronta.unshift(zbytek);
        ulozit();
        continue;
      }
      ulozit();
      fronta.unshift(jednotka);
    }

    if (obsahu() > 0) {
      const zbytek = kusy.slice(sPrekryvem ? 1 : 0).join('\n\n');
      const posledni = useky.at(-1);
      if (sPrekryvem && posledni?.strana === strana && zbytek.length < MIN_ZBYTEK) posledni.text += `\n\n${zbytek}`;
      else useky.push({ strana, text: kusy.join('\n\n') });
    }
  }
  return useky;
}
