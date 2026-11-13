// Témata ve feedu (13. 11. 2026, F-33 až F-37): ukázka jako téma, nabídka podobných témat, doplnění odpovědi
// tématu a opravy témat týmem. Nezná Astro ani Hono, úložiště a AI dostane zvenku.
import type { SluzbaAi } from '../ai/rozhrani';
import { sLimitem } from '../podani/zpracovani';
import { UKAZKOVA_TEMATA, type UkazkoveTema } from '../temata/temata';
import { najitPodobnaTemata, type PodobneTema } from './podobnost';
import { precistNoveOtazky, zpravyNovychOtazek } from './prompt-temat';
import { obsahZOdpovedi, porovnatVety, seraditCasti, slozitOdpoved, zbytekObsahu, type PorovnaniVet } from './skladani';
import { noveId } from './uloziste';
import type { CastOdpovedi, ObsahCasti, RadekTematu, StavTematuDb, TemaFeedu, UlozeneTema, UlozisteVzkazu, VztahVzkazu } from './typy';

export interface ZavislostiTemat {
  uloziste: UlozisteVzkazu;
  ai: SluzbaAi;
  // Ukázky od týmu. Testy je mohou vynechat.
  ukazky?: UkazkoveTema[];
  log?: (zaznam: Record<string, unknown>) => void;
}

// Nové otázky jsou krátké volání (měření: medián 0,7 s, nejdéle 4,8 s). Když nestihnou, hledá se celý poddotaz
// a opakování odstraní skládání.
export const LIMIT_NOVYCH_OTAZEK_MS = 5_000;

const ukazkyZ = (z: Pick<ZavislostiTemat, 'ukazky'>) => z.ukazky ?? UKAZKOVA_TEMATA;
export const noveIdTematu = () => `t-${noveId()}`;
const noveIdCasti = () => `c-${noveId()}`;

export function temaZUkazky(t: UkazkoveTema): TemaFeedu {
  return {
    id: t.id,
    ukazka: true,
    nazev: t.nazev,
    text: t.text,
    typ: t.typ,
    oblast: t.oblast,
    stav: t.stav === 'zodpovezeno-z-webu' ? 'zodpovezeno' : 'ceka',
    pocet: 0,
    ...(t.odpoved ? { odpoved: { vety: t.odpoved.vety, zdroje: t.odpoved.zdroje, oznaceni: t.odpoved.oznaceni } } : {}),
    cekajici: [],
    vzkazy: [],
  };
}

function castZUkazky(t: UkazkoveTema, cas: string): CastOdpovedi | null {
  if (!t.odpoved) return null;
  return {
    id: noveIdCasti(),
    temaId: t.id,
    vzkazId: null,
    vytvoreno: cas,
    puvod: 'ukazka',
    stav: 'platna',
    duvod: null,
    nahrazenaId: null,
    otazka: null,
    obsah: obsahZOdpovedi({ vety: t.odpoved.vety, zdroje: t.odpoved.zdroje }),
  };
}

// Platné části, které se ukazují: skrytý poddotaz skryje i svou část odpovědi.
export function viditelneCasti(u: UlozeneTema) {
  const viditelne = new Set(u.vzkazy.filter((v) => !v.skryto).map((v) => v.id));
  return seraditCasti(u.casti).filter((c) => c.vzkazId === null || viditelne.has(c.vzkazId));
}

export function stavTematu(u: UlozeneTema): StavTematuDb {
  if (u.tema.stav === 'sloucene') return 'sloucene';
  return u.tema.typ === 'dotaz' && viditelneCasti(u).some((c) => c.vzkazId === null) ? 'zodpovezeno-z-webu' : 'ceka-na-spravce';
}

