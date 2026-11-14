// Úložiště vzkazů a témat v D1 a v paměti (F-33 až F-37). Paměť používá lokální vývoj, aby zkušební vzkazy nešly
// do ostrého feedu, a testy. Obě podoby dělají totéž, logika zařazení je nad nimi v temata.ts.
import { jeOblast, jeTyp, type SlugOblasti, type TypPodnetu } from '../oblasti';
import { jeStyl } from '../odpovedi/mluvci';
import type { VazbaD1 } from '../odpovedi/cloudflare';
import type {
  CastOdpovedi,
  NovyVzkaz,
  ObsahCasti,
  OdpovedVzkazu,
  RadekTematu,
  StavCasti,
  StavTematuDb,
  StavVzkazu,
  UlozeneTema,
  UlozisteVzkazu,
  VektorClena,
  VektorUkazky,
  VzkazBezTematu,
  VzkazVTematu,
  VztahVzkazu,
} from './typy';

const STAV_DB: Record<StavVzkazu, string> = { zodpovezeno: 'zodpovezeno-z-webu', ceka: 'ceka' };
// Nabídka čte vektory všech vzkazů v tématech jednoho typu. Do stovek vzkazů to stačí (rizika v docs/temata-feedu.md).
const MAX_VEKTORU = 2000;

