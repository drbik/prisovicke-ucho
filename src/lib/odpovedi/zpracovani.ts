import { jeTyp, type TypPodnetu } from '../oblasti';
import { ChybaPodani } from '../podani/chyby';
import { MAX_VELIKOST_TEXTU_B, MAX_ZNAKU_UPRAVY, MIN_ZNAKU_TEXTU } from '../podani/limity';
import { precistTelo, type Limiter } from '../podani/ochrana';
import { overitPotvrzeni } from '../podani/potvrzeni';
import { overitNavrh, zakladniTyp, zkontrolovatPozadavek, type NavrhPodani, type ZavislostiPodani } from '../podani/zpracovani';
import type { UkazkoveTema } from '../temata/temata';
import { VERZE_PROMPTU_TEMAT } from '../vzkazy/prompt-temat';
import { obsahZOdpovedi } from '../vzkazy/skladani';
import {
  doplnitOdpovedTematu,
  nabidnoutTemata,
  nacistTemaKZobrazeni,
  najitNoveOtazky,
  noveTema,
  odpojitVzkaz,
  prepocitatTema,
  temaDoFeedu,
  zajistitTema,
  type ZavislostiTemat,
} from '../vzkazy/temata';
import type { NovyVzkaz, OdpovedVzkazu, StavVzkazu, TemaFeedu, UlozisteVzkazu, VolbaTematu, VztahVzkazu } from '../vzkazy/typy';
import { LIMIT_CASTI_MS, odpovedetNaCasti, odpovedetPoCastech, type PrubehOdpovedi } from './casti';
import { jeStyl, type KlicStylu } from './mluvci';
import type { TechnickeOdpovedi, VysledekOdpovedi, ZobrazenaOdpoved } from './odpoved';
import { VERZE_PROMPTU_ODPOVEDI } from './prompt-odpovedi';
import type { IndexZdroju } from './rozhrani';
import {
  TEXT_BEZ_ODPOVEDI,
  overitStylVzkazu,
  podepsatPodklad,
  podkladOdpovedi,
  podkladZpravy,
  type PodepsanyPodklad,
  type PodkladPrevypraveni,
} from './styl';
import { UPOZORNENI } from './zdroje';

// Když hledání a oba modely nestihnou odpovědět na část dotazu do té doby, převezmou ji lidé (PRD, Rychlost).
export const LIMIT_ODPOVEDI_MS = LIMIT_CASTI_MS;
// Tělo nese i návrh AI úpravy (surový text a úprava) a text postavy, proto víc místa než napsaný vzkaz.
export const MAX_VELIKOST_DOTAZU_B = MAX_VELIKOST_TEXTU_B * 4;

export interface ZavislostiDotazu extends ZavislostiPodani {
  index?: IndexZdroju;
  limitOdpovediMs?: number;
  prahPodobnosti?: number;
  // Klíč pro podpis toho, co pak smí stránka nechat převyprávět mluvčím (13. 11. 2026).
  klicPodpisu?: string;
  // Úložiště vzkazů a témat (13. 11. 2026). Bez něj se vzkaz neuloží, jen se hledá odpověď.
  uloziste?: UlozisteVzkazu;
  // Ukázky od týmu jako témata. Testy je mohou vynechat.
  ukazky?: UkazkoveTema[];
  // F-81: potvrzení odpovědi jde přes stejný limit jako přepínání postav.
  limiterStylu?: Limiter;
}

// Zařazení vzkazu k tématu (F-35): téma, jak ho přidá feed, a id uloženého vzkazu. „zTematu“ znamená, že odpověď
// je existující odpověď tématu bez nového hledání (F-37). „nicNoveho“: poddotaz se neptal na nic, co téma nemá.
interface Zarazeni {
  tema?: TemaFeedu;
  vzkazId?: string;
  zTematu?: true;
  nicNoveho?: true;
}

