// Kontrola ukázkových témat proti indexu (npx tsx nastroje/index/kontrola-ukazek.ts). Spouští se po změně ukázek
// a po každé obnově indexu.
// 1. Zodpovězená témata: je každý citovaný zdroj v indexu a stojí v něm citace doslova? Ukázka, jejíž zdroj
//    z indexu zmizel nebo se změnil, se má z přehledu odebrat nebo vytvořit znovu.
// 2. Čekající dotazy: index k nim nesmí nic mít (pokyn Tomáše z 11. 11. 2026). Každý má hlídané vzory a žádný
//    z nich nesmí v indexu najít ani jeden úsek. Když najde, dotaz se musí prověřit a z čekajících vyřadit.
import path from 'node:path';
import { normalizovat } from '../../src/lib/odpovedi/overeni';
import type { Usek, ZdrojovyDokument } from '../../src/lib/odpovedi/typy';
import { UKAZKOVA_TEMATA } from '../../src/lib/temata/temata';
import { SLOZKA_DAT } from './nastaveni';
import { nacistJson } from './spolecne';

const dokumenty = await nacistJson<ZdrojovyDokument[]>(path.join(SLOZKA_DAT, 'dokumenty.json'), []);
const useky = await nacistJson<Usek[]>(path.join(SLOZKA_DAT, 'useky.json'), []);
if (!useky.length) throw new Error(`V ${SLOZKA_DAT} chybí useky.json. Nejdřív spusťte npm run index:zpracovat.`);
const podleUrl = new Map(dokumenty.map((d) => [d.url, d]));
const urlDokumentu = new Map(dokumenty.map((d) => [d.id, d.url]));

// Text úseků bez diakritiky a velkých písmen, s jednou mezerou mezi slovy. V něm se hledají hlídané vzory.
const bezDiakritiky = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ');
const textyUseku = useky.map((u) => ({ usek: u, text: bezDiakritiky(`${u.hlavicka} ${u.text}`) }));
const podleId = new Map(dokumenty.map((d) => [d.id, d]));

let chyb = 0;
let citaci = 0;
let hlidanych = 0;
for (const tema of UKAZKOVA_TEMATA) {
  // Čekající dotaz: žádný hlídaný vzor nesmí v indexu nic najít. Jinak index k dotazu něco má a téma mezi čekající nepatří.
  for (const vzor of tema.hlidat ?? []) {
    hlidanych += 1;
    const vyraz = new RegExp(vzor, 'u');
    // Dokumenty, které tým prověřil a na dotaz neodpovídají, se přeskočí (hlidatKrome).
    const krome = new Set(tema.hlidatKrome ?? []);
    const nalezene = textyUseku.filter(({ usek, text }) => !krome.has(urlDokumentu.get(usek.dokumentId) ?? '') && vyraz.test(text));
    if (!nalezene.length) continue;
    chyb += 1;
    console.log(`${tema.id} ČEKAJÍCÍ DOTAZ „${tema.nazev}“ MÁ V INDEXU ${nalezene.length} ÚSEKŮ PRO VZOR ${vzor}`);
    for (const { usek, text } of nalezene.slice(0, 3)) {
      const misto = text.search(vyraz);
      console.log(`   ${podleId.get(usek.dokumentId)?.nazev.slice(0, 70)}: …${text.slice(Math.max(0, misto - 60), misto + 140)}…`);
    }
  }
  for (const zdroj of tema.odpoved?.zdroje ?? []) {
    citaci += 1;
    // Odkaz na PDF nese stranu (#page=5), kotva karty nebo příspěvku Tlampače je naopak součást adresy dokumentu.
    const dokument = podleUrl.get(zdroj.url) ?? podleUrl.get(zdroj.url.replace(/#page=\d+$/, ''));
    if (!dokument) {
      chyb += 1;
      console.log(`${tema.id} ZDROJ NENÍ V INDEXU ${zdroj.url}`);
      continue;
    }
    if (dokument.nazev !== zdroj.nazev) {
      chyb += 1;
      console.log(`${tema.id} JINÝ NÁZEV ZDROJE: „${zdroj.nazev}“ × „${dokument.nazev}“`);
    }
    const text = normalizovat(useky.filter((u) => u.dokumentId === dokument.id).map((u) => `${u.hlavicka}\n${u.text}`).join('\n'));
    // Citace z více míst úseku je spojená výpustkou, každá část musí být v dokumentu doslova.
    const chybi = zdroj.uryvek.split(' … ').filter((cast) => !text.includes(normalizovat(cast.replace(/[.,;:]+$/, ''))));
    if (chybi.length) {
      chyb += 1;
      console.log(`${tema.id} CITACE NENÍ V DOKUMENTU ${zdroj.url}\n   chybí: ${chybi.map((c) => c.slice(0, 90)).join(' | ')}`);
    }
  }
}
console.log(chyb
  ? `Problémů: ${chyb}.`
  : `Všech ${citaci} citací ukázek je doslova ve svých zdrojích v indexu a žádný z ${hlidanych} hlídaných vzorů čekajících dotazů v indexu nic nenašel.`);
process.exitCode = chyb ? 1 : 0;
