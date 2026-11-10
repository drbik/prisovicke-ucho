// Krok 8.4: z uložených HTML, PDF a dokumentů Word a ODT vytáhne text, rozdělí ho na úseky a sestaví
// Zdrojové dokumenty (npm run index:zpracovat). Čte jen složku dat ze stahování, nic nestahuje.
// Text z Wordu a z OCR připraví předem npm run index:word a npm run index:ocr (rozšíření z 10. 11. 2026).
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { TypDokumentu, Usek, ZdrojovyDokument } from '../../src/lib/odpovedi/typy';
import { hlavickaUseku } from '../../src/lib/odpovedi/zdroje';
import { precistKarty } from './karty';
import { SLOZKA_DAT, WEB_NEZAVISLYCH } from './nastaveni';
import { MIN_ZNAKU_STRANY, textPdf } from './pdf';
import { jeCitelnyOcr, textOcr, textWordu } from './prevod';
import {
  formatPrilohy,
  mesicNahrani,
  nacistJson,
  souborOcr,
  souborStavu,
  souborTextuWordu,
  ulozitJson,
  type StavStazeni,
  type ZaznamSeznamu,
} from './spolecne';
import { rozdelitNaUseky, type CastDokumentu } from './useky';
import { rozebratClanek, type Clanek, type ZaznamRest } from './wordpress';

// Stránka úřední desky bývá jen obálka s odkazy na PDF. Bez vlastního textu do indexu nejde.
// U stálé stránky stačí i seznam odkazů (třeba Formuláře ke stažení), když je dost dlouhý.
const MIN_VLASTNIHO_TEXTU = { 'uredni-deska': 80, aktualita: 30, stranka: 30 } as const;
const MIN_TEXTU_STALE_STRANKY = 80;
const OBECNE_ODKAZY = /^(zde|tady|sem|odkaz|ke stažení|stáhnout|pdf|dokument|příloha|více)$/i;

const sha = (algoritmus: string, text: string) => createHash(algoritmus).update(text).digest('hex');
const idDokumentu = (url: string) => sha('sha1', url).slice(0, 16);

const stav = await nacistJson<StavStazeni>(souborStavu(), { html: {}, pdf: {}, karty: null });
const seznam = await nacistJson<ZaznamSeznamu[]>(path.join(SLOZKA_DAT, 'seznam.json'), []);
const rest = await nacistJson<Record<string, ZaznamRest>>(path.join(SLOZKA_DAT, 'rest.json'), {});
if (!seznam.length) throw new Error(`V ${SLOZKA_DAT} chybí seznam.json. Nejdřív spusťte npm run index:stahnout.`);

const dokumenty: ZdrojovyDokument[] = [];
const useky: Usek[] = [];
const zprava = {
  vytvoreno: new Date().toISOString(),
  obalky: 0,
  bezTextu: [] as string[],
  skeny: [] as { url: string; nazev: string; stran: number }[],
  castecneSkeny: [] as { url: string; nazev: string; stranBezTextu: number[] }[],
  duplicity: [] as { url: string; stejnyJako: string }[],
  chyby: [] as { url: string; hlaska: string }[],
  // Rozšíření z 10. 11. 2026: dokumenty Word a ODT a strany PDF, jejichž text dodalo OCR.
  word: [] as { url: string; nazev: string; znaku: number }[],
  ocr: [] as { url: string; nazev: string; strany: number[] }[],
  ocrNecitelne: [] as { url: string; strana: number }[],
};
const otisky = new Map<string, string>();
const jeStazeno = (z: ZaznamSeznamu) => z.stav === 'stazeno' || z.stav === 'beze-zmeny';

function pridat(dokument: Omit<ZdrojovyDokument, 'id' | 'otisk'>, casti: CastDokumentu[]) {
  const text = casti.map((c) => c.text).join('\n\n');
  const otisk = sha('sha256', text);
  const stejny = otisky.get(otisk);
  if (stejny) {
    zprava.duplicity.push({ url: dokument.url, stejnyJako: stejny });
    return;
  }
  otisky.set(otisk, dokument.url);
  const hotovy: ZdrojovyDokument = { ...dokument, id: idDokumentu(dokument.url), otisk };
  dokumenty.push(hotovy);
  for (const [poradi, usek] of rozdelitNaUseky(casti).entries()) {
    useky.push({
      id: `${hotovy.id}-${poradi}`,
      dokumentId: hotovy.id,
      poradi,
      strana: usek.strana,
      hlavicka: hlavickaUseku(hotovy, usek.strana),
      text: usek.text,
    });
  }
}

// 1. Stránky, aktuality a úřední deska. Zároveň se sbírají stránky, které odkazují na přílohy.
interface Rodic { url: string; typ: TypDokumentu; nazev: string; datum: string | null; pocetPriloh: number; textOdkazu: string }
const rodice = new Map<string, Rodic[]>();
const PORADI_RODICU: TypDokumentu[] = ['uredni-deska', 'aktualita', 'stranka'];