// prevypraveni: co smí stránka nechat převyprávět mluvčím, s podpisem serveru. Má ho odpověď i dotaz bez odpovědi
// (13. 11. 2026). Chybí u výpadku AI a když server nemá klíč.
// vyber-tematu: podobná témata (F-34). Nic se neuložilo, stránka pošle vzkaz znovu s volbou autora.
export type VysledekDotazu =
  | { vysledek: 'vyber-tematu'; temata: TemaFeedu[] }
  | ((
    | { vysledek: 'nehleda'; typ: TypPodnetu }
    | (VysledekOdpovedi & { celkemMs: number; prevypraveni?: PodepsanyPodklad })
    | { vysledek: 'zastupitelum'; duvod: 'chyba-ai'; celkemMs: number; technicke?: TechnickeOdpovedi }
  ) & Zarazeni);

// Průběžné zprávy pro stránku, poslední z nich nese výsledek. Posílají se po řádcích JSON (NDJSON).
export type UdalostPrubehu = PrubehOdpovedi;
export type UdalostDotazu = UdalostPrubehu | { udalost: 'vysledek'; vysledek: VysledekDotazu };

type PripraveneUlozeni = Omit<NovyVzkaz, 'vektor' | 'vektorNazvu'>;

export interface PripravenyDotaz {
  text: string;
  typ: TypPodnetu;
  ulozeni?: PripraveneUlozeni;
  volba?: VolbaTematu;
}

async function precistTeloDotazu(request: Request, maxBajtu = MAX_VELIKOST_DOTAZU_B) {
  const telo = await precistTelo(request, maxBajtu);
  try {
    return (JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(telo)) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ChybaPodani('spatny-text');
  }
}

function jeNavrh(hodnota: unknown): hodnota is NavrhPodani {
  const n = (hodnota ?? {}) as Record<string, unknown>;
  const u = (n.uprava ?? {}) as Record<string, unknown>;
  return (n.vstup === 'hlas' || n.vstup === 'text') && typeof n.surovyText === 'string'
    && ['text', 'nazev', 'typ', 'oblast'].every((pole) => typeof u[pole] === 'string');
}

// Volba autora z těla požadavku. Neplatná volba se zahodí a ucho nabídne podobná témata znovu.
function precistVolbu(hodnota: unknown): VolbaTematu | undefined {
  const v = (hodnota ?? {}) as Record<string, unknown>;
  if (v.nove === true) return { nove: true };
  if (typeof v.tema === 'string' && /^(?:t-[0-9a-z]{1,20}|ukazka-\d{1,3})$/.test(v.tema)
    && (v.vztah === 'totez' || v.vztah === 'poddotaz' || v.vztah === 'doplneni')) {
    return { tema: v.tema, vztah: v.vztah };
  }
  return undefined;
}

// Potvrzený vzkaz k uložení (F-14): návrh AI úpravy musí nést podpis serveru, potvrzení projde stejnou kontrolou
// jako v prohlížeči a text postavy se uloží, jen když ho server sám napsal k tomuto spisovnému znění.
async function pripravitUlozeni(data: unknown, text: string, typ: TypPodnetu, z: ZavislostiDotazu): Promise<PripraveneUlozeni | undefined> {
  if (data === undefined || !z.uloziste || !z.klicPodpisu) return undefined;
  const u = (data ?? {}) as Record<string, unknown>;
  if (!jeNavrh(u.navrh) || !(await overitNavrh(u.navrh, u.podpis, z.klicPodpisu))) throw new ChybaPodani('neplatny-podklad');
  const potvrzeni = overitPotvrzeni({ text, nazev: typeof u.nazev === 'string' ? u.nazev : '', typ, oblast: typeof u.oblast === 'string' ? u.oblast : '' });
  if (!potvrzeni.platne) throw new ChybaPodani('spatny-text');
  const styl: KlicStylu = jeStyl(u.styl) ? u.styl : 'spisovne';
  const textStylu = styl !== 'spisovne' && typeof u.textStylu === 'string'
    && await overitStylVzkazu(styl, text, u.textStylu, u.podpisStylu, z.klicPodpisu) ? u.textStylu : null;
  return {
    klicNavrhu: u.podpis as string,
    vstup: u.navrh.vstup,
    surovyText: u.navrh.surovyText,
    navrhText: u.navrh.uprava.text,
    text,
    nazev: potvrzeni.vzkaz.nazev,
    typ,
    oblast: potvrzeni.vzkaz.oblast,
    styl,
    textStylu,
  };
}

