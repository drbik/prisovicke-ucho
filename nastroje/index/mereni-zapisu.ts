// Měření hledání nad zápisy rady (14. 11. 2026): kolik dotazů z tests/data/dotazy-zapisy.json má správné usnesení
// mezi úseky, které jdou do modelu. Porovná nastavení hledání. Odpovědi nevolá, počítá se jen hledání a přeřazení.
//   npx tsx nastroje/index/mereni-zapisu.ts
import fs from 'node:fs/promises';
import { vytvorCloudflareAi } from '../../src/lib/ai/cloudflare';
import { vytvorIndexCloudflare } from '../../src/lib/odpovedi/cloudflare';
import { hledatUseky } from '../../src/lib/odpovedi/hledani';
import { pripojitCloudflare } from './cloudflare';

const sada = JSON.parse(await fs.readFile('tests/data/dotazy-zapisy.json', 'utf8')) as { dotazy: { id: string; text: string; opora: string[] }[] };
const nastaveni = [
  { nazev: 'dosud: 6 úseků, 20 kandidátů', pocet: 6, kandidatu: 20 },
  { nazev: '6 úseků, 40 kandidátů', pocet: 6, kandidatu: 40 },
  { nazev: '8 úseků, 40 kandidátů', pocet: 8, kandidatu: 40 },
  { nazev: '10 úseků, 50 kandidátů', pocet: 10, kandidatu: 50 },
];
const { env, ukoncit } = await pripojitCloudflare();
try {
  const ai = vytvorCloudflareAi(env.AI);
  const index = vytvorIndexCloudflare(env.DB, env.VECTORIZE);
  const preradit = ai.preradit ? (t: string, texty: string[]) => ai.preradit!(t, texty) : undefined;
  const hity: Record<string, string[]> = Object.fromEntries(nastaveni.map((n) => [n.nazev, []]));
  for (const d of sada.dotazy) {
    const [vektor] = await ai.vektory([d.text]);
    const radek: string[] = [];
    for (const n of nastaveni) {
      const h = await hledatUseky(index, vektor, d.text, n.pocet, preradit, n.kandidatu);
      const poradi = h.useky.findIndex((u) => d.opora.some((o) => u.text.includes(o))) + 1;
      if (poradi) hity[n.nazev].push(d.id);
      radek.push(poradi ? `#${poradi}` : '--');
    }
    console.log(`${d.id} ${radek.join('  ')}  ${d.text.slice(0, 70)}`);
  }
  console.log('\nSprávné usnesení mezi úseky pro model:');
  for (const n of nastaveni) console.log(`  ${n.nazev}: ${hity[n.nazev].length}/${sada.dotazy.length}`);
} finally {
  await ukoncit();
}
