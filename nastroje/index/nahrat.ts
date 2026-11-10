// Krok 8.5: embeddingy úseků a nahrání indexu do D1 a Vectorize (npm run index:nahrat).
// Vektory se ukládají i do složky dat, takže opakované nahrání znovu platí jen za změněné úseky.
import { createHash } from 'node:crypto';
import path from 'node:path';
import { MODEL_VEKTORU, vytvorCloudflareAi } from '../../src/lib/ai/cloudflare';
import { vytvorIndexCloudflare } from '../../src/lib/odpovedi/cloudflare';
import type { Usek, ZdrojovyDokument } from '../../src/lib/odpovedi/typy';
import { pripojitCloudflare } from './cloudflare';
import { SLOZKA_DAT } from './nastaveni';
import { nacistJson, ulozitJson } from './spolecne';

const DAVKA_EMBEDDINGU = 50;

const dokumenty = await nacistJson<ZdrojovyDokument[]>(path.join(SLOZKA_DAT, 'dokumenty.json'), []);
const useky = await nacistJson<Usek[]>(path.join(SLOZKA_DAT, 'useky.json'), []);
if (!useky.length) throw new Error(`V ${SLOZKA_DAT} chybí useky.json. Nejdřív spusťte npm run index:zpracovat.`);

// Text pro embedding je hlavička a text úseku, stejně jako vidí úsek model odpovědi.
const vstup = (u: Usek) => `${u.hlavicka}\n${u.text}`;
const klic = (u: Usek) => createHash('sha256').update(`${MODEL_VEKTORU}\n${vstup(u)}`).digest('hex');

const souborVektoru = path.join(SLOZKA_DAT, 'vektory.json');
const ulozene = await nacistJson<Record<string, string>>(souborVektoru, {});
const naVektor = (b64: string) => {
  const bajty = Buffer.from(b64, 'base64');
  return Array.from(new Float32Array(bajty.buffer.slice(bajty.byteOffset, bajty.byteOffset + bajty.byteLength)));
};
const naBase64 = (vektor: number[]) => Buffer.from(new Float32Array(vektor).buffer).toString('base64');

const { env, ukoncit } = await pripojitCloudflare();
try {
  const ai = vytvorCloudflareAi(env.AI);
  const chybi = useky.filter((u) => !ulozene[klic(u)]);
  console.log(`Úseků ${useky.length}, embeddingů k výpočtu ${chybi.length}.`);
  for (let i = 0; i < chybi.length; i += DAVKA_EMBEDDINGU) {
    const davka = chybi.slice(i, i + DAVKA_EMBEDDINGU);
    const vektory = await ai.vektory(davka.map(vstup));
    davka.forEach((u, j) => { ulozene[klic(u)] = naBase64(vektory[j]); });
    if ((i / DAVKA_EMBEDDINGU) % 10 === 9) {
      await ulozitJson(souborVektoru, ulozene);
      console.log(`  embeddingy ${Math.min(i + DAVKA_EMBEDDINGU, chybi.length)}/${chybi.length}`);
    }
  }
  await ulozitJson(souborVektoru, ulozene);

  const index = vytvorIndexCloudflare(env.DB, env.VECTORIZE);
  // Vektory úseků, které po přeindexování zmizely, se z Vectorize smažou.
  const { results: stare } = await env.DB.prepare('SELECT id FROM usek').all<{ id: string }>();
  const nove = new Set(useky.map((u) => u.id));
  const smazat = stare.map((r) => r.id).filter((id) => !nove.has(id));
  for (let i = 0; i < smazat.length; i += 500) await env.VECTORIZE.deleteByIds(smazat.slice(i, i + 500));

  await index.smazatVse();
  await index.nahratDokumenty(dokumenty);
  console.log(`D1: ${dokumenty.length} dokumentů nahráno.`);
  await index.nahratUseky(useky);
  console.log(`D1: ${useky.length} úseků nahráno.`);
  await index.nahratVektory(useky.map((u) => ({ id: u.id, hodnoty: naVektor(ulozene[klic(u)]) })));
  console.log(`Vectorize: ${useky.length} vektorů nahráno, ${smazat.length} smazáno.`);

  const pocty = await index.spocitat();
  console.log(`Kontrola: D1 ${pocty.dokumentu} dokumentů a ${pocty.useku} úseků, Vectorize ${pocty.vektoru ?? 'neznámo'} vektorů (počet se ve Vectorize aktualizuje se zpožděním).`);
  await ulozitJson(path.join(SLOZKA_DAT, 'nahrani.json'), { nahrano: new Date().toISOString(), ...pocty, ocekavano: { dokumentu: dokumenty.length, useku: useky.length } });
} finally {
  await ukoncit();
}
