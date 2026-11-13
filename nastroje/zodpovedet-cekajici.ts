// Čekající dotazy po obnově indexu (Tomáš 13. 11. 2026): vzkazy ve feedu a čekající ukázky znovu projdou stejným
// hledáním, odpovědí a ověřením jako na stránce. Kde index teď odpověď má, je to odpověď z webu se zdroji, ne odpověď úřadu.
//   npx tsx nastroje/zodpovedet-cekajici.ts   vypíše odpovědi, výsledek uloží do složky dat
// Nic nezapisuje. Čekající témata čte z tabulky tema ostré D1 (témata ve feedu, PR #4). Odpověď k tématu se zapíše
// jako platná část odpovědi z webu (řádek odpoved, puvod web) a téma dostane stav zodpovezeno-z-webu, viz docs/index-zdroju.md.
// Ukázky v src/lib/temata/ukazky.json se nemění samy, výstup slouží k ruční úpravě a kontrole.
// Jde přes přihlášení Wranglerem do ostré databáze, bez tokenu v souborech.
import fs from 'node:fs/promises';
import path from 'node:path';
import { vytvorCloudflareAi } from '../src/lib/ai/cloudflare';
import { odpovedetPoCastech } from '../src/lib/odpovedi/casti';
import { vytvorIndexCloudflare } from '../src/lib/odpovedi/cloudflare';
import type { VysledekOdpovedi } from '../src/lib/odpovedi/odpoved';
import type { OdpovedVzkazu } from '../src/lib/vzkazy/typy';
import { pripojitCloudflare } from './index/cloudflare';
import { SLOZKA_DAT } from './index/nastaveni';
import { ulozitJson } from './index/spolecne';

const ukazky = JSON.parse(await fs.readFile('src/lib/temata/ukazky.json', 'utf8')) as {
  temata: { id: string; nazev: string; text: string; typ: string; stav: string }[];
};

// Stejný převod jako u uloženého vzkazu na stránce (odpovedVzkazu v src/lib/odpovedi/zpracovani.ts).
function odpovedVzkazu(vysledek: VysledekOdpovedi): OdpovedVzkazu | null {
  if (vysledek.vysledek !== 'odpoved') return null;
  const { vety, casti, zdroje, oznaceni } = vysledek.odpoved;
  return { vety, ...(casti?.length ? { casti } : {}), zdroje, oznaceni };
}

const { env, ukoncit } = await pripojitCloudflare();
const vysledky: Record<string, unknown>[] = [];
try {
  const ai = vytvorCloudflareAi(env.AI);
  const index = vytvorIndexCloudflare(env.DB, env.VECTORIZE);
  const { results: temata } = await env.DB.prepare(`
    SELECT id, nazev, text FROM tema WHERE skryto = 0 AND ukazka = 0 AND typ = 'dotaz' AND stav = 'ceka-na-spravce' ORDER BY vytvoreno`)
    .all<{ id: string; nazev: string; text: string }>();
  const cekajici = [
    ...temata.map((t) => ({ druh: 'tema' as const, id: t.id, nazev: t.nazev, text: t.text })),
    ...ukazky.temata.filter((t) => t.typ === 'dotaz' && t.stav === 'ceka-na-spravce')
      .map((t) => ({ druh: 'ukazka' as const, id: t.id, nazev: t.nazev, text: t.text })),
  ];
  for (const dotaz of cekajici) {
    const zacatek = Date.now();
    let vysledek: VysledekOdpovedi;
    try {
      vysledek = await odpovedetPoCastech(dotaz.text, { ai, index });
    } catch (chyba) {
      console.log(`${dotaz.druh} ${dotaz.id}: chyba ${chyba instanceof Error ? chyba.message.slice(0, 200) : String(chyba)}`);
      continue;
    }
    const odpoved = odpovedVzkazu(vysledek);
    vysledky.push({ ...dotaz, vysledek: vysledek.vysledek, duvod: vysledek.vysledek === 'zastupitelum' ? vysledek.duvod : undefined, odpoved, ms: Date.now() - zacatek });
    console.log(`${dotaz.druh} ${dotaz.id} „${dotaz.nazev}“: ${vysledek.vysledek}${vysledek.vysledek === 'zastupitelum' ? ` (${vysledek.duvod})` : ''}`);
    for (const veta of odpoved?.vety ?? []) console.log(`   ${veta.text} [${veta.zdroj}]`);
    for (const zdroj of odpoved?.zdroje ?? []) console.log(`   [${zdroj.cislo}] ${zdroj.nazev} – ${zdroj.url}`);
  }
} finally {
  await ukoncit();
}
const soubor = path.join(SLOZKA_DAT, `cekajici-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`);
await ulozitJson(soubor, vysledky);
console.log(`Výsledky: ${soubor}`);