for (const zaznam of seznam) {
  if (zaznam.typ === 'pdf' || zaznam.typ === 'karty' || !jeStazeno(zaznam)) continue;
  const ulozeny = stav.html[zaznam.url];
  const clanek: Clanek | null = rozebratClanek(await fs.readFile(path.join(SLOZKA_DAT, ulozeny.soubor), 'utf8'), zaznam.url);
  if (!clanek) continue;
  const pdf = clanek.dokumenty.filter((d) => formatPrilohy(d.url));
  for (const odkaz of pdf) {
    const seznamRodicu = rodice.get(odkaz.url) ?? [];
    seznamRodicu.push({ url: zaznam.url, typ: zaznam.typ, nazev: clanek.nazev, datum: zaznam.datum ?? null, pocetPriloh: pdf.length, textOdkazu: odkaz.text });
    rodice.set(odkaz.url, seznamRodicu);
  }
  let vlastniText = clanek.text;
  for (const odkaz of clanek.dokumenty) if (odkaz.text) vlastniText = vlastniText.replaceAll(odkaz.text, '');
  const dostVlastnihoTextu = vlastniText.replace(/\s+/g, ' ').trim().length >= MIN_VLASTNIHO_TEXTU[zaznam.typ];
  const seznamOdkazu = zaznam.typ === 'stranka' && clanek.text.length >= MIN_TEXTU_STALE_STRANKY;
  if (!dostVlastnihoTextu && !seznamOdkazu) {
    zprava.obalky += 1;
    if (zaznam.typ !== 'uredni-deska' && !pdf.length) zprava.bezTextu.push(zaznam.url);
    continue;
  }
  const r = rest[zaznam.url];
  pridat({
    url: zaznam.url,
    nazev: clanek.nazev,
    web: 'prisovice.cz',
    typ: zaznam.typ,
    zverejneno: zaznam.typ === 'uredni-deska' ? clanek.datum : r?.date.slice(0, 10) ?? clanek.datum,
    zmeneno: r?.modified.slice(0, 10) ?? ulozeny.lastmod?.slice(0, 10) ?? null,
    mesicNahrani: null,
    stazeno: ulozeny.stazeno,
    nadrazenyUrl: null,
  }, [{ strana: null, text: clanek.text }]);
}

// 2. Přílohy: PDF, Word a ODT. Název a datum dává stránka, která na přílohu odkazuje, přednostně položka úřední desky.
// V indexu mají typ „pdf“ (přiložený soubor), aby se nemusela měnit tabulka v D1.
const nacistText = async (soubor: string) => (existsSync(path.join(SLOZKA_DAT, soubor)) ? fs.readFile(path.join(SLOZKA_DAT, soubor), 'utf8') : null);

