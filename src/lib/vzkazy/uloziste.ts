// Úložiště vzkazů v D1 a v paměti. Paměť používá lokální vývoj, aby zkušební vzkazy nešly do ostrého feedu.
import { jeOblast, jeTyp } from '../oblasti';
import { jeStyl } from '../odpovedi/mluvci';
import type { VazbaD1 } from '../odpovedi/cloudflare';
import type { KandidatPodobnosti, NovyVzkaz, OdpovedVzkazu, PolozkaFeedu, StavVzkazu, UlozisteVzkazu } from './typy';

const STAV_DB: Record<StavVzkazu, string> = { zodpovezeno: 'zodpovezeno-z-webu', ceka: 'ceka' };

function noveId() {
  const bajty = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bajty, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 10);
}

export function naBajty(vektor: number[]) {
  return new Uint8Array(new Float32Array(vektor).buffer);
}

export function zBajtu(data: unknown): Float32Array | null {
  if (data instanceof ArrayBuffer) return new Float32Array(data.slice(0));
  if (ArrayBuffer.isView(data)) return new Float32Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  // D1 vrací BLOB i jako pole čísel.
  if (Array.isArray(data)) return new Float32Array(new Uint8Array(data).buffer);
  return null;
}

interface RadekVzkazu {
  id: string;
  vytvoreno: string;
  text: string;
  nazev: string;
  typ: string;
  oblast: string;
  styl: string;
  text_stylu: string | null;
  stav: string;
  odpoved: string | null;
  podobny_id: string | null;
  podobny_nazev: string | null;
}

function naPolozku(r: RadekVzkazu): PolozkaFeedu | null {
  if (!jeTyp(r.typ) || !jeOblast(r.oblast)) return null;
  let odpoved: OdpovedVzkazu | undefined;
  try {
    odpoved = r.odpoved ? JSON.parse(r.odpoved) as OdpovedVzkazu : undefined;
  } catch {
    odpoved = undefined;
  }
  const stav: StavVzkazu = r.stav === 'zodpovezeno-z-webu' && odpoved ? 'zodpovezeno' : 'ceka';
  return {
    id: `v-${r.id}`,
    ukazka: false,
    nazev: r.nazev,
    text: r.text,
    typ: r.typ,
    oblast: r.oblast,
    stav,
    datum: r.vytvoreno.slice(0, 10),
    styl: jeStyl(r.styl) ? r.styl : 'spisovne',
    ...(r.text_stylu ? { textStylu: r.text_stylu } : {}),
    ...(stav === 'zodpovezeno' && odpoved ? { odpoved } : {}),
    ...(r.podobny_id && r.podobny_nazev ? { podobny: { id: r.podobny_id, nazev: r.podobny_nazev } } : {}),
  };
}

export function vytvorUlozisteD1(db: VazbaD1, nazvyUkazek: Map<string, string> = new Map()): UlozisteVzkazu {
  return {
    async ulozit(v, ted) {
      const cas = ted.toISOString();
      // Stejný klíč návrhu přepíše řádek: autor se vrátil k úpravám nebo hledá znovu. Odpověď se pak zapíše znovu.
      const { results } = await db.prepare(`
        INSERT INTO vzkaz (id, klic_navrhu, vytvoreno, zmeneno, vstup, surovy_text, navrh_text, text, nazev, typ, oblast, styl, text_stylu, stav, odpoved, podobny_id, vektor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ceka', NULL, ?, ?)
        ON CONFLICT (klic_navrhu) DO UPDATE SET
          zmeneno = excluded.zmeneno, text = excluded.text, nazev = excluded.nazev, typ = excluded.typ, oblast = excluded.oblast,
          styl = excluded.styl, text_stylu = excluded.text_stylu, stav = 'ceka', odpoved = NULL,
          podobny_id = excluded.podobny_id, vektor = excluded.vektor
        RETURNING id, vytvoreno`)
        .bind(noveId(), v.klicNavrhu, cas, cas, v.vstup, v.surovyText, v.navrhText, v.text, v.nazev, v.typ, v.oblast, v.styl,
          v.textStylu, v.podobnyId, v.vektor ? naBajty(v.vektor) : null)
        .all<{ id: string; vytvoreno: string }>();
      return results[0];
    },

    async zapsatVysledek(id, stav, odpoved, podobnyId, ted) {
      await db.prepare('UPDATE vzkaz SET stav = ?, odpoved = ?, podobny_id = ?, zmeneno = ? WHERE id = ?')
        .bind(STAV_DB[stav], odpoved ? JSON.stringify(odpoved) : null, podobnyId, ted.toISOString(), id)
        .run();
    },

    async feed(pocet) {
      const { results } = await db.prepare(`
        SELECT v.id, v.vytvoreno, v.text, v.nazev, v.typ, v.oblast, v.styl, v.text_stylu, v.stav, v.odpoved, v.podobny_id,
          p.nazev AS podobny_nazev
        FROM vzkaz v LEFT JOIN vzkaz p ON 'v-' || p.id = v.podobny_id AND p.skryto = 0
        WHERE v.skryto = 0 ORDER BY v.vytvoreno DESC LIMIT ?`)
        .bind(pocet)
        .all<RadekVzkazu>();
      return results.map((r) => naPolozku({ ...r, podobny_nazev: r.podobny_nazev ?? (r.podobny_id ? nazvyUkazek.get(r.podobny_id) ?? null : null) }))
        .filter((p): p is PolozkaFeedu => p !== null);
    },

    async zodpovezene() {
      const { results } = await db.prepare(`
        SELECT id, nazev, vektor FROM vzkaz
        WHERE skryto = 0 AND typ = 'dotaz' AND stav = 'zodpovezeno-z-webu' AND vektor IS NOT NULL
        ORDER BY vytvoreno DESC LIMIT 500`)
        .all<{ id: string; nazev: string; vektor: unknown }>();
      return results.flatMap((r): KandidatPodobnosti[] => {
        const vektor = zBajtu(r.vektor);
        return vektor ? [{ id: `v-${r.id}`, nazev: r.nazev, vektor }] : [];
      });
    },

    async vektoryUkazek() {
      const { results } = await db.prepare('SELECT id, otisk, vektor FROM vektor_ukazky').all<{ id: string; otisk: string; vektor: unknown }>();
      const mapa = new Map<string, { otisk: string; vektor: Float32Array }>();
      for (const r of results) {
        const vektor = zBajtu(r.vektor);
        if (vektor) mapa.set(r.id, { otisk: r.otisk, vektor });
      }
      return mapa;
    },

    async ulozitVektorUkazky(id, otisk, vektor) {
      await db.prepare('INSERT INTO vektor_ukazky (id, otisk, vektor) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET otisk = excluded.otisk, vektor = excluded.vektor')
        .bind(id, otisk, naBajty(vektor))
        .run();
    },

    async skryt(id, skryto) {
      const { results } = await db.prepare('UPDATE vzkaz SET skryto = ? WHERE id = ? RETURNING id').bind(skryto ? 1 : 0, id.replace(/^v-/, '')).all();
      return results.length > 0;
    },
  };
}

