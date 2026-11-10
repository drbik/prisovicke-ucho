import type { IndexZdroju } from './rozhrani';
import type { NalezenyUsek } from './typy';

// Kolik úseků jde do modelu (krok 8, architektura) a kolik kandidátů vrací každá metoda.
export const USEKU_DO_MODELU = 6;
const KANDIDATU = 20;
// Z jednoho dokumentu nejvýš dva úseky. Jinak dlouhé PDF obsadí všechna místa a článek s odpovědí vypadne (8.8, Q07).
const USEKU_Z_DOKUMENTU = 2;
// Konstanta reciproční fúze pořadí (RRF). Běžná hodnota z literatury.
const RRF_K = 60;
// Pod touto kosinovou podobností nejlepšího úseku jde dotaz zastupitelům bez volání jazykového modelu.
// Nastaveno na typových otázkách (8.8): otázky s odpovědí i bez ní mají 0,48 až 0,74, rozliší je až model.
// Práh proto odřízne jen zjevně cizí dotazy.
export const PRAH_PODOBNOSTI = 0.45;
// Přeřazovací model (bge-reranker-base) česky většinou vrací skóre kolem nuly a pořadí by zhoršil. Když si je
// ale jistý (skóre aspoň 0,5), úsek opravdu odpovídá: u dotazu na psy v Písečácích dal pravidlu 0,92, i když
// bylo v dokumentu až čtvrté a do modelu se nedostalo. Jisté úseky proto jdou dopředu, zbytek drží pořadí.
export const PRAH_PRERAZENI = 0.5;
const MAX_ZNAKU_K_PRERAZENI = 2000;

export type Preradit = (dotaz: string, texty: string[]) => Promise<number[]>;

// Slova, která nic nehledají. Bez diakritiky, protože fulltext diakritiku ignoruje.
const BEZVYZNAMNA = new Set(`
a aby aj ale ani ano asi az bez bude budou by bych bychom byl byla bylo byli byste byt chci chtel chtela chteli chtel
co cz da dal dalsi de den dekuji diky dnes do dobry dobrou dobre dobra ho i ja jak jaka jake jaky jako je jeho jej jeji
jen jeste jestli ji jim jsem jsme jsi jsou jste k kam kde kdo kdy kdyz ke kolik kterou ktera ktere ktery kteri ma mam
mame mate maji me mel mela mi mit mne mnou moc mohl mohla mohli mohu mu muj muze muzeme muzete muzu my na nam nas nase
nasi navic ne nebo nejak neco nekdo nejsou neni nez ni nic nich nim no o od ok on ona oni ono pak po pod podle pokud
pro prosim proc proto pry pri protoze s se si sice sem tak take taky tam tedy ten tento ti tim to tohle toho tom tomu
toto tu tuto ty tyto u uz v vam vas vase ve vi vic vice vim vite vsak z za zda zde ze zdravim zajima zajimalo rad
rada radi obec obce obci prisovice prisovic prisovicich dotaz otazka info informace
`.split(/\s+/).filter(Boolean));

export function bezDiakritiky(text: string) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// Fulltext FTS5 nezná české skloňování. Delší slova se proto hledají podle začátku (popelnic*).
export function dotazProFulltext(text: string, maxSlov = 12) {
  const slova = bezDiakritiky(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const vybrana: string[] = [];
  for (const slovo of slova) {
    if (BEZVYZNAMNA.has(slovo)) continue;
    let vyraz: string;
    if (/^\d+$/.test(slovo)) {
      if (slovo.length < 2) continue;
      vyraz = `"${slovo}"`;
    } else if (slovo.length <= 3) {
      continue;
    } else if (slovo.length === 4) {
      vyraz = `"${slovo}"`;
    } else {
      // Odříznou se nejčastější české koncovky: soudem → soud*, sokolovně → sokolo*.
      const koncovka = slovo.length >= 9 ? 3 : slovo.length >= 6 ? 2 : 1;
      vyraz = `"${slovo.slice(0, slovo.length - koncovka)}"*`;
    }
    if (!vybrana.includes(vyraz)) vybrana.push(vyraz);
    if (vybrana.length >= maxSlov) break;
  }
  return vybrana.join(' OR ');
}

export interface VysledekHledani {
  useky: NalezenyUsek[];
  nejlepsiPodobnost: number;
  shodVektoru: number;
  shodSlov: number;
  // Kolik vybraných úseků šlo dopředu díky přeřazení.
  prerazeno: number;
}

// Vektory najdou úsek podle významu, fulltext přesné výrazy. Spojí je reciproční fúze pořadí.
// Přeřazení (když je k dispozici) posune dopředu úseky, u kterých si je přeřazovací model jistý.
export async function hledatUseky(
  index: IndexZdroju,
  vektor: number[],
  text: string,
  pocet = USEKU_DO_MODELU,
  preradit?: Preradit,
): Promise<VysledekHledani> {
  const fts = dotazProFulltext(text);
  const [podleVektoru, podleSlov] = await Promise.all([
    index.hledatVektorem(vektor, KANDIDATU),
    fts ? index.hledatSlovy(fts, KANDIDATU) : Promise.resolve([]),
  ]);
  const nejlepsiPodobnost = podleVektoru.reduce((max, s) => Math.max(max, s.skore), 0);
  const skore = new Map<string, number>();
  for (const seznam of [podleVektoru, podleSlov]) {
    seznam.forEach((shoda, poradi) => skore.set(shoda.id, (skore.get(shoda.id) ?? 0) + 1 / (RRF_K + poradi + 1)));
  }
  const poradi = [...skore].sort((a, b) => b[1] - a[1]).slice(0, pocet * 3).map(([id]) => id);
  const nactene = new Map((await index.nacistUseky(poradi)).map((u) => [u.id, u]));
  const kandidati = poradi.flatMap((id) => nactene.get(id) ?? []);

  let jiste: NalezenyUsek[] = [];
  if (preradit && kandidati.length) {
    try {
      const skore = await preradit(text, kandidati.map((u) => `${u.hlavicka}\n${u.text}`.slice(0, MAX_ZNAKU_K_PRERAZENI)));
      jiste = kandidati
        .map((usek, i) => ({ usek, skore: skore[i] ?? 0 }))
        .filter((k) => k.skore >= PRAH_PRERAZENI)
        .sort((a, b) => b.skore - a.skore)
        .map((k) => k.usek);
    } catch {
      // Přeřazení je jen vylepšení. Když selže, platí pořadí z vektorů a fulltextu.
    }
  }

  const zDokumentu = new Map<string, number>();
  const vybrane: NalezenyUsek[] = [];
  const vybrat = (usek: NalezenyUsek) => {
    const pocetZDokumentu = zDokumentu.get(usek.dokumentId) ?? 0;
    if (vybrane.length >= pocet || vybrane.includes(usek) || pocetZDokumentu >= USEKU_Z_DOKUMENTU) return false;
    zDokumentu.set(usek.dokumentId, pocetZDokumentu + 1);
    vybrane.push(usek);
    return true;
  };
  const prerazeno = jiste.filter(vybrat).length;
  for (const usek of kandidati) vybrat(usek);
  return {
    useky: vybrane,
    nejlepsiPodobnost,
    shodVektoru: podleVektoru.length,
    shodSlov: podleSlov.length,
    prerazeno,
  };
}
