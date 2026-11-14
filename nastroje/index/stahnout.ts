// Krok 8.3: ruční stažení zdrojů pro index (npm run index:stahnout). Pravidelný běh do MVP nepatří (F-71).
// Bere prisovice.cz v okně 4 let a karty projektů z ostrého webu Nezávislých. Stažené soubory ukládá mimo git.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { precistKarty } from './karty';
import {
  MAX_OBRAZKU_CLANKU,
  OKNO_OD,
  OKNO_OD_MESIC,
  SLOZKA_DAT,
  VYPISOVE_STRANKY,
  WEB_EOBEC,
  WEB_NEZAVISLYCH,
  WEB_OBCE,
  jeRizeniSoukromeOsoby,
} from './nastaveni';
import { precistDeskuEobec } from './eobec';
import { odkazyPodkladu } from './nezavisli';
import { precistRobots, vytvorStahovac } from './sit';
import { precistSitemapu, rozebratClanek, typSitemapy, type TypPolozky, type ZaznamRest } from './wordpress';
import {
  formatPrilohy,
  mesicNahrani,
  nacistJson,
  souborObrazku,
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
await fs.mkdir(path.join(SLOZKA_DAT, 'obrazky'), { recursive: true });

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
// Obrázky pozvánek a plakátů pro OCR a článek, ve kterém jsou (rozšíření z 13. 11. 2026).
const obrazky = new Map<string, string>();

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
  if (typ !== 'stranka' && !soukrome && clanek.obrazky.length <= MAX_OBRAZKU_CLANKU) {
    for (const obrazek of clanek.obrazky) if (!obrazky.has(obrazek)) obrazky.set(obrazek, url);
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

// 5a. Stará úřední deska na prisovice.e-obec.cz (Tomáš 14. 11. 2026): aktuálně vyvěšené dokumenty a archiv. Bere se, co bylo
// vyvěšeno v okně, a co visí dosud (třeba nařízení vyvěšené trvale). Dokument, který je i na novém webu obce, se v indexu
// objeví jednou: zpracování vyřadí kopii se stejným textem.
{
  stav.eobec ??= {};
  const robots = await stahovac.stahnout(`${WEB_EOBEC}/robots.txt`);
  const jePovolenoEobec = robots.status === 200 ? precistRobots(dekodovat(robots.bajty)) : () => true;
  const idNaUrl = new Map(Object.entries(stav.eobec).map(([url, z]) => [z.id, url]));
  const dnes = ted().slice(0, 10);
  const stranky = [`${WEB_EOBEC}/urednideska.php`, `${WEB_EOBEC}/urednideska.php?akce=archive`];
  for (const stranka of stranky) {
    if (!jePovolenoEobec(stranka)) continue;
    const vysledek = await stahovac.stahnout(stranka);
    if (vysledek.status !== 200) throw new Error(`${stranka} vrátil ${vysledek.status}.`);
    for (const p of precistDeskuEobec(dekodovat(vysledek.bajty))) {
      const odkaz = `${WEB_EOBEC}/urednideska.php?soubor=${p.id}`;
      const zaznam: ZaznamSeznamu = { url: odkaz, typ: 'pdf', stav: 'stazeno', nazev: p.nazev, datum: p.vyveseno, rodic: stranka };
      seznam.push(zaznam);
      const znama = idNaUrl.get(p.id);
      if (znama && existsSync(path.join(SLOZKA_DAT, souborPrilohy(znama)))) {
        zaznam.url = znama;
        zaznam.stav = 'beze-zmeny';
        stav.eobec[znama] = { id: p.id, nazev: p.nazev, vyveseno: p.vyveseno, sejmuto: p.sejmuto, stranka };
        pocty.bezeZmeny += 1;
        continue;
      }
      if (!((p.vyveseno ?? '') >= OKNO_OD || (p.sejmuto ?? '') >= dnes)) {
        zaznam.stav = 'mimo-okno';
        continue;
      }
      if (jeRizeniSoukromeOsoby(p.nazev, [])) {
        zaznam.stav = 'vynechano';
        zaznam.duvod = 'řízení soukromé osoby';
        continue;
      }
      if (!jePovolenoEobec(odkaz)) {
        zaznam.stav = 'robots';
        continue;
      }
      const soubor = await stahovac.stahnout(odkaz);
      if (soubor.status !== 200) {
        zaznam.stav = 'chyba';
        zaznam.duvod = `HTTP ${soubor.status}`;
        continue;
      }
      zaznam.url = soubor.adresa;
      if (new URL(soubor.adresa).hostname !== new URL(WEB_EOBEC).hostname) {
        zaznam.stav = 'cizi-domena';
        continue;
      }
      if (!formatPrilohy(soubor.adresa)) {
        zaznam.stav = 'jiny-format';
        continue;
      }
      const cil = souborPrilohy(soubor.adresa);
      await fs.writeFile(path.join(SLOZKA_DAT, cil), soubor.bajty);
      stav.pdf[soubor.adresa] = { soubor: cil, stazeno: ted(), velikostB: soubor.bajty.byteLength };
      stav.eobec[soubor.adresa] = { id: p.id, nazev: p.nazev, vyveseno: p.vyveseno, sejmuto: p.sejmuto, stranka };
      pocty.stazeno += 1;
    }
  }
}

// 5b. Obrázky pozvánek a plakátů z aktualit a úřední desky v okně (rozšíření z 13. 11. 2026). Jen z webu obce.
stav.obrazky ??= {};
for (const [url, rodic] of obrazky) {
  const zaznam: ZaznamSeznamu = { url, typ: 'obrazek', stav: 'stazeno', rodic };
  seznam.push(zaznam);
  if (new URL(url).hostname !== new URL(WEB_OBCE).hostname) {
    zaznam.stav = 'cizi-domena';
    continue;
  }
  if (!jePovoleno(url)) {
    zaznam.stav = 'robots';
    continue;
  }
  const soubor = souborObrazku(url);
  if (stav.obrazky[url] && existsSync(path.join(SLOZKA_DAT, soubor))) {
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
  stav.obrazky[url] = { soubor, stazeno: ted(), velikostB: vysledek.bajty.byteLength };
  pocty.stazeno += 1;
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

// 7. Tlampač a podklady webu Nezávislých (rozšíření z 10. 11. 2026). Podklady jsou veřejné soubory Markdown,
// které web zveřejňuje pro čtení strojem. Timeline z projektu webu se nečte vůbec.
{
  const jePovolenoNezavisli = precistRobots(await stahnoutText(`${WEB_NEZAVISLYCH}/robots.txt`));
  stav.nezavisli ??= { soubory: {} };
  await fs.mkdir(path.join(SLOZKA_DAT, 'nezavisli'), { recursive: true });

  // Stáhne soubor a uloží ho, když se od minule změnil. Vrací jeho text, nebo null, když ho nejde použít.
  const stahnoutNezavisli = async (url: string, soubor: string): Promise<string | null> => {
    const zaznam: ZaznamSeznamu = { url, typ: 'nezavisli', stav: 'stazeno' };
    seznam.push(zaznam);
    if (!jePovolenoNezavisli(url)) {
      zaznam.stav = 'robots';
      return null;
    }
    const vysledek = await stahovac.stahnout(url);
    if (vysledek.status !== 200) {
      zaznam.stav = 'chyba';
      zaznam.duvod = `HTTP ${vysledek.status}`;
      return null;
    }
    const text = dekodovat(vysledek.bajty);
    const otisk = sha1(text);
    const ulozeny = stav.nezavisli!.soubory[url];
    if (ulozeny && ulozeny.otisk === otisk && existsSync(path.join(SLOZKA_DAT, soubor))) {
      zaznam.stav = 'beze-zmeny';
      pocty.bezeZmeny += 1;
    } else {
      await fs.writeFile(path.join(SLOZKA_DAT, soubor), text, 'utf8');
      stav.nezavisli!.soubory[url] = { soubor, stazeno: ted(), otisk };
      pocty.stazeno += 1;
    }
    return text;
  };

  await stahnoutNezavisli(`${WEB_NEZAVISLYCH}/tlampac`, path.join('nezavisli', 'tlampac.html'));
  const rozcestnik = await stahnoutNezavisli(`${WEB_NEZAVISLYCH}/podklady/`, path.join('nezavisli', 'podklady.html'));
  for (const url of rozcestnik ? odkazyPodkladu(rozcestnik, `${WEB_NEZAVISLYCH}/podklady/`) : []) {
    await stahnoutNezavisli(url, path.join('nezavisli', `podklady-${path.basename(new URL(url).pathname)}`));
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