// Kontrola původu, limitu a těla. Chyby z ní jdou jako HTTP chyby ještě předtím, než se začne posílat průběh.
export async function pripravitDotaz(request: Request, z: ZavislostiDotazu): Promise<PripravenyDotaz> {
  if (zakladniTyp(request.headers.get('content-type')) !== 'application/json') throw new ChybaPodani('spatny-typ');
  await zkontrolovatPozadavek(request, z);
  const data = await precistTeloDotazu(request);
  const { text, typ } = data;
  if (typeof text !== 'string' || !jeTyp(typ)) throw new ChybaPodani('spatny-text');
  const cisty = text.trim();
  if (cisty.length < MIN_ZNAKU_TEXTU || cisty.length > MAX_ZNAKU_UPRAVY) throw new ChybaPodani('spatny-text');
  if (typ === 'dotaz' && !z.index) throw new ChybaPodani('nedostupne');
  const ulozeni = await pripravitUlozeni(data.ulozit, cisty, typ, z);
  const volba = ulozeni ? precistVolbu(data.tema) : undefined;
  return { text: cisty, typ, ...(ulozeni ? { ulozeni } : {}), ...(volba ? { volba } : {}) };
}

async function podepsat(podklad: PodkladPrevypraveni, klic?: string): Promise<{ prevypraveni?: PodepsanyPodklad }> {
  return klic ? { prevypraveni: { podklad, podpis: await podepsatPodklad(podklad, klic) } } : {};
}

function hlaskaChyby(chyba: unknown) {
  return chyba instanceof Error ? chyba.message.slice(0, 200) : 'neznámá chyba';
}

type VysledekHledani = (VysledekOdpovedi & { celkemMs: number }) | { vysledek: 'zastupitelum'; duvod: 'chyba-ai'; celkemMs: number; technicke?: TechnickeOdpovedi };

// Hledání na webu (F-72 až F-76): celý dotaz po částech, nebo u poddotazu jen nové otázky.
// Do logu jdou jen časy, počty, model a verze promptu, nikdy text.
async function hledat(text: string, z: ZavislostiDotazu, priPrubehu?: (udalost: UdalostPrubehu) => void, otazky?: string[]): Promise<VysledekHledani> {
  if (!z.index) throw new ChybaPodani('nedostupne');
  const log = z.log ?? console.log;
  const ted = z.ted ?? Date.now;
  const zacatek = ted();
  const hlasky: string[] = [];
  const zavislosti = {
    ai: z.ai,
    index: z.index,
    ted,
    prahPodobnosti: z.prahPodobnosti,
    limitCastiMs: z.limitOdpovediMs,
    priChybe: (chyba: unknown) => hlasky.push(hlaskaChyby(chyba)),
  };
  try {
    const vysledek = otazky ? await odpovedetNaCasti(otazky, zavislosti, priPrubehu) : await odpovedetPoCastech(text, zavislosti, priPrubehu);
    const celkemMs = ted() - zacatek;
    log({
      udalost: 'dotaz',
      vysledek: vysledek.vysledek,
      duvod: vysledek.vysledek === 'zastupitelum' ? vysledek.duvod : undefined,
      vet: vysledek.vysledek === 'odpoved' ? vysledek.odpoved.vety.length : 0,
      zdroju: vysledek.vysledek === 'odpoved' ? vysledek.odpoved.zdroje.length : 0,
      ...vysledek.technicke,
      poddotaz: otazky ? true : undefined,
      celkemMs,
      znakuDotazu: text.length,
      hlaska: hlasky.length ? hlasky.join(' | ') : undefined,
    });
    return { ...vysledek, celkemMs };
  } catch (chyba) {
    const celkemMs = ted() - zacatek;
    log({ udalost: 'dotaz', vysledek: 'zastupitelum', duvod: 'chyba-ai', celkemMs, znakuDotazu: text.length, hlaska: hlaskaChyby(chyba) });
    return { vysledek: 'zastupitelum', duvod: 'chyba-ai', celkemMs };
  }
}

