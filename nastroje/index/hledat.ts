import { vytvorCloudflareAi } from '../../src/lib/ai/cloudflare';
import { vytvorIndexCloudflare } from '../../src/lib/odpovedi/cloudflare';
import { dotazProFulltext } from '../../src/lib/odpovedi/hledani';
import { pripojitCloudflare } from './cloudflare';
const { env, ukoncit } = await pripojitCloudflare();
try {
  const ai = vytvorCloudflareAi(env.AI);
  const index = vytvorIndexCloudflare(env.DB, env.VECTORIZE);
  for (const dotaz of process.argv.slice(2)) {
    const [v] = await ai.vektory([dotaz]);
    const vek = await index.hledatVektorem(v, 10);
    const fts = dotazProFulltext(dotaz);
    const slova = fts ? await index.hledatSlovy(fts, 10) : [];
    const nacist = async (s: { id: string; skore: number }[]) => (await index.nacistUseky(s.map((x) => x.id))).map((u) => `${s.find((x) => x.id === u.id)?.skore.toFixed(3)} ${u.dokument.url.slice(20, 95)}`);
    console.log('=====', dotaz, '\nFTS:', fts, '\nVEKTORY:\n ', (await nacist(vek)).join('\n  '), '\nSLOVA:\n ', (await nacist(slova)).join('\n  '));
  }
} finally { await ukoncit(); }