// Téma, jak ho ukáže feed a nabídka podobných témat.
export function temaDoFeedu(u: UlozeneTema, novaCastId?: string | null): TemaFeedu {
  const viditelne = u.vzkazy.filter((v) => !v.skryto);
  const zakladatel = viditelne.find((v) => v.vztah === 'zakladatel');
  const casti = viditelneCasti(u);
  const odpoved = slozitOdpoved(casti, novaCastId);
  const cekajici = viditelne.filter((v) => v.vztah === 'poddotaz').flatMap((v) => {
    const cast = casti.find((c) => c.vzkazId === v.id);
    return cast ? cast.obsah.nezodpovezeno ?? [] : [v.text];
  });
  return {
    id: u.tema.id,
    ukazka: u.tema.ukazka,
    nazev: u.tema.nazev,
    text: u.tema.text,
    typ: u.tema.typ,
    oblast: u.tema.oblast,
    stav: stavTematu(u) === 'zodpovezeno-z-webu' ? 'zodpovezeno' : 'ceka',
    pocet: viditelne.length,
    zmeneno: u.tema.zmeneno.slice(0, 10),
    ...(zakladatel ? { styl: zakladatel.styl, ...(zakladatel.textStylu ? { textStylu: zakladatel.textStylu } : {}) } : {}),
    ...(odpoved ? { odpoved } : {}),
    cekajici: [...new Set(cekajici)],
    vzkazy: viditelne.filter((v) => v !== zakladatel).map((v) => ({
      id: `v-${v.id}`,
      text: v.text,
      vztah: v.vztah,
      datum: v.vytvoreno.slice(0, 10),
      styl: v.styl,
      ...(v.textStylu ? { textStylu: v.textStylu } : {}),
    })),
  };
}

// Feed: témata z databáze od poslední změny, za nimi ukázky, které v databázi nejsou (bez vzkazů).
export function sestavitFeed(z: { temata: UlozeneTema[]; ukazkyVDb: string[] }, ukazky: UkazkoveTema[] = UKAZKOVA_TEMATA): TemaFeedu[] {
  const vDb = new Set(z.ukazkyVDb);
  return [...z.temata.map((u) => temaDoFeedu(u)), ...ukazky.filter((t) => !vDb.has(t.id)).map(temaZUkazky)];
}

// Ukázka se stane řádkem v databázi až při prvním připojeném vzkazu. Její odpověď z JSON je hlavní odpověď tématu.
export async function zajistitTema(id: string, z: ZavislostiTemat, ted: Date): Promise<UlozeneTema | null> {
  const ulozene = await z.uloziste.nacistTema(id);
  if (ulozene) return ulozene;
  const ukazka = ukazkyZ(z).find((t) => t.id === id);
  if (!ukazka) return null;
  const cas = ted.toISOString();
  const radek: RadekTematu = {
    id, ukazka: true, vytvoreno: cas, zmeneno: cas, nazev: ukazka.nazev, text: ukazka.text, typ: ukazka.typ, oblast: ukazka.oblast,
    stav: ukazka.stav, hlavniId: null, skryto: false,
  };
  // Když ukázku současně založil jiný vzkaz, druhé založení nic neudělá a část odpovědi se nepřidá dvakrát.
  if (await z.uloziste.zalozitTema(radek)) {
    const cast = castZUkazky(ukazka, cas);
    if (cast) await z.uloziste.ulozitCast(cast);
  }
  return z.uloziste.nacistTema(id);
}

// Téma k zobrazení: z databáze, nebo ukázka. Skryté a sloučené téma není.
export async function nacistTemaKZobrazeni(id: string, z: ZavislostiTemat): Promise<TemaFeedu | null> {
  const ulozene = await z.uloziste.nacistTema(id);
  if (ulozene) return ulozene.tema.skryto || ulozene.tema.stav === 'sloucene' ? null : temaDoFeedu(ulozene);
  const ukazka = ukazkyZ(z).find((t) => t.id === id);
  return ukazka ? temaZUkazky(ukazka) : null;
}

// Nabídka (F-34): nejvýš 3 podobná témata i s odpovědí. Bez textů připojených vzkazů, ty jsou ve feedu.
export async function nabidnoutTemata(
  novy: { vektor: number[]; vektorNazvu: number[] | null },
  typ: TemaFeedu['typ'],
  z: ZavislostiTemat,
  vyloucitVzkaz?: string,
): Promise<{ temata: TemaFeedu[]; podobnosti: PodobneTema[] }> {
  const podobnosti = await najitPodobnaTemata(novy, typ, { uloziste: z.uloziste, ai: z.ai, ukazky: ukazkyZ(z) }, vyloucitVzkaz);
  const temata = await Promise.all(podobnosti.map((p) => nacistTemaKZobrazeni(p.id, z)));
  return { temata: temata.flatMap((t) => (t ? [{ ...t, vzkazy: [] }] : [])), podobnosti };
}