// Odpověď tématu, jak ji ukáže panel: s upozorněním, že nejde o úřední vyjádření obce.
function zobrazit(o: OdpovedVzkazu, nezodpovezeno: string[] = []): ZobrazenaOdpoved {
  return { vety: o.vety, ...(o.casti ? { casti: o.casti } : {}), zdroje: o.zdroje, nezodpovezeno, oznaceni: o.oznaceni, upozorneni: UPOZORNENI };
}

const odpovedVzkazu = (o: ZobrazenaOdpoved): OdpovedVzkazu => ({ vety: o.vety, ...(o.casti?.length ? { casti: o.casti } : {}), zdroje: o.zdroje, oznaceni: o.oznaceni });

const prazdneTechnicke = (z: ZavislostiDotazu): TechnickeOdpovedi => ({
  useku: 0, nejlepsiPodobnost: 0, prerazeno: 0, hledaniMs: 0, model: z.ai.modelOdpovedi, verzePromptu: VERZE_PROMPTU_ODPOVEDI,
});

// Bez uložení (chybí úložiště nebo údaje k uložení): jen hledání odpovědi, jako před tématy.
async function odpovedetBezUlozeni(dotaz: PripravenyDotaz, z: ZavislostiDotazu, priPrubehu?: (udalost: UdalostPrubehu) => void): Promise<VysledekDotazu> {
  const log = z.log ?? console.log;
  // F-72: návrhy, stížnosti a pochvaly se nehledají.
  if (dotaz.typ !== 'dotaz') {
    log({ udalost: 'dotaz', vysledek: 'nehleda', typ: dotaz.typ });
    return { vysledek: 'nehleda', typ: dotaz.typ };
  }
  const vysledek = await hledat(dotaz.text, z, priPrubehu);
  if (vysledek.vysledek === 'odpoved') return { ...vysledek, ...(await podepsat(podkladOdpovedi(dotaz.text, vysledek.odpoved), z.klicPodpisu)) };
  // Výpadek AI mluvčí nepřevypráví: autor má hledat znovu, ne se bavit.
  return vysledek.duvod === 'chyba-ai' ? vysledek : { ...vysledek, ...(await podepsat(podkladZpravy(dotaz.text, TEXT_BEZ_ODPOVEDI), z.klicPodpisu)) };
}

