// Krok 8.8: schválená sada typových otázek přes celou cestu jako na stránce (npm run eval:odpovedi).
// Úprava AI navrhne typ a text, dotaz pak projde hledáním, odpovědí a ověřením. Výsledek je tabulka k ruční kontrole.
// Úpravy se ukládají do složky dat, opakovaný běh je nepočítá znovu (šetří denní neurony). Přepínač --znovu je přepočítá.
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { MODEL_UPRAVY, vytvorCloudflareAi } from '../../src/lib/ai/cloudflare';
import { VERZE_PROMPTU } from '../../src/lib/ai/prompt-upravy';
import type { UpravaVzkazu } from '../../src/lib/ai/uprava';
import { vytvorIndexCloudflare } from '../../src/lib/odpovedi/cloudflare';
import { PRAH_PODOBNOSTI } from '../../src/lib/odpovedi/hledani';
import { odpovedetNaDotaz, type VysledekOdpovedi } from '../../src/lib/odpovedi/odpoved';
import { VERZE_PROMPTU_ODPOVEDI } from '../../src/lib/odpovedi/prompt-odpovedi';
import { pripojitCloudflare } from './cloudflare';
import { SLOZKA_DAT } from './nastaveni';
import { nacistJson, ulozitJson } from './spolecne';

interface Otazka {
  id: string;
  text: string;
  typ: string;
  vysledek: 'odpoved' | 'zastupitelum' | 'nehleda';
  klicova_fakta?: string[];
  zdroje?: { url: string }[];
}

const sada = JSON.parse(await fs.readFile('tests/data/typove-otazky.json', 'utf8')) as { schvaleno: unknown; otazky: Otazka[] };
// Zadání kroku 8: sada se k vyhodnocení použije až po schválení Tomášem.
if (!sada.schvaleno) throw new Error('Sada typových otázek ještě není schválená.');
const vybrane = process.argv.slice(2).filter((a) => /^Q\d+$/.test(a));
const otazky = vybrane.length ? sada.otazky.filter((o) => vybrane.includes(o.id)) : sada.otazky;
const znovu = process.argv.includes('--znovu');
const prah = Number(process.env.UCHO_PRAH ?? PRAH_PODOBNOSTI);

