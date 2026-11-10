// Krok 8.3: ruční stažení zdrojů pro index (npm run index:stahnout). Pravidelný běh do MVP nepatří (F-71).
// Bere prisovice.cz v okně 2 let a karty projektů z ostrého webu Nezávislých. Stažené soubory ukládá mimo git.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { precistKarty } from './karty';
import {
  OKNO_OD,
  OKNO_OD_MESIC,
  SLOZKA_DAT,
  VYPISOVE_STRANKY,
  WEB_NEZAVISLYCH,
  WEB_OBCE,
  jeRizeniSoukromeOsoby,
} from './nastaveni';
import { precistRobots, vytvorStahovac } from './sit';
import { precistSitemapu, rozebratClanek, typSitemapy, type TypPolozky, type ZaznamRest } from './wordpress';
import {
  formatPrilohy,
  mesicNahrani,
  nacistJson,
  souborPrilohy,
  souborStavu,
  ulozitJson,
  type StavStazeni,
  type ZaznamSeznamu,
} from './spolecne';

const sha1 = (text: string) => createHash('sha1').update(text).digest('hex');
const ted = () => new Date().toISOString();
const dekodovat = (bajty: Uint8Array) => new TextDecoder('utf-8').decode(bajty);

const stahovac = vytvorStahovac();
const stav = await nacistJson<StavStazeni>(souborStavu(), { html: {}, pdf: {}, karty: null });
const seznam: ZaznamSeznamu[] = [];
const pocty = { stazeno: 0, bezeZmeny: 0 };

await fs.mkdir(path.join(SLOZKA_DAT, 'html'), { recursive: true });
await fs.mkdir(path.join(SLOZKA_DAT, 'pdf'), { recursive: true });
await fs.mkdir(path.join(SLOZKA_DAT, 'word'), { recursive: true });

async function stahnoutText(url: string) {
  const vysledek = await stahovac.stahnout(url);
  if (vysledek.status !== 200) throw new Error(`${url} vrátil ${vysledek.status}.`);
  return dekodovat(vysledek.bajty);
}

// 1. robots.txt
const jePovoleno = precistRobots(await stahnoutText(`${WEB_OBCE}/robots.txt`));

// 2. Sitemapy: adresy a data poslední změny.
const index = precistSitemapu(await stahnoutText(`${WEB_OBCE}/wp-sitemap.xml`));
const polozky: { url: string; lastmod: string | null; typ: TypPolozky }[] = [];
for (const sitemapa of index.sitemapy) {
  const typ = typSitemapy(sitemapa);
  if (!typ) continue;
  for (const adresa of precistSitemapu(await stahnoutText(sitemapa)).adresy) polozky.push({ ...adresa, typ });
}

// 3. REST API dává přesná data zveřejnění a změny stránek a aktualit (úřední deska v něm není).
const datumRest = new Map<string, ZaznamRest>();
for (const druh of ['pages', 'posts']) {
  for (let strana = 1, stran = 1; strana <= stran; strana += 1) {
    const vysledek = await stahovac.stahnout(`${WEB_OBCE}/wp-json/wp/v2/${druh}?per_page=100&page=${strana}&_fields=link,date,modified`);
    if (vysledek.status !== 200) throw new Error(`REST ${druh} vrátil ${vysledek.status}.`);
    stran = Number(vysledek.hlavicky.get('x-wp-totalpages') ?? '1');
    for (const zaznam of JSON.parse(dekodovat(vysledek.bajty)) as ZaznamRest[]) datumRest.set(zaznam.link, zaznam);
  }
}
await ulozitJson(path.join(SLOZKA_DAT, 'rest.json'), Object.fromEntries(datumRest));

// 4. Stránky, aktuality a položky úřední desky.
interface Rodic { url: string; typ: TypPolozky; datum: string | null; soukrome: boolean }
const odkazy = new Map<string, { text: string; rodice: Rodic[] }>();

