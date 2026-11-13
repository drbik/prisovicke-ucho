// Zkouška alternativních mluvčích se skutečnou AI (13. 11. 2026): každá vybraná odpověď u každého mluvčího.
// Spouští se ručně: npx tsx nastroje/zkouska-mluvcich.ts [id ukázky …]. Bez id vezme pět ukázek a dotaz na dvě věci.
// Výsledky jdou do složky dat mimo repozitář, na obrazovku jen souhrn a texty k přečtení.
import path from 'node:path';
import { vytvorCloudflareAi } from '../src/lib/ai/cloudflare';
import { KLICE_MLUVCICH } from '../src/lib/odpovedi/mluvci';
import { VERZE_PROMPTU_STYLU, podkladOdpovedi, prevypravet, type PodkladPrevypraveni } from '../src/lib/odpovedi/styl';
import { UKAZKOVA_TEMATA } from '../src/lib/temata/temata';
import { pripojitCloudflare } from './index/cloudflare';
import { SLOZKA_DAT } from './index/nastaveni';
import { ulozitJson } from './index/spolecne';

const VYCHOZI = ['ukazka-01', 'ukazka-03', 'ukazka-08', 'ukazka-10', 'ukazka-15'];
const vybrane = process.argv.slice(2).filter((a) => a.startsWith('ukazka-'));
const podklady: { id: string; podklad: PodkladPrevypraveni }[] = (vybrane.length ? vybrane : VYCHOZI).map((id) => {
  const tema = UKAZKOVA_TEMATA.find((t) => t.id === id);
  if (!tema?.odpoved) throw new Error(`Ukázka ${id} nemá odpověď.`);
  return { id, podklad: podkladOdpovedi(tema.text, tema.odpoved) };
});
// Dotaz na dvě věci (sada typových otázek, Q06): převyprávění dostane otázky částí.
if (!vybrane.length) {
  podklady.push({
    id: 'dve-casti',
    podklad: {
      dotaz: 'Jede teď vůbec vlak z Příšovic? A kde zastavuje ten náhradní autobus?',
      casti: [
        { otazka: 'Jede teď vůbec vlak z Příšovic?', vety: ['V Příšovicích je možné využít vlakové spojení ve směru na Turnov a Prahu.'] },
        { otazka: 'Kde zastavuje ten náhradní autobus?', vety: ['Náhradní autobusová doprava zastavuje na zastávce autobusů na sídlišti.'] },
      ],
    },
  });
}

const { env, ukoncit } = await pripojitCloudflare();
const radky: Record<string, unknown>[] = [];
try {
  const ai = vytvorCloudflareAi(env.AI);
  for (const { id, podklad } of podklady) {
    // Mluvčí jedné odpovědi běží souběžně, jako když si člověk na stránce proklikává tlačítka.
    const vysledky = await Promise.all(KLICE_MLUVCICH.map(async (mluvci) => {
      const zacatek = Date.now();
      // Texty, které kontrolou neprošly: z nich je vidět, proč mluvčí nezvládl.
      const zamitnute: { chyba: string; delka: number; text: string }[] = [];
      try {
        const vysledek = await prevypravet(ai, podklad, mluvci, (text, chyba) => {
          if (chyba) zamitnute.push({ chyba, delka: text.length, text });
        });
        return { ...vysledek, ms: Date.now() - zacatek, zamitnute };
      } catch (chyba) {
        return { vysledek: 'chyba', mluvci, ms: Date.now() - zacatek, chyba: chyba instanceof Error ? chyba.message : String(chyba), zamitnute };
      }
    }));
    console.log(`\n=== ${id}: ${podklad.casti.flatMap((c) => c.vety).join(' ')}`);
    for (const v of vysledky) {
      radky.push({ id, ...v });
      const stav = 'text' in v ? `pokus ${String(v.pokusu)}` : `${v.vysledek} ${'duvod' in v ? String(v.duvod) : String('chyba' in v ? v.chyba : '')}`;
      console.log(`\n--- ${v.mluvci} (${stav}, ${v.ms} ms)`);
      if ('text' in v) console.log(v.text);
      for (const z of v.zamitnute) console.log(`  [zamítnuto: ${z.chyba}, ${z.delka} znaků] ${z.text.slice(0, 300).replace(/\s+/g, ' ')}…`);
    }
  }
} finally {
  await ukoncit();
}

const spusteno = new Date().toISOString();
const soubor = path.join(SLOZKA_DAT, `mluvci-${spusteno.slice(0, 19).replace(/[:T]/g, '-')}.json`);
await ulozitJson(soubor, { spusteno, verzePromptu: VERZE_PROMPTU_STYLU, radky });
const prosly = radky.filter((r) => r.vysledek === 'prevypraveno');
const casy = prosly.map((r) => r.ms as number).sort((a, b) => a - b);
console.log(`\nProšlo kontrolou: ${prosly.length}/${radky.length}, na první pokus ${prosly.filter((r) => r.pokusu === 1).length}.`);
console.log(`Čas: medián ${casy[Math.floor(casy.length / 2)] ?? 0} ms, nejdéle ${casy.at(-1) ?? 0} ms.`);
for (const mluvci of KLICE_MLUVCICH) {
  const jeho = radky.filter((r) => r.mluvci === mluvci);
  console.log(`${mluvci}: ${jeho.filter((r) => r.vysledek === 'prevypraveno').length}/${jeho.length}`);
}
console.log(`Výsledky: ${soubor}`);
