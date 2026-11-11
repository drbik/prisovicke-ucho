import { bezDiakritiky } from './hledani';
import type { IndexZdroju } from './rozhrani';
import type { NalezenyUsek } from './typy';

// Index v paměti pro testy a lokální vývoj bez Cloudflare. Podobnost vektorů zadá test, fulltext hledá podle začátků slov.
export function vytvorFalesnyIndex(useky: NalezenyUsek[] = [], podobnost: (usek: NalezenyUsek) => number = () => 0.8): IndexZdroju & { dotazy: string[] } {
  const dotazy: string[] = [];
  return {
    dotazy,
    async hledatVektorem(_vektor, pocet) {
      return useky.map((u) => ({ id: u.id, skore: podobnost(u) })).sort((a, b) => b.skore - a.skore).slice(0, pocet);
    },
    async hledatSlovy(dotazFts, pocet) {
      dotazy.push(dotazFts);
      const vyrazy = [...dotazFts.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
      return useky
        .map((u) => {
          const slova = bezDiakritiky(`${u.hlavicka} ${u.text}`).split(/[^\p{L}\p{N}]+/u);
          return { id: u.id, skore: -vyrazy.filter((v) => slova.some((s) => s.startsWith(v))).length };
        })
        .filter((s) => s.skore < 0)
        .sort((a, b) => a.skore - b.skore)
        .slice(0, pocet);
    },
    async nacistUseky(id) {
      return useky.filter((u) => id.includes(u.id));
    },
  };
}