export async function prepocitatTema(temaId: string, z: ZavislostiTemat, ted: Date): Promise<UlozeneTema | null> {
  const u = await z.uloziste.nacistTema(temaId);
  if (!u) return null;
  await z.uloziste.upravitTema({ ...u.tema, stav: stavTematu(u), zmeneno: ted.toISOString() });
  return z.uloziste.nacistTema(temaId);
}

// Text odpovědi tématu pro nové otázky.
const textOdpovedi = (tema: TemaFeedu) => (tema.odpoved?.vety ?? []).map((v) => v.text).join(' ');

// Poddotaz (F-35, F-37): na co se vzkaz ptá navíc oproti tématu a jeho odpovědi. Null znamená, že model nevrátil
// platný výstup a má se hledat celý vzkaz.
export async function najitNoveOtazky(tema: TemaFeedu, text: string, ai: SluzbaAi, limitMs = LIMIT_NOVYCH_OTAZEK_MS): Promise<string[] | null> {
  try {
    const vystup = await sLimitem(ai.generovat(zpravyNovychOtazek({ text: tema.text, odpoved: textOdpovedi(tema) }, text), { maxTokenu: 300 }), limitMs);
    return precistNoveOtazky(vystup, text);
  } catch {
    return null;
  }
}

function pocetVet(obsah: ObsahCasti | null) {
  return obsah ? obsah.casti.reduce((s, c) => s + c.vety.length, 0) : 0;
}

// Doplní odpověď tématu o novou část (hlavní dotaz, nebo poddotaz). Opakované věty vynechá, při rozporu vyhraje
// novější zdroj a starší část jde ke kontrole: místo ní vznikne platná část bez vyvrácené věty (nic se nesmaže).
export async function doplnitOdpovedTematu(
  temaId: string,
  vzkazId: string | null,
  obsah: ObsahCasti,
  otazka: string | null,
  z: ZavislostiTemat,
  ted: Date,
): Promise<{ castId: string | null; porovnani: PorovnaniVet }> {
  const u = await z.uloziste.nacistTema(temaId);
  if (!u) throw new Error(`Téma ${temaId} neexistuje.`);
  const porovnani = await porovnatVety(viditelneCasti(u), obsah, z.ai);
  const cas = ted.toISOString();
  for (const [castId, texty] of porovnani.nahradit) {
    const stara = u.casti.find((c) => c.id === castId);
    if (!stara) continue;
    const zbytek = zbytekObsahu(stara.obsah, (text) => texty.has(text));
    const nahradaId = zbytek ? noveIdCasti() : null;
    await z.uloziste.zmenitCast(stara.id, 'ke-kontrole', 'novejsi-zdroj', nahradaId);
    if (zbytek && nahradaId) await z.uloziste.ulozitCast({ ...stara, id: nahradaId, stav: 'platna', duvod: null, nahrazenaId: null, obsah: zbytek });
  }
  let castId: string | null = null;
  if (porovnani.obsah) {
    // Platná část pro stejný cíl už být nemá (odpojení ji stáhlo). Kdyby byla, nová ji nahradí.
    for (const stara of u.casti) {
      if (stara.stav === 'platna' && stara.vzkazId === vzkazId && !porovnani.nahradit.has(stara.id)) await z.uloziste.zmenitCast(stara.id, 'stazena', 'nahrazeno');
    }
    castId = noveIdCasti();
    await z.uloziste.ulozitCast({
      id: castId, temaId, vzkazId, vytvoreno: cas, puvod: 'web', stav: 'platna', duvod: null, nahrazenaId: null, otazka, obsah: porovnani.obsah,
    });
  }
  z.log?.({
    udalost: 'skladani',
    vet: pocetVet(obsah),
    zbylo: pocetVet(porovnani.obsah),
    opakovanych: porovnani.opakovanych,
    rozporu: porovnani.rozporu,
    posouzeno: porovnani.posouzeno,
    posouzeniSelhalo: porovnani.posouzeniSelhalo || undefined,
  });
  return { castId, porovnani };
}