const souborUprav = path.join(SLOZKA_DAT, 'vyhodnoceni-upravy.json');
const upravy = await nacistJson<Record<string, UpravaVzkazu>>(souborUprav, {});
const klicUpravy = (text: string) => createHash('sha256').update(`${MODEL_UPRAVY}|${VERZE_PROMPTU}|${text}`).digest('hex');
// Obec některé PDF zveřejnila dvakrát. Index nechá jednu kopii, obě adresy jsou pro vyhodnocení jeden zdroj.
const { duplicity } = await nacistJson<{ duplicity: { url: string; stejnyJako: string }[] }>(path.join(SLOZKA_DAT, 'zprava.json'), { duplicity: [] });
const kopie = new Map(duplicity.map((d) => [d.url, d.stejnyJako]));
const bezKotvy = (url: string) => {
  const cista = url.replace(/#page=\d+$/, '');
  return kopie.get(cista) ?? cista;
};

const { env, ukoncit } = await pripojitCloudflare();
const radky: Record<string, unknown>[] = [];
try {
  const zakladniAi = vytvorCloudflareAi(env.AI);
  // Surové výstupy modelu jdou jen do souboru vyhodnocení ve složce dat, ne do logu ani do repozitáře.
  let vystupyModelu: { ms: number; vystup: string }[] = [];
  const ai: typeof zakladniAi = {
    ...zakladniAi,
    async generovat(zpravy, moznosti) {
      const zacatek = Date.now();
      const vystup = await zakladniAi.generovat(zpravy, moznosti);
      vystupyModelu.push({ ms: Date.now() - zacatek, vystup });
      return vystup;
    },
  };
  const index = vytvorIndexCloudflare(env.DB, env.VECTORIZE);
  for (const otazka of otazky) {
    const klic = klicUpravy(otazka.text);
    if (znovu || !upravy[klic]) {
      upravy[klic] = (await ai.upravit(otazka.text)).uprava;
      await ulozitJson(souborUprav, upravy);
    }
    const uprava = upravy[klic];
    const radek: Record<string, unknown> = { id: otazka.id, ocekavano: otazka.vysledek, typSady: otazka.typ, typUpravy: uprava.typ, textUpravy: uprava.text };
    if (uprava.typ !== 'dotaz') {
      radek.vysledek = 'nehleda';
    } else {
      vystupyModelu = [];
      let nalezene: { url: string; podobnost: number }[] = [];
      const zacatek = Date.now();
      let vysledek: VysledekOdpovedi | { vysledek: 'zastupitelum'; duvod: 'chyba-ai'; chyba: string };
      try {
        vysledek = await odpovedetNaDotaz(uprava.text, {
          ai,
          index,
          prahPodobnosti: prah,
          naHledani: (useky, nejlepsi) => {
            nalezene = useky.map((u) => ({ url: u.dokument.url, podobnost: nejlepsi }));
          },
        });
      } catch (chyba) {
        vysledek = { vysledek: 'zastupitelum', duvod: 'chyba-ai', chyba: chyba instanceof Error ? chyba.message.slice(0, 200) : String(chyba) };
      }
      radek.celkemMs = Date.now() - zacatek;
      radek.vystupyModelu = vystupyModelu;
      radek.vysledek = vysledek.vysledek;
      if ('technicke' in vysledek) radek.technicke = vysledek.technicke;
      if (vysledek.vysledek === 'zastupitelum') radek.duvod = vysledek.duvod;
      if ('chyba' in vysledek) radek.chyba = vysledek.chyba;
      if (vysledek.vysledek === 'odpoved') radek.odpoved = vysledek.odpoved;
      const ocekavaneUrl = new Set((otazka.zdroje ?? []).map((z) => bezKotvy(z.url)));
      radek.nalezeneZdroje = [...new Set(nalezene.map((n) => n.url))];
      radek.ocekavanyZdrojNalezen = ocekavaneUrl.size ? (radek.nalezeneZdroje as string[]).some((u) => ocekavaneUrl.has(u)) : null;
      if (vysledek.vysledek === 'odpoved') {
        radek.citujeOcekavanyZdroj = vysledek.odpoved.zdroje.some((z) => ocekavaneUrl.has(bezKotvy(z.url)));
      }
    }
    // Automatický návrh hodnocení. Konečné hodnocení odpovědí je ruční (docs/vyhodnoceni-odpovedi.md).
    radek.automaticky = otazka.vysledek === 'nehleda'
      ? radek.vysledek === 'nehleda'
      : otazka.vysledek === 'zastupitelum'
        ? radek.vysledek !== 'odpoved'
        : radek.vysledek === 'odpoved' && radek.citujeOcekavanyZdroj === true;
    radky.push(radek);
    console.log(`${otazka.id} čekám ${otazka.vysledek}, typ ${uprava.typ}, výsledek ${String(radek.vysledek)}${radek.duvod ? ` (${String(radek.duvod)})` : ''}${radek.celkemMs ? `, ${String(radek.celkemMs)} ms` : ''}`);
  }
} finally {
  await ukoncit();
}

const souhrn = {
  spusteno: new Date().toISOString(),
  model: MODEL_UPRAVY,
  verzePromptuUpravy: VERZE_PROMPTU,
  verzePromptuOdpovedi: VERZE_PROMPTU_ODPOVEDI,
  prahPodobnosti: prah,
  otazek: radky.length,
};
const soubor = path.join(SLOZKA_DAT, `vyhodnoceni-${souhrn.spusteno.slice(0, 19).replace(/[:T]/g, '-')}.json`);
await ulozitJson(soubor, { souhrn, radky });

const skupina = (vysledek: string) => radky.filter((r) => r.ocekavano === vysledek);
const prosly = (seznam: Record<string, unknown>[]) => seznam.filter((r) => r.automaticky).length;
const casy = radky.flatMap((r) => (typeof r.celkemMs === 'number' && r.vysledek === 'odpoved' ? [r.celkemMs] : []));
console.log(`\nS odpovědí: automaticky ${prosly(skupina('odpoved'))}/${skupina('odpoved').length} (správnost odpovědi ještě ručně).`);
console.log(`Zastupitelům: ${prosly(skupina('zastupitelum'))}/${skupina('zastupitelum').length}.`);
console.log(`Nehledat: ${prosly(skupina('nehleda'))}/${skupina('nehleda').length}.`);
console.log(`Odpovědi do 10 s: ${casy.filter((c) => c <= 10_000).length}/${casy.length}.`);
console.log(`Výsledky: ${soubor}`);