export function noveId() {
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

function precistJson<T>(text: string | null): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// Řádky z D1 (názvy sloupců podle migrací 0002 a 0003).
interface RadekTematuDb {
  id: string;
  ukazka: number;
  vytvoreno: string;
  zmeneno: string;
  nazev: string;
  text: string;
  typ: string;
  oblast: string;
  stav: string;
  hlavni_id: string | null;
  skryto: number;
}

interface RadekVzkazuDb {
  id: string;
  tema_id: string | null;
  vytvoreno: string;
  text: string;
  nazev: string;
  typ: string;
  oblast: string;
  styl: string;
  text_stylu: string | null;
  vztah: string | null;
  skryto: number;
  stav?: string;
  odpoved?: string | null;
  vektor?: unknown;
  vektor_nazvu?: unknown;
}

interface RadekCastiDb {
  id: string;
  tema_id: string;
  vzkaz_id: string | null;
  vytvoreno: string;
  puvod: string;
  stav: string;
  duvod: string | null;
  nahrazena_id: string | null;
  otazka: string | null;
  obsah: string;
}

const SLOUPCE_VZKAZU = 'id, tema_id, vytvoreno, text, nazev, typ, oblast, styl, text_stylu, vztah, skryto';

function naTema(r: RadekTematuDb): RadekTematu | null {
  if (!jeTyp(r.typ) || !jeOblast(r.oblast)) return null;
  return {
    id: r.id,
    ukazka: Boolean(r.ukazka),
    vytvoreno: r.vytvoreno,
    zmeneno: r.zmeneno,
    nazev: r.nazev,
    text: r.text,
    typ: r.typ,
    oblast: r.oblast,
    stav: r.stav as StavTematuDb,
    hlavniId: r.hlavni_id,
    skryto: Boolean(r.skryto),
  };
}

function naVzkaz(r: RadekVzkazuDb): VzkazVTematu | null {
  if (!jeTyp(r.typ) || !r.tema_id || !r.vztah) return null;
  return {
    id: r.id,
    temaId: r.tema_id,
    vytvoreno: r.vytvoreno,
    text: r.text,
    nazev: r.nazev,
    typ: r.typ,
    styl: jeStyl(r.styl) ? r.styl : 'spisovne',
    textStylu: r.text_stylu,
    vztah: r.vztah as VztahVzkazu,
    skryto: Boolean(r.skryto),
  };
}

function naCast(r: RadekCastiDb): CastOdpovedi | null {
  const obsah = precistJson<ObsahCasti>(r.obsah);
  if (!obsah) return null;
  return {
    id: r.id,
    temaId: r.tema_id,
    vzkazId: r.vzkaz_id,
    vytvoreno: r.vytvoreno,
    puvod: r.puvod === 'ukazka' ? 'ukazka' : 'web',
    stav: r.stav as StavCasti,
    duvod: r.duvod,
    nahrazenaId: r.nahrazena_id,
    otazka: r.otazka,
    obsah,
  };
}

function seskupit(temata: RadekTematu[], vzkazy: VzkazVTematu[], casti: CastOdpovedi[]): UlozeneTema[] {
  return temata.map((tema) => ({
    tema,
    vzkazy: vzkazy.filter((v) => v.temaId === tema.id),
    casti: casti.filter((c) => c.temaId === tema.id),
  }));
}

const bezNull = <T>(pole: (T | null)[]) => pole.filter((x): x is T => x !== null);

function naBezTematu(r: RadekVzkazuDb): VzkazBezTematu | null {
  if (!jeTyp(r.typ) || !jeOblast(r.oblast)) return null;
  const odpoved = precistJson<OdpovedVzkazu>(r.odpoved ?? null);
  return {
    id: r.id,
    vytvoreno: r.vytvoreno,
    text: r.text,
    nazev: r.nazev,
    typ: r.typ,
    oblast: r.oblast,
    styl: jeStyl(r.styl) ? r.styl : 'spisovne',
    textStylu: r.text_stylu,
    skryto: Boolean(r.skryto),
    stav: r.stav === 'zodpovezeno-z-webu' && odpoved ? 'zodpovezeno' : 'ceka',
    odpoved,
    vektor: zBajtu(r.vektor),
    vektorNazvu: zBajtu(r.vektor_nazvu),
  };
}

export function vytvorUlozisteD1(db: VazbaD1): UlozisteVzkazu {
  const vysledky = async <T>(prikazy: ReturnType<VazbaD1['prepare']>[]) => (await db.batch(prikazy) as { results: T[] }[]).map((r) => r.results);

  return {
    async ulozitVzkaz(v, ted) {
      const cas = ted.toISOString();
      // Stejný klíč návrhu přepíše řádek: autor se vrátil k úpravám nebo hledá znovu. Zařazení zůstane, dokud ho
      // zpracování nepřepíše, a vrátí se jako předchozí.
      const { results } = await db.prepare(`
        INSERT INTO vzkaz (id, klic_navrhu, vytvoreno, zmeneno, vstup, surovy_text, navrh_text, text, nazev, typ, oblast, styl, text_stylu, stav, odpoved, vektor, vektor_nazvu)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ceka', NULL, ?, ?)
        ON CONFLICT (klic_navrhu) DO UPDATE SET
          zmeneno = excluded.zmeneno, text = excluded.text, nazev = excluded.nazev, typ = excluded.typ, oblast = excluded.oblast,
          styl = excluded.styl, text_stylu = excluded.text_stylu, stav = 'ceka', odpoved = NULL,
          vektor = excluded.vektor, vektor_nazvu = excluded.vektor_nazvu
        RETURNING id, vytvoreno, tema_id, vztah`)
        .bind(noveId(), v.klicNavrhu, cas, cas, v.vstup, v.surovyText, v.navrhText, v.text, v.nazev, v.typ, v.oblast, v.styl,
          v.textStylu, v.vektor ? naBajty(v.vektor) : null, v.vektorNazvu ? naBajty(v.vektorNazvu) : null)
        .all<{ id: string; vytvoreno: string; tema_id: string | null; vztah: VztahVzkazu | null }>();
      const r = results[0];
      return { id: r.id, vytvoreno: r.vytvoreno, predchozi: r.tema_id && r.vztah ? { temaId: r.tema_id, vztah: r.vztah } : null };
    },

    async zapsatVysledek(id, stav, odpoved, ted) {
      await db.prepare('UPDATE vzkaz SET stav = ?, odpoved = ?, zmeneno = ? WHERE id = ?')
        .bind(STAV_DB[stav], odpoved ? JSON.stringify(odpoved) : null, ted.toISOString(), id)
        .run();
    },

    async pripojit(id, temaId, vztah, ted) {
      const cas = ted.toISOString();
      const prikazy = [db.prepare('UPDATE vzkaz SET tema_id = ?, vztah = ?, zmeneno = ? WHERE id = ?').bind(temaId, vztah, cas, id)];
      if (temaId) prikazy.push(db.prepare('UPDATE tema SET zmeneno = ? WHERE id = ?').bind(cas, temaId));
      await db.batch(prikazy);
    },

    async zapsatPotvrzeni(klicNavrhu, potvrzeni) {
      const { results } = await db.prepare('UPDATE vzkaz SET potvrzeni = ? WHERE klic_navrhu = ? RETURNING id').bind(potvrzeni, klicNavrhu).all();
      return results.length > 0;
    },

    async skrytVzkaz(id, skryto) {
      const { results } = await db.prepare(`UPDATE vzkaz SET skryto = ? WHERE id = ? RETURNING ${SLOUPCE_VZKAZU}`)
        .bind(skryto ? 1 : 0, id).all<RadekVzkazuDb>();
      return results[0] ? naVzkaz(results[0]) : null;
    },

    async nacistVzkaz(id) {
      const { results } = await db.prepare(`SELECT ${SLOUPCE_VZKAZU} FROM vzkaz WHERE id = ?`).bind(id).all<RadekVzkazuDb>();
      return results[0] ? naVzkaz(results[0]) : null;
    },

    async zalozitTema(t) {
      const { results } = await db.prepare(`
        INSERT INTO tema (id, ukazka, vytvoreno, zmeneno, nazev, text, typ, oblast, stav, hlavni_id, skryto)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING RETURNING id`)
        .bind(t.id, t.ukazka ? 1 : 0, t.vytvoreno, t.zmeneno, t.nazev, t.text, t.typ, t.oblast, t.stav, t.hlavniId, t.skryto ? 1 : 0)
        .all();
      return results.length > 0;
    },

    async upravitTema(t) {
      await db.prepare('UPDATE tema SET zmeneno = ?, nazev = ?, text = ?, typ = ?, oblast = ?, stav = ?, hlavni_id = ?, skryto = ? WHERE id = ?')
        .bind(t.zmeneno, t.nazev, t.text, t.typ, t.oblast, t.stav, t.hlavniId, t.skryto ? 1 : 0, t.id)
        .run();
    },

    async nacistTema(id) {
      const [temata, vzkazy, casti] = await vysledky<unknown>([
        db.prepare('SELECT * FROM tema WHERE id = ?').bind(id),
        db.prepare(`SELECT ${SLOUPCE_VZKAZU} FROM vzkaz WHERE tema_id = ? ORDER BY vytvoreno`).bind(id),
        db.prepare('SELECT * FROM odpoved WHERE tema_id = ? ORDER BY vytvoreno').bind(id),
      ]);
      const tema = temata[0] ? naTema(temata[0] as RadekTematuDb) : null;
      if (!tema) return null;
      return { tema, vzkazy: bezNull((vzkazy as RadekVzkazuDb[]).map(naVzkaz)), casti: bezNull((casti as RadekCastiDb[]).map(naCast)) };
    },

    async temataFeedu(pocet) {
      const vyber = `SELECT id FROM tema WHERE skryto = 0 AND stav != 'sloucene' ORDER BY zmeneno DESC LIMIT ?`;
      const [temata, vzkazy, casti, ukazky] = await vysledky<unknown>([
        db.prepare(`SELECT * FROM tema WHERE skryto = 0 AND stav != 'sloucene' ORDER BY zmeneno DESC LIMIT ?`).bind(pocet),
        db.prepare(`SELECT ${SLOUPCE_VZKAZU} FROM vzkaz WHERE skryto = 0 AND tema_id IN (${vyber}) ORDER BY vytvoreno`).bind(pocet),
        db.prepare(`SELECT * FROM odpoved WHERE stav = 'platna' AND tema_id IN (${vyber}) ORDER BY vytvoreno`).bind(pocet),
        db.prepare('SELECT id FROM tema WHERE ukazka = 1'),
      ]);
      return {
        temata: seskupit(
          bezNull((temata as RadekTematuDb[]).map(naTema)),
          bezNull((vzkazy as RadekVzkazuDb[]).map(naVzkaz)),
          bezNull((casti as RadekCastiDb[]).map(naCast)),
        ),
        ukazkyVDb: (ukazky as { id: string }[]).map((r) => r.id),
      };
    },

    async vzkazPodleKlice(klicNavrhu) {
      const { results } = await db.prepare('SELECT id, tema_id FROM vzkaz WHERE klic_navrhu = ?').bind(klicNavrhu).all<{ id: string; tema_id: string | null }>();
      return results[0] ? { id: results[0].id, temaId: results[0].tema_id } : null;
    },

    async vektoryTemat(typ) {
      const [clenove, vyloucena] = await vysledky<unknown>([
        db.prepare(`
          SELECT v.tema_id, v.id, v.vektor, v.vektor_nazvu FROM vzkaz v JOIN tema t ON t.id = v.tema_id
          WHERE v.skryto = 0 AND t.skryto = 0 AND t.stav != 'sloucene' AND t.typ = ? AND v.vektor IS NOT NULL
          ORDER BY v.vytvoreno DESC LIMIT ?`).bind(typ, MAX_VEKTORU),
        db.prepare(`SELECT id FROM tema WHERE skryto = 1 OR stav = 'sloucene'`),
      ]);
      return {
        clenove: (clenove as { tema_id: string; id: string; vektor: unknown; vektor_nazvu: unknown }[]).flatMap((r): VektorClena[] => {
          const vektor = zBajtu(r.vektor);
          return vektor ? [{ temaId: r.tema_id, vzkazId: r.id, vektor, vektorNazvu: zBajtu(r.vektor_nazvu) }] : [];
        }),
        vyloucena: (vyloucena as { id: string }[]).map((r) => r.id),
      };
    },

    async ulozitCast(c) {
      await db.prepare(`
        INSERT INTO odpoved (id, tema_id, vzkaz_id, vytvoreno, puvod, stav, duvod, nahrazena_id, otazka, obsah)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(c.id, c.temaId, c.vzkazId, c.vytvoreno, c.puvod, c.stav, c.duvod, c.nahrazenaId, c.otazka, JSON.stringify(c.obsah))
        .run();
    },

    async zmenitCast(id, stav, duvod, nahrazenaId = null) {
      await db.prepare('UPDATE odpoved SET stav = ?, duvod = ?, nahrazena_id = ? WHERE id = ?').bind(stav, duvod, nahrazenaId, id).run();
    },

    async vektoryUkazek() {
      const { results } = await db.prepare('SELECT id, otisk, vektor, vektor_nazvu FROM vektor_ukazky')
        .all<{ id: string; otisk: string; vektor: unknown; vektor_nazvu: unknown }>();
      const mapa = new Map<string, VektorUkazky>();
      for (const r of results) {
        const vektor = zBajtu(r.vektor);
        if (vektor) mapa.set(r.id, { otisk: r.otisk, vektor, vektorNazvu: zBajtu(r.vektor_nazvu) });
      }
      return mapa;
    },

    async ulozitVektorUkazky(id, otisk, vektor, vektorNazvu) {
      await db.prepare(`
        INSERT INTO vektor_ukazky (id, otisk, vektor, vektor_nazvu) VALUES (?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET otisk = excluded.otisk, vektor = excluded.vektor, vektor_nazvu = excluded.vektor_nazvu`)
        .bind(id, otisk, naBajty(vektor), naBajty(vektorNazvu))
        .run();
    },

    async vzkazyBezTematu() {
      const { results } = await db.prepare(`
        SELECT id, tema_id, vytvoreno, text, nazev, typ, oblast, styl, text_stylu, vztah, skryto, stav, odpoved, vektor, vektor_nazvu
        FROM vzkaz WHERE tema_id IS NULL ORDER BY vytvoreno`).all<RadekVzkazuDb>();
      return bezNull(results.map(naBezTematu));
    },

    async doplnitVektory(id, vektor, vektorNazvu) {
      await db.prepare('UPDATE vzkaz SET vektor = ?, vektor_nazvu = ? WHERE id = ?').bind(naBajty(vektor), naBajty(vektorNazvu), id).run();
    },

    async seznamTemat() {
      const { results } = await db.prepare(`
        SELECT t.*, (SELECT count(*) FROM vzkaz v WHERE v.tema_id = t.id AND v.skryto = 0) AS pocet
        FROM tema t ORDER BY t.zmeneno DESC`).all<RadekTematuDb & { pocet: number }>();
      return results.flatMap((r) => {
        const tema = naTema(r);
        return tema ? [{ ...tema, pocet: r.pocet }] : [];
      });
    },
  };
}

interface UlozenyVPameti extends NovyVzkaz {
  id: string;
  vytvoreno: string;
  stav: StavVzkazu;
  odpoved: OdpovedVzkazu | null;
  skryto: boolean;
  temaId: string | null;
  vztah: VztahVzkazu | null;
  potvrzeni: 'staci' | 'doptani' | null;
}

function vzkazZPameti(v: UlozenyVPameti): VzkazVTematu | null {
  if (!v.temaId || !v.vztah) return null;
  return { id: v.id, temaId: v.temaId, vytvoreno: v.vytvoreno, text: v.text, nazev: v.nazev, typ: v.typ, styl: v.styl, textStylu: v.textStylu, vztah: v.vztah, skryto: v.skryto };
}

const kopie = <T>(hodnota: T): T => structuredClone(hodnota);
const viditelne = (t: RadekTematu) => !t.skryto && t.stav !== 'sloucene';
const podleZmeny = (a: RadekTematu, b: RadekTematu) => b.zmeneno.localeCompare(a.zmeneno) || b.vytvoreno.localeCompare(a.vytvoreno);

// Lokální vývoj a testy. Vzkazy a témata zmizí s restartem serveru.
export function vytvorPametoveUloziste(): UlozisteVzkazu & { vzkazy: UlozenyVPameti[]; temata: RadekTematu[]; casti: CastOdpovedi[] } {
  const vzkazy: UlozenyVPameti[] = [];
  const temata: RadekTematu[] = [];
  const casti: CastOdpovedi[] = [];
  const ukazky = new Map<string, VektorUkazky>();
  const vVzkazech = (id: string) => vzkazy.find((u) => u.id === id);
  const sTematem = (tema: RadekTematu, jenViditelne: boolean): UlozeneTema => ({
    tema: kopie(tema),
    vzkazy: bezNull(vzkazy.filter((v) => v.temaId === tema.id && (!jenViditelne || !v.skryto))
      .sort((a, b) => a.vytvoreno.localeCompare(b.vytvoreno)).map(vzkazZPameti)),
    casti: kopie(casti.filter((c) => c.temaId === tema.id && (!jenViditelne || c.stav === 'platna'))),
  });
  return {
    vzkazy,
    temata,
    casti,
    async ulozitVzkaz(v, ted) {
      const stary = vzkazy.find((u) => u.klicNavrhu === v.klicNavrhu);
      if (stary) {
        const predchozi = stary.temaId && stary.vztah ? { temaId: stary.temaId, vztah: stary.vztah } : null;
        Object.assign(stary, v, { stav: 'ceka', odpoved: null });
        return { id: stary.id, vytvoreno: stary.vytvoreno, predchozi };
      }
      const novy: UlozenyVPameti = { ...v, id: noveId(), vytvoreno: ted.toISOString(), stav: 'ceka', odpoved: null, skryto: false, temaId: null, vztah: null, potvrzeni: null };
      vzkazy.push(novy);
      return { id: novy.id, vytvoreno: novy.vytvoreno, predchozi: null };
    },
    async zapsatVysledek(id, stav, odpoved) {
      const v = vVzkazech(id);
      if (v) Object.assign(v, { stav, odpoved: kopie(odpoved) });
    },
    async pripojit(id, temaId, vztah, ted) {
      const v = vVzkazech(id);
      if (v) Object.assign(v, { temaId, vztah });
      const tema = temata.find((t) => t.id === temaId);
      if (tema) tema.zmeneno = ted.toISOString();
    },
    async zapsatPotvrzeni(klicNavrhu, potvrzeni) {
      const v = vzkazy.find((u) => u.klicNavrhu === klicNavrhu);
      if (v) v.potvrzeni = potvrzeni;
      return Boolean(v);
    },
    async skrytVzkaz(id, skryto) {
      const v = vVzkazech(id);
      if (!v) return null;
      v.skryto = skryto;
      return vzkazZPameti(v);
    },
    async nacistVzkaz(id) {
      const v = vVzkazech(id);
      return v ? vzkazZPameti(v) : null;
    },
    async zalozitTema(t) {
      if (temata.some((u) => u.id === t.id)) return false;
      temata.push(kopie(t));
      return true;
    },
    async upravitTema(t) {
      const tema = temata.find((u) => u.id === t.id);
      if (tema) Object.assign(tema, kopie(t));
    },
    async nacistTema(id) {
      const tema = temata.find((t) => t.id === id);
      return tema ? sTematem(tema, false) : null;
    },
    async temataFeedu(pocet) {
      return {
        temata: temata.filter(viditelne).sort(podleZmeny).slice(0, pocet).map((t) => sTematem(t, true)),
        ukazkyVDb: temata.filter((t) => t.ukazka).map((t) => t.id),
      };
    },
    async vzkazPodleKlice(klicNavrhu) {
      const v = vzkazy.find((u) => u.klicNavrhu === klicNavrhu);
      return v ? { id: v.id, temaId: v.temaId } : null;
    },
    async vektoryTemat(typ: TypPodnetu) {
      const mozna = new Set(temata.filter((t) => viditelne(t) && t.typ === typ).map((t) => t.id));
      return {
        clenove: vzkazy.filter((v) => !v.skryto && v.temaId && mozna.has(v.temaId) && v.vektor).map((v) => ({
          temaId: v.temaId!,
          vzkazId: v.id,
          vektor: new Float32Array(v.vektor!),
          vektorNazvu: v.vektorNazvu ? new Float32Array(v.vektorNazvu) : null,
        })),
        vyloucena: temata.filter((t) => !viditelne(t)).map((t) => t.id),
      };
    },
    async ulozitCast(c) {
      // Stejně jako unikátní index v D1: nejvýš jedna platná část na hlavní dotaz a na každý poddotaz.
      if (c.stav === 'platna' && casti.some((u) => u.stav === 'platna' && u.temaId === c.temaId && u.vzkazId === c.vzkazId)) {
        throw new Error('UNIQUE constraint failed: odpoved_platna');
      }
      casti.push(kopie(c));
    },
    async zmenitCast(id, stav, duvod, nahrazenaId = null) {
      const c = casti.find((u) => u.id === id);
      if (c) Object.assign(c, { stav, duvod, nahrazenaId });
    },
    async vektoryUkazek() {
      return new Map(ukazky);
    },
    async ulozitVektorUkazky(id, otisk, vektor, vektorNazvu) {
      ukazky.set(id, { otisk, vektor: new Float32Array(vektor), vektorNazvu: new Float32Array(vektorNazvu) });
    },
    async vzkazyBezTematu() {
      return vzkazy.filter((v) => !v.temaId).map((v) => ({
        id: v.id,
        vytvoreno: v.vytvoreno,
        text: v.text,
        nazev: v.nazev,
        typ: v.typ,
        oblast: v.oblast as SlugOblasti,
        styl: v.styl,
        textStylu: v.textStylu,
        skryto: v.skryto,
        stav: v.stav,
        odpoved: kopie(v.odpoved),
        vektor: v.vektor ? new Float32Array(v.vektor) : null,
        vektorNazvu: v.vektorNazvu ? new Float32Array(v.vektorNazvu) : null,
      }));
    },
    async doplnitVektory(id, vektor, vektorNazvu) {
      const v = vVzkazech(id);
      if (v) Object.assign(v, { vektor, vektorNazvu });
    },
    async seznamTemat() {
      return [...temata].sort(podleZmeny).map((t) => ({ ...kopie(t), pocet: vzkazy.filter((v) => v.temaId === t.id && !v.skryto).length }));
    },
  };
}