// Vzkaz opustí téma (autor ho upravil a potvrdil znovu, nebo ho tým přesunul). Jeho část odpovědi se stáhne.
// Zakladatel bez dalších vzkazů vezme s sebou i téma (ukázka zůstane).
export async function odpojitVzkaz(vzkazId: string, temaId: string, z: ZavislostiTemat, ted: Date, duvod: string) {
  const u = await z.uloziste.nacistTema(temaId);
  if (!u) return;
  const vzkaz = u.vzkazy.find((v) => v.id === vzkazId);
  for (const c of u.casti) if (c.vzkazId === vzkazId && c.stav === 'platna') await z.uloziste.zmenitCast(c.id, 'stazena', duvod);
  const ostatni = u.vzkazy.filter((v) => v.id !== vzkazId && !v.skryto);
  if (vzkaz?.vztah === 'zakladatel' && !ostatni.length && !u.tema.ukazka) {
    for (const c of u.casti) if (c.vzkazId === null && c.stav === 'platna') await z.uloziste.zmenitCast(c.id, 'stazena', duvod);
    await z.uloziste.upravitTema({ ...u.tema, skryto: true, zmeneno: ted.toISOString() });
  }
  await z.uloziste.pripojit(vzkazId, null, null, ted);
  await prepocitatTema(temaId, z, ted);
}

// Nové téma ze vzkazu: vzkaz je zakladatel, text tématu je kopie jeho textu.
export function noveTema(vzkaz: { nazev: string; text: string; typ: TemaFeedu['typ']; oblast: TemaFeedu['oblast'] }, ted: Date, id = noveIdTematu()): RadekTematu {
  const cas = ted.toISOString();
  return {
    id, ukazka: false, vytvoreno: cas, zmeneno: cas, nazev: vzkaz.nazev, text: vzkaz.text, typ: vzkaz.typ, oblast: vzkaz.oblast,
    stav: 'ceka-na-spravce', hlavniId: null, skryto: false,
  };
}

// ---- Příkazy pro tým (nastroje/vzkazy.ts). Tým témata opravuje jen příkazem, rozhraní je Později (F-38). ----

const bezPredpony = (id: string) => id.replace(/^v-/, '');