const prilohyKeZpracovani = seznam.filter((z) => z.typ === 'pdf' && jeStazeno(z));
for (const [poradi, zaznam] of prilohyKeZpracovani.entries()) {
  const kandidati = (rodice.get(zaznam.url) ?? []).sort((a, b) => PORADI_RODICU.indexOf(a.typ) - PORADI_RODICU.indexOf(b.typ));
  const rodic = kandidati[0];
  if (!rodic) {
    zprava.chyby.push({ url: zaznam.url, hlaska: 'Chybí stránka, která na přílohu odkazuje.' });
    continue;
  }
  const souborPrilohy = decodeURIComponent(new URL(zaznam.url).pathname.split('/').at(-1) ?? '');
  let nazev = rodic.nazev;
  if (rodic.pocetPriloh > 1 || !nazev) {
    const popis = rodic.textOdkazu && !OBECNE_ODKAZY.test(rodic.textOdkazu) && rodic.textOdkazu !== nazev ? rodic.textOdkazu : souborPrilohy;
    nazev = nazev ? `${nazev} – ${popis}` : popis;
  }
  const dokument = {
    url: zaznam.url,
    web: 'prisovice.cz',
    typ: 'pdf',
    zverejneno: rodic.typ === 'stranka' ? null : rodic.datum,
    zmeneno: null,
    mesicNahrani: mesicNahrani(zaznam.url),
    stazeno: stav.pdf[zaznam.url].stazeno,
    nadrazenyUrl: rodic.url,
  } as const;

  if (formatPrilohy(zaznam.url) === 'word') {
    const surovy = await nacistText(souborTextuWordu(zaznam.url));
    if (surovy === null) {
      zprava.chyby.push({ url: zaznam.url, hlaska: 'Chybí text z Wordu. Spusťte npm run index:word.' });
      continue;
    }
    const text = textWordu(surovy);
    if (text.replace(/\s+/g, '').length < MIN_ZNAKU_STRANY) {
      zprava.bezTextu.push(zaznam.url);
      continue;
    }
    zprava.word.push({ url: zaznam.url, nazev, znaku: text.length });
    pridat({ ...dokument, nazev }, [{ strana: null, text }]);
    continue;
  }

  let strany;
  try {
    strany = await textPdf(new Uint8Array(await fs.readFile(path.join(SLOZKA_DAT, stav.pdf[zaznam.url].soubor))));
  } catch (chyba) {
    zprava.chyby.push({ url: zaznam.url, hlaska: chyba instanceof Error ? chyba.message.slice(0, 200) : 'neznámá chyba' });
    continue;
  }
  // Strana bez textové vrstvy dostane text z OCR, když je čitelný. Výkresy a mapy zůstanou mimo index.
  const zOcr: number[] = [];
  for (const strana of strany) {
    if (strana.text.replace(/\s+/g, '').length >= MIN_ZNAKU_STRANY) continue;
    const surovy = await nacistText(souborOcr(zaznam.url, strana.strana));
    if (surovy === null) continue;
    const text = textOcr(surovy);
    if (jeCitelnyOcr(text)) {
      strana.text = text;
      zOcr.push(strana.strana);
    } else if (text) {
      zprava.ocrNecitelne.push({ url: zaznam.url, strana: strana.strana });
    }
  }
  const sTextem = strany.filter((s) => s.text.replace(/\s+/g, '').length >= MIN_ZNAKU_STRANY);
  if (!sTextem.length) {
    zprava.skeny.push({ url: zaznam.url, nazev, stran: strany.length });
    continue;
  }
  if (sTextem.length < strany.length) {
    zprava.castecneSkeny.push({ url: zaznam.url, nazev, stranBezTextu: strany.filter((s) => !sTextem.includes(s)).map((s) => s.strana) });
  }
  // Název řekne, že text pochází z OCR a může obsahovat chyby rozpoznání. Rozhoduje znění dokumentu.
  if (zOcr.length) {
    nazev += zOcr.length === sTextem.length ? ' (text rozpoznaný ze skenu)' : ' (část textu rozpoznaná ze skenu)';
    zprava.ocr.push({ url: zaznam.url, nazev, strany: zOcr });
  }
  pridat({ ...dokument, nazev }, sTextem.map((s) => ({ strana: s.strana, text: s.text })));
  if ((poradi + 1) % 25 === 0) console.log(`Přílohy ${poradi + 1}/${prilohyKeZpracovani.length}`);
}

// 3. Karty projektů z ostrého webu Nezávislých. Jedna karta je jeden dokument.
if (stav.karty) {
  for (const karta of precistKarty(await fs.readFile(path.join(SLOZKA_DAT, 'karty.html'), 'utf8'))) {
    pridat({
      url: `${WEB_NEZAVISLYCH}/#${karta.slug}`,
      nazev: karta.nazev,
      web: 'nezavisli-prisovice.cz',
      typ: 'karta',
      zverejneno: null,
      zmeneno: null,
      mesicNahrani: null,
      stazeno: stav.karty.stazeno,
      nadrazenyUrl: null,
    }, [{ strana: null, text: karta.text }]);
  }
}

await ulozitJson(path.join(SLOZKA_DAT, 'dokumenty.json'), dokumenty);
await ulozitJson(path.join(SLOZKA_DAT, 'useky.json'), useky);

const podleTypu = (typ: TypDokumentu) => {
  const id = new Set(dokumenty.filter((d) => d.typ === typ).map((d) => d.id));
  const vybrane = useky.filter((u) => id.has(u.dokumentId));
  return { dokumentu: id.size, useku: vybrane.length, znaku: vybrane.reduce((soucet, u) => soucet + u.text.length, 0) };
};
const souhrn = Object.fromEntries((['stranka', 'aktualita', 'uredni-deska', 'pdf', 'karta'] as const).map((typ) => [typ, podleTypu(typ)]));
await ulozitJson(path.join(SLOZKA_DAT, 'zprava.json'), { ...zprava, souhrn, dokumentu: dokumenty.length, useku: useky.length });

console.log(`Dokumentů ${dokumenty.length}, úseků ${useky.length}.`);
for (const [typ, s] of Object.entries(souhrn)) console.log(`  ${typ}: ${s.dokumentu} dokumentů, ${s.useku} úseků, ${s.znaku} znaků`);
console.log(`Obálek bez vlastního textu ${zprava.obalky}, skenů ${zprava.skeny.length}, PDF se stranami bez textu ${zprava.castecneSkeny.length}, duplicit ${zprava.duplicity.length}, chyb ${zprava.chyby.length}.`);
console.log(`Word a ODT ${zprava.word.length}, PDF s textem z OCR ${zprava.ocr.length} (${zprava.ocr.reduce((s, o) => s + o.strany.length, 0)} stran), nečitelných stran OCR ${zprava.ocrNecitelne.length}.`);