// Uložený vzkaz zařazený k tématu. Nabídka podobných témat, volba autora a uložení až po ní (F-14, F-34, F-35).
async function zaradit(
  dotaz: PripravenyDotaz & { ulozeni: PripraveneUlozeni },
  z: ZavislostiDotazu & { uloziste: UlozisteVzkazu },
): Promise<{ vyber: TemaFeedu[] } | { id: string; temaId: string; vztah: VztahVzkazu }> {
  const log = z.log ?? console.log;
  const ted = () => new Date((z.ted ?? Date.now)());
  const zt: ZavislostiTemat = { uloziste: z.uloziste, ai: z.ai, ukazky: z.ukazky, log };
  const u = dotaz.ulozeni;
  // Embedding textu a názvu: nabídka teď a podobnost pro vzkazy, které přijdou po něm.
  let vektor: number[] | null = null;
  let vektorNazvu: number[] | null = null;
  try {
    [vektor, vektorNazvu] = await z.ai.vektory([dotaz.text, u.nazev]);
  } catch (chyba) {
    log({ udalost: 'vektory-selhaly', hlaska: hlaskaChyby(chyba) });
  }
  const existujici = await z.uloziste.vzkazPodleKlice(u.klicNavrhu);

  let volba = dotaz.volba;
  if (volba && 'tema' in volba) {
    const tema = await nacistTemaKZobrazeni(volba.tema, zt);
    const vztahSedi = volba.vztah === 'totez' || (volba.vztah === 'poddotaz') === (dotaz.typ === 'dotaz');
    if (!tema || tema.typ !== dotaz.typ || !vztahSedi) volba = undefined;
  }
  if (!volba) {
    if (vektor) {
      const zacatek = Date.now();
      const { temata, podobnosti } = await nabidnoutTemata({ vektor, vektorNazvu }, dotaz.typ, zt, existujici?.id);
      log({ udalost: 'nabidka', typ: dotaz.typ, temat: temata.length, podobnosti: podobnosti.map((p) => p.podobnost), ms: Date.now() - zacatek });
      if (temata.length) return { vyber: temata };
    }
    volba = { nove: true };
  }

  // F-14: uloží se až teď, po volbě autora.
  const { id, predchozi } = await z.uloziste.ulozitVzkaz({ ...u, vektor, vektorNazvu }, ted());
  let temaId: string;
  let vztah: VztahVzkazu;
  if ('nove' in volba) {
    vztah = 'zakladatel';
    // Autor se vrátil k úpravám u vlastního tématu, ve kterém je sám: téma zůstane (stejné místo ve feedu) a hlavní
    // odpověď se stáhne a najde znovu. Jinak vzkaz opustí původní téma a založí nové.
    const puvodni = predchozi?.vztah === 'zakladatel' ? await z.uloziste.nacistTema(predchozi.temaId) : null;
    if (puvodni && !puvodni.tema.ukazka && !puvodni.vzkazy.some((v) => v.id !== id && !v.skryto)) {
      for (const c of puvodni.casti) if (c.stav === 'platna') await z.uloziste.zmenitCast(c.id, 'stazena', 'autor-upravil');
      await z.uloziste.upravitTema({ ...puvodni.tema, nazev: u.nazev, text: dotaz.text, typ: dotaz.typ, oblast: u.oblast, stav: 'ceka-na-spravce', skryto: false, zmeneno: ted().toISOString() });
      temaId = puvodni.tema.id;
    } else {
      if (predchozi) await odpojitVzkaz(id, predchozi.temaId, zt, ted(), 'autor-upravil');
      const tema = noveTema({ nazev: u.nazev, text: dotaz.text, typ: dotaz.typ, oblast: u.oblast }, ted());
      await z.uloziste.zalozitTema(tema);
      temaId = tema.id;
    }
  } else {
    if (predchozi) await odpojitVzkaz(id, predchozi.temaId, zt, ted(), 'autor-upravil');
    if (!(await zajistitTema(volba.tema, zt, ted()))) throw new Error(`Téma ${volba.tema} zmizelo.`);
    temaId = volba.tema;
    vztah = volba.vztah;
  }
  await z.uloziste.pripojit(id, temaId, vztah, ted());
  log({ udalost: 'zarazeni', vztah, typ: dotaz.typ, ukazka: temaId.startsWith('ukazka-'), znovu: predchozi ? true : undefined });
  return { id, temaId, vztah };
}