// Přesune vzkaz i s jeho částí odpovědi. Zakladatel, který v tématu zůstal sám, vezme i hlavní odpověď a staré téma
// se sloučí do cílového. Cíl „nove“ udělá ze vzkazu zakladatele nového tématu.
export async function presunoutVzkaz(id: string, cil: string, vztah: VztahVzkazu | undefined, z: ZavislostiTemat, ted = new Date()) {
  const vzkaz = await z.uloziste.nacistVzkaz(bezPredpony(id));
  if (!vzkaz) throw new Error(`Vzkaz ${id} neexistuje nebo nemá téma.`);
  const zdroj = await z.uloziste.nacistTema(vzkaz.temaId);
  if (!zdroj) throw new Error(`Téma ${vzkaz.temaId} neexistuje.`);
  if (cil === vzkaz.temaId) throw new Error('Vzkaz už v tomto tématu je.');
  const ostatni = zdroj.vzkazy.filter((v) => v.id !== vzkaz.id && !v.skryto);
  const jedinyZakladatel = vzkaz.vztah === 'zakladatel' && !ostatni.length;
  if (cil === 'nove' && jedinyZakladatel) throw new Error('Vzkaz už má vlastní téma.');
  const jehoCasti = zdroj.casti.filter((c) => c.stav === 'platna' && (c.vzkazId === vzkaz.id || (jedinyZakladatel && c.vzkazId === null)));

  let cilId = cil;
  let novyVztah: VztahVzkazu;
  if (cil === 'nove') {
    cilId = noveIdTematu();
    await z.uloziste.zalozitTema(noveTema({ ...vzkaz, oblast: zdroj.tema.oblast }, ted, cilId));
    novyVztah = 'zakladatel';
  } else {
    const tema = await zajistitTema(cil, z, ted);
    if (!tema) throw new Error(`Téma ${cil} neexistuje.`);
    if (tema.tema.typ !== vzkaz.typ) throw new Error(`Téma ${cil} je jiného typu (${tema.tema.typ}) než vzkaz (${vzkaz.typ}).`);
    novyVztah = vztah ?? (jehoCasti.length ? (vzkaz.typ === 'dotaz' ? 'poddotaz' : 'doplneni') : 'totez');
  }
  await z.uloziste.pripojit(vzkaz.id, cilId, novyVztah, ted);
  for (const c of jehoCasti) await z.uloziste.zmenitCast(c.id, 'stazena', 'presunuto');
  // Odpověď vzkazu jde s ním: v novém tématu jako hlavní, jinde jako část poddotazu (bez opakování a s rozporem).
  const cilove = await z.uloziste.nacistTema(cilId);
  const maHlavni = cilove ? viditelneCasti(cilove).some((c) => c.vzkazId === null) : false;
  for (const c of jehoCasti) {
    const hlavni = novyVztah === 'zakladatel' || (novyVztah === 'totez' && !maHlavni);
    await doplnitOdpovedTematu(cilId, hlavni ? null : vzkaz.id, c.obsah, hlavni ? null : c.otazka ?? vzkaz.nazev, z, ted);
  }
  if (jedinyZakladatel && !zdroj.tema.ukazka) {
    await z.uloziste.upravitTema({ ...zdroj.tema, stav: 'sloucene', hlavniId: cilId, zmeneno: ted.toISOString() });
  } else {
    await prepocitatTema(zdroj.tema.id, z, ted);
  }
  return prepocitatTema(cilId, z, ted);
}

// Sloučí téma Z do tématu DO: vzkazy i části odpovědí přejdou (bez opakování a s rozporem), Z odkazuje na DO.
export async function sloucitTemata(zId: string, doId: string, z: ZavislostiTemat, ted = new Date()) {
  if (zId === doId) throw new Error('Téma nejde sloučit samo se sebou.');
  const puvodni = await zajistitTema(zId, z, ted);
  const cilove = await zajistitTema(doId, z, ted);
  if (!puvodni || !cilove) throw new Error('Téma neexistuje.');
  if (puvodni.tema.typ !== cilove.tema.typ) throw new Error('Témata jsou různého typu.');
  const casti = viditelneCasti(puvodni);
  const hlavni = casti.find((c) => c.vzkazId === null);
  const zakladatel = puvodni.vzkazy.find((v) => v.vztah === 'zakladatel' && !v.skryto);
  for (const v of puvodni.vzkazy) {
    const vztah: VztahVzkazu = v.vztah !== 'zakladatel' ? v.vztah : hlavni ? (v.typ === 'dotaz' ? 'poddotaz' : 'doplneni') : 'totez';
    await z.uloziste.pripojit(v.id, doId, vztah, ted);
  }
  for (const c of puvodni.casti) if (c.stav === 'platna') await z.uloziste.zmenitCast(c.id, 'stazena', 'slouceno');
  for (const c of casti) {
    const vzkazId = c.vzkazId ?? zakladatel?.id ?? null;
    const maHlavni = viditelneCasti((await z.uloziste.nacistTema(doId))!).some((x) => x.vzkazId === null);
    // Hlavní odpověď ukázky bez zakladatele: když cíl hlavní odpověď nemá, stane se jí. Jinak se spojí s ní.
    if (vzkazId === null && maHlavni) {
      const cil = (await z.uloziste.nacistTema(doId))!;
      const puvodniHlavni = viditelneCasti(cil).find((x) => x.vzkazId === null)!;
      const porovnani = await porovnatVety([puvodniHlavni], c.obsah, z.ai);
      if (porovnani.obsah) {
        const spojeny: ObsahCasti = {
          casti: [...puvodniHlavni.obsah.casti, ...porovnani.obsah.casti.map((p) => ({ ...p, otazka: p.otazka ?? puvodni.tema.nazev }))],
          zdroje: [...puvodniHlavni.obsah.zdroje, ...porovnani.obsah.zdroje.filter((x) => !puvodniHlavni.obsah.zdroje.some((y) => y.url === x.url))],
        };
        await z.uloziste.zmenitCast(puvodniHlavni.id, 'stazena', 'slouceno');
        await z.uloziste.ulozitCast({ ...puvodniHlavni, id: noveIdCasti(), vytvoreno: ted.toISOString(), obsah: spojeny });
      }
      continue;
    }
    await doplnitOdpovedTematu(doId, vzkazId, c.obsah, vzkazId === null ? null : c.otazka ?? puvodni.tema.nazev, z, ted);
  }
  await z.uloziste.upravitTema({ ...puvodni.tema, stav: 'sloucene', hlavniId: doId, zmeneno: ted.toISOString() });
  return prepocitatTema(doId, z, ted);
}