for (const [poradi, polozka] of polozky.entries()) {
  const { url, lastmod, typ } = polozka;
  const zaznam: ZaznamSeznamu = { url, typ, stav: 'stazeno' };
  seznam.push(zaznam);
  if (VYPISOVE_STRANKY.has(url)) {
    zaznam.stav = 'vypis';
    continue;
  }
  if (!jePovoleno(url)) {
    zaznam.stav = 'robots';
    continue;
  }
  // Co se naposledy změnilo před začátkem okna, nemohlo být v okně zveřejněné.
  if (typ !== 'stranka' && lastmod && lastmod.slice(0, 10) < OKNO_OD) {
    zaznam.stav = 'mimo-okno';
    continue;
  }
  const soubor = path.join('html', `${sha1(url)}.html`);
  const ulozeny = stav.html[url];
  let html: string;
  if (ulozeny && ulozeny.lastmod === lastmod && existsSync(path.join(SLOZKA_DAT, soubor))) {
    html = await fs.readFile(path.join(SLOZKA_DAT, soubor), 'utf8');
    zaznam.stav = 'beze-zmeny';
    pocty.bezeZmeny += 1;
  } else {
    const vysledek = await stahovac.stahnout(url);
    if (vysledek.status !== 200) {
      zaznam.stav = 'chyba';
      zaznam.duvod = `HTTP ${vysledek.status}`;
      continue;
    }
    html = dekodovat(vysledek.bajty);
    await fs.writeFile(path.join(SLOZKA_DAT, soubor), html, 'utf8');
    stav.html[url] = { typ, lastmod, soubor, stazeno: ted() };
    pocty.stazeno += 1;
    if (pocty.stazeno % 25 === 0) await ulozitJson(souborStavu(), stav);
  }
  const clanek = rozebratClanek(html, url);
  if (!clanek) {
    zaznam.stav = 'bez-obsahu';
    continue;
  }
  const datum = typ === 'uredni-deska' ? clanek.datum : datumRest.get(url)?.date.slice(0, 10) ?? clanek.datum;
  zaznam.nazev = clanek.nazev;
  zaznam.datum = datum;
  if (typ !== 'stranka' && (!datum || datum < OKNO_OD)) {
    zaznam.stav = 'mimo-okno';
    continue;
  }
  const soukrome = typ === 'uredni-deska' && jeRizeniSoukromeOsoby(clanek.nazev, clanek.kategorie);
  if (soukrome) {
    zaznam.stav = 'vynechano';
    zaznam.duvod = 'řízení soukromé osoby';
  }
  for (const dokument of clanek.dokumenty) {
    const odkaz = odkazy.get(dokument.url) ?? { text: dokument.text, rodice: [] };
    odkaz.rodice.push({ url, typ, datum, soukrome });
    odkazy.set(dokument.url, odkaz);
  }
  if (poradi % 50 === 0) console.log(`HTML ${poradi + 1}/${polozky.length}`);
}

// 5. PDF, Word a ODT odkázané z obsahu v rozsahu indexu.
for (const [url, { rodice }] of odkazy) {
  const zaznam: ZaznamSeznamu = { url, typ: 'pdf', stav: 'stazeno', rodic: rodice[0].url };
  seznam.push(zaznam);
  const adresa = new URL(url);
  if (adresa.hostname !== new URL(WEB_OBCE).hostname) {
    zaznam.stav = 'cizi-domena';
    continue;
  }
  if (!formatPrilohy(url)) {
    zaznam.stav = 'jiny-format';
    continue;
  }
  if (rodice.every((r) => r.soukrome)) {
    zaznam.stav = 'vynechano';
    zaznam.duvod = 'řízení soukromé osoby';
    continue;
  }
  // PDF ze stálých stránek se berou celá (rozhodnuto 9. 11. 2026), ostatní podle měsíce nahrání v adrese.
  const mesic = mesicNahrani(url);
  const zeStaleStranky = rodice.some((r) => r.typ === 'stranka');
  const vOkne = zeStaleStranky || (mesic ? mesic >= OKNO_OD_MESIC : rodice.some((r) => (r.datum ?? '') >= OKNO_OD));
  if (!vOkne) {
    zaznam.stav = 'mimo-okno';
    continue;
  }
  if (!jePovoleno(url)) {
    zaznam.stav = 'robots';
    continue;
  }
  const soubor = souborPrilohy(url);
  // Nahraný soubor WordPress pod stejnou adresou nemění. Co je stažené, se znovu nestahuje.
  if (stav.pdf[url] && existsSync(path.join(SLOZKA_DAT, soubor))) {
    zaznam.stav = 'beze-zmeny';
    pocty.bezeZmeny += 1;
    continue;
  }
  const vysledek = await stahovac.stahnout(url);
  if (vysledek.status !== 200) {
    zaznam.stav = 'chyba';
    zaznam.duvod = `HTTP ${vysledek.status}`;
    continue;
  }
  await fs.writeFile(path.join(SLOZKA_DAT, soubor), vysledek.bajty);
  stav.pdf[url] = { soubor, stazeno: ted(), velikostB: vysledek.bajty.byteLength };
  pocty.stazeno += 1;
  if (pocty.stazeno % 25 === 0) await ulozitJson(souborStavu(), stav);
}

