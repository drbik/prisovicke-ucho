// Témata ve feedu, fáze D (13. 11. 2026): vyhodnocení schválené sady pro sdružování (tests/data/sada-temat.json).
// Každý vzkaz projde AI úpravou jako na stránce (výsledek se uloží do složky dat, opakovaný běh ji nepočítá znovu,
// přepínač --znovu ji spočítá znovu). Nabídka podobných témat a nové otázky jdou přes stejný kód jako v aplikaci.
//   npx tsx nastroje/vyhodnotit-temata.ts
// Jen čte ostrou D1 (skutečný vzkaz na Sokolovnu) a volá Workers AI. Výsledek je v konzoli a v souboru
// vyhodnoceni-temat.json ve složce dat.
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { MODEL_ODPOVEDI, MODEL_UPRAVY, MODEL_VEKTORU, vytvorCloudflareAi, type VazbaAi } from '../src/lib/ai/cloudflare';
import { VERZE_PROMPTU } from '../src/lib/ai/prompt-upravy';
import type { UpravaVzkazu } from '../src/lib/ai/uprava';
import type { TypPodnetu } from '../src/lib/oblasti';
import { UKAZKOVA_TEMATA } from '../src/lib/temata/temata';
import { PRAH_NABIDKY, najitPodobnaTemata } from '../src/lib/vzkazy/podobnost';
import { VERZE_PROMPTU_TEMAT } from '../src/lib/vzkazy/prompt-temat';
import { najitNoveOtazky, noveTema, temaZUkazky, zajistitTema } from '../src/lib/vzkazy/temata';
import type { UlozisteVzkazu } from '../src/lib/vzkazy/typy';
import { vytvorPametoveUloziste } from '../src/lib/vzkazy/uloziste';
import { pripojitCloudflare } from './index/cloudflare';
import { SLOZKA_DAT } from './index/nastaveni';
import { nacistJson, ulozitJson } from './index/spolecne';

type Vztah = 'totez' | 'poddotaz' | 'doplneni' | 'jine';
interface Vzkaz { id: string; text: string; vztahy: Record<string, Vztah>; zakladatel?: boolean }
interface Skupina { id: string; tema: string; typ: TypPodnetu; vzkazy: Vzkaz[] }

const sada = JSON.parse(await fs.readFile('tests/data/sada-temat.json', 'utf8')) as { schvaleno: string | null; skupiny: Skupina[] };
// Zadání: sada se k vyhodnocení použije až po schválení Tomášem.
if (!sada.schvaleno) throw new Error('Sada pro sdružování ještě není schválená.');
const znovu = process.argv.includes('--znovu');
const SOKOLOVNA = '2j1g3o2u57';

// Ceník Workers AI (13. 11. 2026), neurony za milion tokenů. Embeddingy počet tokenů nevrací, odhad 3 znaky na token.
const NEURONY: Record<string, { vstup: number; vystup: number }> = {
  [MODEL_VEKTORU]: { vstup: 1075, vystup: 0 },
  [MODEL_ODPOVEDI]: { vstup: 9091, vystup: 27273 },
};
const spotreba: Record<string, { vstup: number; vystup: number }> = {};
const zapsat = (ucel: string, vstup: number, vystup = 0) => {
  const s = (spotreba[ucel] ??= { vstup: 0, vystup: 0 });
  s.vstup += vstup;
  s.vystup += vystup;
};

const souborUprav = path.join(SLOZKA_DAT, 'sada-temat-upravy.json');
const upravy = await nacistJson<Record<string, UpravaVzkazu>>(souborUprav, {});
const klicUpravy = (text: string) => createHash('sha256').update(`${MODEL_UPRAVY}|${VERZE_PROMPTU}|${text}`).digest('hex');