// Potvrzený vzkaz (F-14, F-33 až F-37). U uloženého vzkazu ucho nejdřív nabídne podobná témata. Po volbě autora
// vzkaz uloží k tématu a podle vztahu ukáže odpověď tématu, hledá jen nové otázky, nebo hledá jako dřív.
export async function odpovedetNaPripraveny(
  dotaz: PripravenyDotaz,
  z: ZavislostiDotazu,
  priPrubehu?: (udalost: UdalostPrubehu) => void,
): Promise<VysledekDotazu> {
  const log = z.log ?? console.log;
  if (!dotaz.ulozeni || !z.uloziste) return odpovedetBezUlozeni(dotaz, z, priPrubehu);
  if (dotaz.typ === 'dotaz' && !z.index) throw new ChybaPodani('nedostupne');
  const uloziste = z.uloziste;
  const ted = () => new Date((z.ted ?? Date.now)());
  const zt: ZavislostiTemat = { uloziste, ai: z.ai, ukazky: z.ukazky, log };

  let zarazeni: Awaited<ReturnType<typeof zaradit>>;
  try {
    zarazeni = await zaradit({ ...dotaz, ulozeni: dotaz.ulozeni }, { ...z, uloziste });
  } catch (chyba) {
    // Výpadek úložiště odpověď nezastaví, jen se vzkaz neuloží.
    log({ udalost: 'ulozeni-selhalo', hlaska: hlaskaChyby(chyba) });
    return odpovedetBezUlozeni(dotaz, z, priPrubehu);
  }
  if ('vyber' in zarazeni) return { vysledek: 'vyber-tematu', temata: zarazeni.vyber };
  const { id, temaId, vztah } = zarazeni;

  // Téma se přepočítá a jde do feedu, k vzkazu se zapíše, co autor viděl (odpověď tématu). Výpadek úložiště tady
  // výsledek nezastaví.
  const dokoncit = async (
    stav: StavVzkazu,
    novaCastId?: string | null,
    odpovedProAutora?: (tema?: TemaFeedu) => ZobrazenaOdpoved,
  ): Promise<{ zarazeni: Zarazeni; odpoved: ZobrazenaOdpoved | null }> => {
    let tema: TemaFeedu | undefined;
    try {
      const ulozene = await prepocitatTema(temaId, zt, ted());
      tema = ulozene ? temaDoFeedu(ulozene, novaCastId) : undefined;
    } catch (chyba) {
      log({ udalost: 'ulozeni-selhalo', hlaska: hlaskaChyby(chyba) });
    }
    const odpoved = odpovedProAutora?.(tema) ?? null;
    try {
      await uloziste.zapsatVysledek(id, stav, odpoved ? odpovedVzkazu(odpoved) : null, ted());
    } catch (chyba) {
      log({ udalost: 'ulozeni-selhalo', hlaska: hlaskaChyby(chyba) });
    }
    return { zarazeni: { vzkazId: `v-${id}`, ...(tema ? { tema } : {}) }, odpoved };
  };

  // F-72: návrhy, stížnosti a pochvaly se nehledají, jen se zařadí.
  if (dotaz.typ !== 'dotaz') {
    log({ udalost: 'dotaz', vysledek: 'nehleda', typ: dotaz.typ });
    return { vysledek: 'nehleda', typ: dotaz.typ, ...(await dokoncit('ceka')).zarazeni };
  }

  const tema = await nacistTemaKZobrazeni(temaId, zt);
  const odpovedTematu = async (navic: Pick<Zarazeni, 'zTematu' | 'nicNoveho'>): Promise<VysledekDotazu> => {
    const odpoved = zobrazit(tema!.odpoved!);
    log({ udalost: 'dotaz', vysledek: 'z-tematu', vztah, vet: odpoved.vety.length, zdroju: odpoved.zdroje.length });
    const { zarazeni: zarazeno } = await dokoncit('zodpovezeno', null, () => odpoved);
    return {
      vysledek: 'odpoved',
      odpoved,
      technicke: prazdneTechnicke(z),
      celkemMs: 0,
      ...(await podepsat(podkladOdpovedi(dotaz.text, odpoved), z.klicPodpisu)),
      ...navic,
      ...zarazeno,
    };
  };

  // F-37: totéž u zodpovězeného tématu ukáže existující odpověď hned, bez nového hledání.
  if (vztah === 'totez' && tema?.stav === 'zodpovezeno' && tema.odpoved) return odpovedTematu({ zTematu: true });

  // Poddotaz: hledá se jen to, co odpověď tématu ještě nemá. Když nové otázky nevyjdou, hledá se celý vzkaz.
  let otazky: string[] | undefined;
  if (vztah === 'poddotaz' && tema) {
    const zacatek = Date.now();
    const nove = await najitNoveOtazky(tema, dotaz.text, z.ai);
    log({ udalost: 'nove-otazky', pocet: nove?.length ?? null, ms: Date.now() - zacatek, verzePromptu: VERZE_PROMPTU_TEMAT });
    if (nove && !nove.length && tema.odpoved) return odpovedTematu({ zTematu: true, nicNoveho: true });
    if (nove?.length) otazky = nove;
  }

  const nalezeno = await hledat(dotaz.text, z, priPrubehu, otazky);
  if (nalezeno.vysledek === 'odpoved') {
    let novaCastId: string | null = null;
    try {
      // Zakladatel a totéž u tématu bez odpovědi odpovídají na hlavní dotaz, poddotaz má vlastní část.
      const cil = vztah === 'poddotaz' ? id : null;
      const otazka = vztah === 'poddotaz' ? (otazky ?? [dotaz.ulozeni.nazev]).join(' ') : null;
      ({ castId: novaCastId } = await doplnitOdpovedTematu(temaId, cil, obsahZOdpovedi(nalezeno.odpoved), otazka, zt, ted()));
    } catch (chyba) {
      log({ udalost: 'ulozeni-selhalo', hlaska: hlaskaChyby(chyba) });
    }
    // Autor vidí celou odpověď tématu s doplněnou částí. Kdyby se téma nenačetlo, aspoň nalezenou odpověď.
    const { zarazeni: zarazeno, odpoved } = await dokoncit('zodpovezeno', novaCastId,
      (t) => (t?.odpoved ? zobrazit(t.odpoved, nalezeno.odpoved.nezodpovezeno) : nalezeno.odpoved));
    return { ...nalezeno, odpoved: odpoved!, ...(await podepsat(podkladOdpovedi(dotaz.text, odpoved!), z.klicPodpisu)), ...zarazeno };
  }

  // Poddotaz bez odpovědi u zodpovězeného tématu: autor vidí odpověď tématu a co zdroje nemají.
  if (vztah === 'poddotaz' && nalezeno.duvod !== 'chyba-ai' && tema?.odpoved) {
    const puvodniOdpoved = tema.odpoved;
    const { zarazeni: zarazeno, odpoved: zobrazena } = await dokoncit('ceka', null, (t) => zobrazit(t?.odpoved ?? puvodniOdpoved, otazky ?? [dotaz.text]));
    const odpoved = zobrazena!;
    return {
      vysledek: 'odpoved',
      odpoved,
      technicke: nalezeno.technicke ?? prazdneTechnicke(z),
      celkemMs: nalezeno.celkemMs,
      ...(await podepsat(podkladOdpovedi(dotaz.text, odpoved), z.klicPodpisu)),
      zTematu: true,
      ...zarazeno,
    };
  }
  const { zarazeni: zarazeno } = await dokoncit('ceka');
  if (nalezeno.duvod === 'chyba-ai') return { ...nalezeno, ...zarazeno };
  return { ...nalezeno, ...(await podepsat(podkladZpravy(dotaz.text, TEXT_BEZ_ODPOVEDI), z.klicPodpisu)), ...zarazeno };
}

