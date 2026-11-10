import type { IndexZdroju, ZapisIndexu } from './rozhrani';
import type { NalezenyUsek, TypDokumentu, Usek, WebZdroje, ZdrojovyDokument } from './typy';

// Vlastní minimální popis vazeb D1 a Vectorize. Typy Workers by se tloukly s typy prohlížeče (src/env.d.ts).
export interface PrikazD1 {
  bind(...hodnoty: unknown[]): PrikazD1;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface VazbaD1 {
  prepare(sql: string): PrikazD1;
  batch(prikazy: PrikazD1[]): Promise<unknown[]>;
}

export interface VazbaVectorize {
  query(vektor: number[], moznosti: { topK: number; returnValues?: boolean; returnMetadata?: 'none' }): Promise<{ matches: { id: string; score: number }[] }>;
  upsert(vektory: { id: string; values: number[] }[]): Promise<unknown>;
  deleteByIds(id: string[]): Promise<unknown>;
  describe(): Promise<{ vectorCount?: number; vectorsCount?: number }>;
}

interface RadekUseku {
  id: string;
  dokument_id: string;
  poradi: number;
  strana: number | null;
  hlavicka: string;
  text: string;
  url: string;
  nazev: string;
  web: WebZdroje;
  typ: TypDokumentu;
  zverejneno: string | null;
  zmeneno: string | null;
  mesic_nahrani: string | null;
  otisk: string;
  stazeno: string;
  nadrazeny_url: string | null;
}

// D1 má limit na počet vázaných hodnot v jednom příkazu, proto po dávkách.
const DAVKA_D1 = 50;
const DAVKA_VEKTORU = 200;

function poDavkach<T>(polozky: T[], velikost: number) {
  const davky: T[][] = [];
  for (let i = 0; i < polozky.length; i += velikost) davky.push(polozky.slice(i, i + velikost));
  return davky;
}

export function vytvorIndexCloudflare(db: VazbaD1, vektory: VazbaVectorize): IndexZdroju & ZapisIndexu {
  return {
    async hledatVektorem(vektor, pocet) {
      const { matches } = await vektory.query(vektor, { topK: pocet, returnValues: false, returnMetadata: 'none' });
      return matches.map((m) => ({ id: m.id, skore: m.score }));
    },

    async hledatSlovy(dotazFts, pocet) {
      const { results } = await db
        .prepare(`SELECT u.id AS id, bm25(usek_fts, 2.0, 1.0) AS skore
          FROM usek_fts JOIN usek u ON u.cislo = usek_fts.rowid
          WHERE usek_fts MATCH ?1 ORDER BY skore LIMIT ?2`)
        .bind(dotazFts, pocet)
        .all<{ id: string; skore: number }>();
      return results;
    },

    async nacistUseky(id) {
      if (!id.length) return [];
      const { results } = await db
        .prepare(`SELECT u.id, u.dokument_id, u.poradi, u.strana, u.hlavicka, u.text,
            d.url, d.nazev, d.web, d.typ, d.zverejneno, d.zmeneno, d.mesic_nahrani, d.otisk, d.stazeno, d.nadrazeny_url
          FROM usek u JOIN zdrojovy_dokument d ON d.id = u.dokument_id
          WHERE u.id IN (${id.map((_, i) => `?${i + 1}`).join(', ')})`)
        .bind(...id)
        .all<RadekUseku>();
      return results.map((r): NalezenyUsek => ({
        id: r.id,
        dokumentId: r.dokument_id,
        poradi: r.poradi,
        strana: r.strana,
        hlavicka: r.hlavicka,
        text: r.text,
        dokument: {
          id: r.dokument_id,
          url: r.url,
          nazev: r.nazev,
          web: r.web,
          typ: r.typ,
          zverejneno: r.zverejneno,
          zmeneno: r.zmeneno,
          mesicNahrani: r.mesic_nahrani,
          otisk: r.otisk,
          stazeno: r.stazeno,
          nadrazenyUrl: r.nadrazeny_url,
        },
      }));
    },

    async smazatVse() {
      // Citace je zatím prázdná (F-77), jinak by mazání dokumentů zastavila vazba na ně.
      await db.batch([db.prepare('DELETE FROM usek'), db.prepare('DELETE FROM zdrojovy_dokument')]);
    },

    async nahratDokumenty(dokumenty: ZdrojovyDokument[]) {
      for (const davka of poDavkach(dokumenty, DAVKA_D1)) {
        await db.batch(davka.map((d) => db
          .prepare(`INSERT INTO zdrojovy_dokument (id, url, nazev, web, typ, zverejneno, zmeneno, mesic_nahrani, otisk, stazeno, nadrazeny_url)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`)
          .bind(d.id, d.url, d.nazev, d.web, d.typ, d.zverejneno, d.zmeneno, d.mesicNahrani, d.otisk, d.stazeno, d.nadrazenyUrl)));
      }
    },

    async nahratUseky(useky: Usek[]) {
      for (const davka of poDavkach(useky, DAVKA_D1)) {
        await db.batch(davka.map((u) => db
          .prepare('INSERT INTO usek (id, dokument_id, poradi, strana, hlavicka, text) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
          .bind(u.id, u.dokumentId, u.poradi, u.strana, u.hlavicka, u.text)));
      }
    },

    async nahratVektory(seznam) {
      for (const davka of poDavkach(seznam, DAVKA_VEKTORU)) {
        await vektory.upsert(davka.map((v) => ({ id: v.id, values: v.hodnoty })));
      }
    },

    async spocitat() {
      const [dokumentu, useku] = await db.batch([
        db.prepare('SELECT count(*) AS pocet FROM zdrojovy_dokument'),
        db.prepare('SELECT count(*) AS pocet FROM usek'),
      ]) as { results: { pocet: number }[] }[];
      const popis = await vektory.describe().catch(() => null);
      return {
        dokumentu: dokumentu.results[0].pocet,
        useku: useku.results[0].pocet,
        vektoru: popis?.vectorCount ?? popis?.vectorsCount ?? null,
      };
    },
  };
}
