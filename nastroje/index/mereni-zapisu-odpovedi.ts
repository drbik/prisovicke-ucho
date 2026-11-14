// Celá cesta ucha nad dotazy ze zápisů rady (14. 11. 2026): hledání, odpověď a ověření. Vypíše výsledek a první větu odpovědi.
//   npx tsx nastroje/index/mereni-zapisu-odpovedi.ts [Z01 Z05 ...]
import fs from 'node:fs/promises';
import { vytvorCloudflareAi } from '../../src/lib/ai/cloudflare';
import { odpovedetPoCastech } from '../../src/lib/odpovedi/casti';
import { vytvorIndexCloudflare } from '../../src/lib/odpovedi/cloudflare';
import { pripojitCloudflare } from './cloudflare';

const sada = JSON.parse(await fs.readFile('tests/data/dotazy-zapisy.json', 'utf8')) as { dotazy: { id: string; text: string }[] };
const vybrane = process.argv.slice(2);
const { env, ukoncit } = await pripojitCloudflare();
let odpovezeno = 0;
let celkem = 0;
try {
  const ai = vytvorCloudflareAi(env.AI);
  const index = vytvorIndexCloudflare(env.DB, env.VECTORIZE);
  for (const d of sada.dotazy.filter((x) => !vybrane.length || vybrane.includes(x.id))) {
    celkem += 1;
    const zacatek = Date.now();
    const v = await odpovedetPoCastech(d.text, { ai, index });
    if (v.vysledek === 'odpoved') odpovezeno += 1;
    const text = v.vysledek === 'odpoved' ? v.odpoved.vety.map((x) => x.text).join(' ') : `(${v.duvod})`;
    console.log(`${d.id} ${v.vysledek === 'odpoved' ? 'ODPOVĚĎ' : 'zastupitelům'} ${((Date.now() - zacatek) / 1000).toFixed(1)} s | ${text.slice(0, 900)}`);
  }
} finally {
  await ukoncit();
}
console.log(`\nOdpověď dostalo ${odpovezeno} z ${celkem}.`);