export async function skrytTema(id: string, skryto: boolean, z: ZavislostiTemat, ted = new Date()) {
  const u = await zajistitTema(id, z, ted);
  if (!u) throw new Error(`Téma ${id} neexistuje.`);
  await z.uloziste.upravitTema({ ...u.tema, skryto });
  return u.tema;
}

// Skrytý zakladatel skryje celé téma, protože text tématu je kopie jeho textu.
export async function skrytVzkaz(id: string, skryto: boolean, z: ZavislostiTemat, ted = new Date()) {
  const vzkaz = await z.uloziste.skrytVzkaz(bezPredpony(id), skryto);
  if (!vzkaz) return { vzkaz: null, tema: null };
  if (vzkaz.vztah === 'zakladatel') {
    const tema = await skrytTema(vzkaz.temaId, skryto, z, ted);
    return { vzkaz, tema };
  }
  await prepocitatTema(vzkaz.temaId, z, ted);
  return { vzkaz, tema: null };
}

// Převod vzkazů z doby před tématy: každý dostane vlastní téma a jeho odpověď je hlavní odpověď. Bez --provest
// jen vypíše nejbližší témata, připojení k nim udělá tým příkazem presunout.
export async function prevestVzkazy(z: ZavislostiTemat, provest: boolean, ted = new Date()) {
  const zprava: { id: string; nazev: string; typ: string; podobna: PodobneTema[]; tema?: string }[] = [];
  for (const v of await z.uloziste.vzkazyBezTematu()) {
    let { vektor, vektorNazvu } = v;
    if (!vektor || !vektorNazvu) {
      const [vt, vn] = await z.ai.vektory([v.text, v.nazev]);
      vektor = new Float32Array(vt);
      vektorNazvu = new Float32Array(vn);
      if (provest) await z.uloziste.doplnitVektory(v.id, vt, vn);
    }
    const podobna = await najitPodobnaTemata({ vektor: Array.from(vektor), vektorNazvu: Array.from(vektorNazvu) }, v.typ, { ...z, ukazky: ukazkyZ(z) });
    const radek: (typeof zprava)[number] = { id: `v-${v.id}`, nazev: v.nazev, typ: v.typ, podobna };
    if (provest) {
      const tema = { ...noveTema(v, new Date(v.vytvoreno)), skryto: v.skryto };
      await z.uloziste.zalozitTema(tema);
      await z.uloziste.pripojit(v.id, tema.id, 'zakladatel', ted);
      if (v.stav === 'zodpovezeno' && v.odpoved) {
        await z.uloziste.ulozitCast({
          id: noveIdCasti(), temaId: tema.id, vzkazId: null, vytvoreno: v.vytvoreno, puvod: 'web', stav: 'platna', duvod: null,
          nahrazenaId: null, otazka: null, obsah: obsahZOdpovedi(v.odpoved),
        });
      }
      await prepocitatTema(tema.id, z, new Date(v.vytvoreno));
      radek.tema = tema.id;
    }
    zprava.push(radek);
  }
  return zprava;
}