const { env, ukoncit } = await pripojitCloudflare();
try {
  let ucel = 'jine';
  const vazba: VazbaAi = {
    async run(model, vstup) {
      const vystup = await env.AI.run(model, vstup) as { usage?: { prompt_tokens?: number; completion_tokens?: number } };
      if (model === MODEL_VEKTORU) zapsat('vektory', (vstup.text as string[]).reduce((s, t) => s + Math.ceil(t.length / 3), 0));
      else zapsat(ucel, vystup?.usage?.prompt_tokens ?? 0, vystup?.usage?.completion_tokens ?? 0);
      return vystup;
    },
  };
  const ai = vytvorCloudflareAi(vazba);

  // 1. AI úprava každého vzkazu, jako na stránce.
  ucel = 'uprava';
  const vsechny = sada.skupiny.flatMap((s) => s.vzkazy.map((v) => ({ ...v, skupina: s })));
  for (const v of vsechny) {
    const klic = klicUpravy(v.text);
    if (znovu || !upravy[klic]) {
      upravy[klic] = (await ai.upravit(v.text)).uprava;
      await ulozitJson(souborUprav, upravy);
    }
  }
  const upraveno = (v: Vzkaz) => upravy[klicUpravy(v.text)];

  // 2. Témata: ukázky, ukazka-03 se skutečným vzkazem na Sokolovnu a nová témata zakladatelů skupin.
  const { results } = await env.DB.prepare('SELECT id, text, nazev FROM vzkaz WHERE id = ?').bind(SOKOLOVNA).all<{ id: string; text: string; nazev: string }>();
  const sokolovna = results[0];
  if (!sokolovna) throw new Error(`Vzkaz v-${SOKOLOVNA} v ostré D1 není.`);
  ucel = 'jine';
  const ted = new Date();
  async function pripravitUloziste(sSokolovnou: boolean) {
    const uloziste = vytvorPametoveUloziste();
    const z = { uloziste, ai, ukazky: UKAZKOVA_TEMATA };
    const pridat = async (temaId: string, text: string, nazev: string, typ: TypPodnetu, klic: string) => {
      const [vektor, vektorNazvu] = await ai.vektory([text, nazev]);
      const { id } = await uloziste.ulozitVzkaz({
        klicNavrhu: klic, vstup: 'text', surovyText: text, navrhText: text, text, nazev, typ, oblast: 'ostatni', styl: 'spisovne', textStylu: null, vektor, vektorNazvu,
      }, ted);
      await uloziste.pripojit(id, temaId, temaId.startsWith('ukazka-') ? 'poddotaz' : 'zakladatel', ted);
    };
    if (sSokolovnou) {
      await zajistitTema('ukazka-03', z, ted);
      await pridat('ukazka-03', sokolovna.text, sokolovna.nazev, 'dotaz', 'sokolovna');
    }
    for (const s of sada.skupiny) {
      const zakladatel = s.vzkazy.find((v) => v.zakladatel);
      if (!zakladatel) continue;
      const u = upraveno(zakladatel);
      await uloziste.zalozitTema({ ...noveTema({ nazev: u.nazev, text: u.text, typ: s.typ, oblast: u.oblast }, ted), id: s.id });
      await pridat(s.id, u.text, u.nazev, s.typ, zakladatel.id);
    }
    return { uloziste, z };
  }
  const sSokolovnou = await pripravitUloziste(true);
  const bezSokolovny = await pripravitUloziste(false);
  const bezZakladatelu = { uloziste: vytvorPametoveUloziste() as UlozisteVzkazu, ai, ukazky: UKAZKOVA_TEMATA };

  // 3. Nabídka pro každý vzkaz a nové otázky u párů totéž (s odpovědí) a poddotaz.
  const radky: Record<string, unknown>[] = [];
  const casyNabidky: number[] = [];
  const pary: { vzkaz: string; tema: string; vztah: Vztah; nabidnuto: boolean; poradi: number; podobnost: number | null; noveOtazky?: string[] | null }[] = [];
  for (const v of vsechny) {
    const u = upraveno(v);
    const typ = v.skupina.typ;
    // Skutečný vzkaz na Sokolovnu je v sadě i jako vzkaz (G01-1). Sám se sebou se neporovnává.
    const z = v.zakladatel ? bezZakladatelu : v.id === 'G01-1' ? bezSokolovny.z : sSokolovnou.z;
    ucel = 'jine';
    const zacatek = Date.now();
    const [vektor, vektorNazvu] = await ai.vektory([u.text, u.nazev]);
    const vsechnyPodobne = await najitPodobnaTemata({ vektor, vektorNazvu }, typ, z, undefined, -1, 1000);
    casyNabidky.push(Date.now() - zacatek);
    const nabidka = vsechnyPodobne.filter((p) => p.podobnost >= PRAH_NABIDKY).slice(0, 3);
    const nabidnute = new Set(nabidka.map((p) => p.id));
    for (const [tema, vztah] of Object.entries(v.vztahy)) {
      const misto = vsechnyPodobne.findIndex((p) => p.id === tema);
      const radek: (typeof pary)[number] = {
        vzkaz: v.id, tema, vztah, nabidnuto: nabidnute.has(tema), poradi: misto + 1, podobnost: misto >= 0 ? vsechnyPodobne[misto].podobnost : null,
      };
      // Nové otázky: u poddotazu, a u totéž jen u tématu s odpovědí (jinde ucho hledá rovnou, bez nových otázek).
      const ukazka = UKAZKOVA_TEMATA.find((t) => t.id === tema);
      if (typ === 'dotaz' && (vztah === 'poddotaz' || (vztah === 'totez' && ukazka?.odpoved))) {
        const temaFeedu = ukazka ? temaZUkazky(ukazka) : { ...temaZUkazky(UKAZKOVA_TEMATA[0]), id: tema, text: upraveno(v.skupina.vzkazy[0]).text, odpoved: undefined };
        ucel = 'nove-otazky';
        radek.noveOtazky = await najitNoveOtazky(temaFeedu, u.text, ai, 15_000);
      }
      pary.push(radek);
    }
    radky.push({
      id: v.id, typUpravy: u.typ, typSady: typ, nazev: u.nazev, zakladatel: v.zakladatel ?? false,
      nabidka: nabidka.map((p) => `${p.id} ${p.podobnost}`),
    });
  }

  const spojit = pary.filter((p) => p.vztah !== 'jine');
  const jine = pary.filter((p) => p.vztah === 'jine');
  const totezSOdpovedi = pary.filter((p) => p.vztah === 'totez' && p.noveOtazky !== undefined);
  const poddotazy = pary.filter((p) => p.vztah === 'poddotaz');
  const zakladatele = radky.filter((r) => r.zakladatel);
  const neurony = Object.entries(spotreba).reduce((s, [klic, v]) => {
    const cena = NEURONY[klic === 'vektory' ? MODEL_VEKTORU : MODEL_ODPOVEDI];
    return s + (v.vstup * cena.vstup + v.vystup * cena.vystup) / 1e6;
  }, 0);
  const median = (pole: number[]) => [...pole].sort((a, b) => a - b)[Math.floor(pole.length / 2)];
  const souhrn = {
    datum: ted.toISOString(),
    verzePromptuTemat: VERZE_PROMPTU_TEMAT,
    modelUpravy: MODEL_UPRAVY,
    verzePromptuUpravy: VERZE_PROMPTU,
    prahNabidky: PRAH_NABIDKY,
    vzkazu: vsechny.length,
    nabidka: `${spojit.filter((p) => p.nabidnuto).length} z ${spojit.length}`,
    nabidkaPodleVztahu: Object.fromEntries((['totez', 'poddotaz', 'doplneni'] as const).map((vztah) => {
      const p = spojit.filter((x) => x.vztah === vztah);
      return [vztah, `${p.filter((x) => x.nabidnuto).length} z ${p.length}`];
    })),
    naPrvnimMiste: `${spojit.filter((p) => p.poradi === 1).length} z ${spojit.length}`,
    jineNabidnuto: `${jine.filter((p) => p.nabidnuto).length} z ${jine.length}`,
    zakladateleSNabidkou: `${zakladatele.filter((r) => (r.nabidka as string[]).length).length} z ${zakladatele.length}`,
    noveOtazkyTotezPrazdne: `${totezSOdpovedi.filter((p) => p.noveOtazky?.length === 0).length} z ${totezSOdpovedi.length}`,
    noveOtazkyPoddotazNeprazdne: `${poddotazy.filter((p) => (p.noveOtazky?.length ?? 0) > 0).length} z ${poddotazy.length}`,
    jinyTypZUpravy: radky.filter((r) => r.typUpravy !== r.typSady).map((r) => `${r.id} ${r.typUpravy}`),
    medianNabidkyMs: median(casyNabidky),
    neuronu: Math.round(neurony),
    spotreba,
  };
  await ulozitJson(path.join(SLOZKA_DAT, 'vyhodnoceni-temat.json'), { souhrn, radky, pary });
  console.log(JSON.stringify(souhrn, null, 2));
  console.log('\nNenabídnuté páry ke spojení:');
  for (const p of spojit.filter((x) => !x.nabidnuto)) console.log(`  ${p.vzkaz} → ${p.tema} (${p.vztah}), podobnost ${p.podobnost}, pořadí ${p.poradi}`);
  console.log('\nNabídnutá jiná témata:');
  for (const p of jine.filter((x) => x.nabidnuto)) console.log(`  ${p.vzkaz} → ${p.tema}, podobnost ${p.podobnost}`);
  console.log('\nNové otázky mimo očekávání:');
  for (const p of [...totezSOdpovedi.filter((x) => x.noveOtazky?.length !== 0), ...poddotazy.filter((x) => !x.noveOtazky?.length)]) {
    console.log(`  ${p.vzkaz} → ${p.tema} (${p.vztah}): ${JSON.stringify(p.noveOtazky)}`);
  }
  console.log('\nNabídka u zakladatelů a typ z úpravy:');
  for (const r of radky.filter((x) => x.zakladatel || x.typUpravy !== x.typSady)) console.log(`  ${r.id} typ ${r.typUpravy}/${r.typSady}: ${JSON.stringify(r.nabidka)}`);
} finally {
  await ukoncit();
}