interface UlozenyVPameti extends NovyVzkaz {
  id: string;
  vytvoreno: string;
  stav: StavVzkazu;
  odpoved: OdpovedVzkazu | null;
  skryto: boolean;
}

// Lokální vývoj a testy. Vzkazy zmizí s restartem serveru.
export function vytvorPametoveUloziste(nazvyUkazek: Map<string, string> = new Map()): UlozisteVzkazu & { vzkazy: UlozenyVPameti[] } {
  const vzkazy: UlozenyVPameti[] = [];
  const ukazky = new Map<string, { otisk: string; vektor: Float32Array }>();
  return {
    vzkazy,
    async ulozit(v, ted) {
      const stary = vzkazy.find((u) => u.klicNavrhu === v.klicNavrhu);
      if (stary) {
        Object.assign(stary, v, { stav: 'ceka', odpoved: null });
        return { id: stary.id, vytvoreno: stary.vytvoreno };
      }
      const novy: UlozenyVPameti = { ...v, id: noveId(), vytvoreno: ted.toISOString(), stav: 'ceka', odpoved: null, skryto: false };
      vzkazy.push(novy);
      return { id: novy.id, vytvoreno: novy.vytvoreno };
    },
    async zapsatVysledek(id, stav, odpoved, podobnyId) {
      const v = vzkazy.find((u) => u.id === id);
      if (v) Object.assign(v, { stav, odpoved, podobnyId });
    },
    async feed(pocet) {
      return [...vzkazy].filter((v) => !v.skryto).reverse().slice(0, pocet).flatMap((v) => {
        const podobny = v.podobnyId ? vzkazy.find((u) => `v-${u.id}` === v.podobnyId) : undefined;
        const polozka = naPolozku({
          id: v.id, vytvoreno: v.vytvoreno, text: v.text, nazev: v.nazev, typ: v.typ, oblast: v.oblast, styl: v.styl,
          text_stylu: v.textStylu, stav: STAV_DB[v.stav], odpoved: v.odpoved ? JSON.stringify(v.odpoved) : null,
          podobny_id: v.podobnyId, podobny_nazev: podobny?.nazev ?? (v.podobnyId ? nazvyUkazek.get(v.podobnyId) ?? null : null),
        });
        return polozka ? [polozka] : [];
      });
    },
    async zodpovezene() {
      return vzkazy.filter((v) => !v.skryto && v.typ === 'dotaz' && v.stav === 'zodpovezeno' && v.vektor)
        .map((v) => ({ id: `v-${v.id}`, nazev: v.nazev, vektor: new Float32Array(v.vektor!) }));
    },
    async vektoryUkazek() {
      return new Map(ukazky);
    },
    async ulozitVektorUkazky(id, otisk, vektor) {
      ukazky.set(id, { otisk, vektor: new Float32Array(vektor) });
    },
    async skryt(id, skryto) {
      const v = vzkazy.find((u) => u.id === id.replace(/^v-/, ''));
      if (v) v.skryto = skryto;
      return Boolean(v);
    },
  };
}
