// Ladění jednoho dotazu skutečnou cestou ucha: které úseky dostal model, co odpověděl a jak to dopadlo.
//   npx tsx nastroje/index/ladit.ts "dotaz" ["další dotaz" ...]
// Nic neukládá. Spotřebuje neurony jako jeden dotaz na ostré adrese.
import { vytvorCloudflareAi } from '../../src/lib/ai/cloudflare';
import { odpovedetPoCastech } from '../../src/lib/odpovedi/casti';
import { vytvorIndexCloudflare } from '../../src/lib/odpovedi/cloudflare';
import { pripojitCloudflare } from './cloudflare';

const { env, ukoncit } = await pripojitCloudflare();
try {
  const zakladni = vytvorCloudflareAi(env.AI);
  const index = vytvorIndexCloudflare(env.DB, env.VECTORIZE);
  for (const dotaz of process.argv.slice(2)) {
    console.log(`\n===== ${dotaz}`);
    const vystupy: string[] = [];
    const zacatek = Date.now();
    const ai: typeof zakladni = { ...zakladni, async generovat(zpravy, moznosti) { const v = await zakladni.generovat(zpravy, moznosti); vystupy.push(v); return v; } };
    let casti: string[] = [];
    const vysledek = await odpovedetPoCastech(dotaz, {
      ai,
      index,
      naHledani: (useky, nejlepsi) => {
        console.log(`-- hledání (nejlepší podobnost ${nejlepsi.toFixed(3)}), úseky pro model:`);
        useky.forEach((u, i) => console.log(`   ${i + 1}. ${u.dokument.nazev.slice(0, 70)} | str. ${u.strana ?? '-'} | ${u.text.replace(/\s+/g, ' ').slice(0, 110)}`));
      },
    }, (u) => { if (u.udalost === 'casti') casti = u.casti; });
    console.log('-- části:', casti);
    vystupy.forEach((v, i) => console.log(`-- výstup modelu ${i + 1}: ${v.replace(/\s+/g, ' ').slice(0, 1400)}`));
    console.log(`-- čas ${((Date.now() - zacatek) / 1000).toFixed(1)} s, volání modelu ${vystupy.length}`);
    console.log('-- výsledek:', vysledek.vysledek, vysledek.vysledek === 'zastupitelum' ? vysledek.duvod : vysledek.odpoved.vety.map((v) => v.text).join(' '));
  }
} finally {
  await ukoncit();
}