export async function zpracovatDotaz(request: Request, z: ZavislostiDotazu, priPrubehu?: (udalost: UdalostPrubehu) => void) {
  return odpovedetNaPripraveny(await pripravitDotaz(request, z), z, priPrubehu);
}

// F-81: „Odpověď mi stačí“, nebo „Chci se doptat“. Zapíše se jen s podpisem návrhu, který má jen autorova stránka.
export async function zpracovatPotvrzeni(request: Request, z: ZavislostiDotazu): Promise<{ ulozeno: boolean }> {
  if (zakladniTyp(request.headers.get('content-type')) !== 'application/json') throw new ChybaPodani('spatny-typ');
  await zkontrolovatPozadavek(request, { limiter: z.limiterStylu ?? z.limiter, vyvoj: z.vyvoj }, 'styl');
  const data = await precistTeloDotazu(request, 1024);
  if (typeof data.podpis !== 'string' || !/^[0-9a-f]{64}$/.test(data.podpis) || (data.potvrzeni !== 'staci' && data.potvrzeni !== 'doptani')) {
    throw new ChybaPodani('spatny-text');
  }
  if (!z.uloziste) throw new ChybaPodani('nedostupne');
  const ulozeno = await z.uloziste.zapsatPotvrzeni(data.podpis, data.potvrzeni);
  (z.log ?? console.log)({ udalost: 'potvrzeni', potvrzeni: data.potvrzeni, ulozeno });
  return { ulozeno };
}