// 6. Karty projektů z ostrého webu Nezávislých. Soubory projektu webu slouží jen ke kontrole.
{
  const zaznam: ZaznamSeznamu = { url: `${WEB_NEZAVISLYCH}/`, typ: 'karty', stav: 'stazeno' };
  seznam.push(zaznam);
  const hlavicky: Record<string, string> = stav.karty?.etag && existsSync(path.join(SLOZKA_DAT, 'karty.html'))
    ? { 'if-none-match': stav.karty.etag }
    : {};
  const vysledek = await stahovac.stahnout(`${WEB_NEZAVISLYCH}/`, hlavicky);
  if (vysledek.status === 304) {
    zaznam.stav = 'beze-zmeny';
    pocty.bezeZmeny += 1;
  } else if (vysledek.status === 200) {
    const html = dekodovat(vysledek.bajty);
    const stary = existsSync(path.join(SLOZKA_DAT, 'karty.html')) ? await fs.readFile(path.join(SLOZKA_DAT, 'karty.html'), 'utf8') : null;
    if (stary !== null && sha1(stary) === sha1(html) && stav.karty) {
      zaznam.stav = 'beze-zmeny';
      pocty.bezeZmeny += 1;
    } else {
      await fs.writeFile(path.join(SLOZKA_DAT, 'karty.html'), html, 'utf8');
      stav.karty = { stazeno: ted(), etag: vysledek.hlavicky.get('etag') };
      pocty.stazeno += 1;
    }
  } else {
    throw new Error(`Web Nezávislých vrátil ${vysledek.status}.`);
  }
  const karty = precistKarty(await fs.readFile(path.join(SLOZKA_DAT, 'karty.html'), 'utf8'));
  zaznam.duvod = `${karty.length} karet`;
  const projektWebu = process.env.UCHO_WEB_PROJEKT ?? 'C:/Users/tomas/OneDrive/06_CODEX/WEB_Prisovice';
  const slozkaKaret = path.join(projektWebu, 'src', 'content', 'projects');
  if (existsSync(slozkaKaret)) {
    // Soubory mají v názvu pořadí (26-budoucnost-…), stabilní klíč karty je slug ve frontmatteru. Jen se čtou.
    const soubory: string[] = [];
    for (const soubor of await fs.readdir(slozkaKaret)) {
      const obsah = await fs.readFile(path.join(slozkaKaret, soubor), 'utf8');
      soubory.push(/^slug:\s*(\S+)/m.exec(obsah)?.[1] ?? soubor.replace(/\.[^.]+$/, ''));
    }
    const naWebu = new Set(karty.map((k) => k.slug));
    const chybi = soubory.filter((s) => !naWebu.has(s));
    const navic = karty.map((k) => k.slug).filter((s) => !soubory.includes(s));
    if (chybi.length || navic.length) console.warn(`Karty se liší od projektu webu. Chybí na webu: ${chybi.join(', ') || 'nic'}. Navíc na webu: ${navic.join(', ') || 'nic'}.`);
    else console.log(`Všech ${karty.length} karet souhlasí se soubory projektu webu.`);
  }
}

stav.posledniBeh = ted();
await ulozitJson(souborStavu(), stav);
await ulozitJson(path.join(SLOZKA_DAT, 'seznam.json'), seznam);

const souhrn = new Map<string, number>();
for (const z of seznam) souhrn.set(`${z.typ} ${z.stav}`, (souhrn.get(`${z.typ} ${z.stav}`) ?? 0) + 1);
console.log(`Hotovo: ${pocty.stazeno} staženo, ${pocty.bezeZmeny} beze změny, ${stahovac.pocetPozadavku()} požadavků.`);
for (const [klic, pocet] of [...souhrn].sort()) console.log(`  ${klic}: ${pocet}`);
console.log(`Data: ${SLOZKA_DAT}`);
