// Kontrola zpracování (8.4): je doslovná opora každé typové otázky v úsecích jejího zdroje?
// Když ne, chyba je ve vytažení textu nebo v dělení, ne v hledání. Spouští se po npm run index:zpracovat.
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Usek, ZdrojovyDokument } from '../../src/lib/odpovedi/typy';
import { SLOZKA_DAT } from './nastaveni';
import { nacistJson } from './spolecne';

const sada = JSON.parse(await fs.readFile('tests/data/typove-otazky.json', 'utf8')) as {
  otazky: { id: string; zdroje?: { url: string; opora?: string }[] }[];
};
const dokumenty = await nacistJson<ZdrojovyDokument[]>(path.join(SLOZKA_DAT, 'dokumenty.json'), []);
const useky = await nacistJson<Usek[]>(path.join(SLOZKA_DAT, 'useky.json'), []);
const podleUrl = new Map(dokumenty.map((d) => [d.url, d]));
// Obec některé PDF zveřejnila dvakrát pod různou adresou. Index nechá jednu kopii, druhá adresa ukazuje na ni.
const { duplicity } = await nacistJson<{ duplicity: { url: string; stejnyJako: string }[] }>(path.join(SLOZKA_DAT, 'zprava.json'), { duplicity: [] });
for (const { url, stejnyJako } of duplicity) {
  const dokument = podleUrl.get(stejnyJako);
  if (dokument) podleUrl.set(url, dokument);
}
// Bez mezer a velikosti písmen: průzkum bral text jinými nástroji (pdftotext), mezery se liší.
const bezMezer = (text: string) => text.replace(/[\s\u00ad]+/g, '').replace(/[–—]/g, '-').toLowerCase();

let chyb = 0;
for (const otazka of sada.otazky) {
  for (const zdroj of otazka.zdroje ?? []) {
    if (!zdroj.opora) continue;
    const dokument = podleUrl.get(zdroj.url);
    if (!dokument) {
      chyb += 1;
      console.log(`${otazka.id} CHYBÍ DOKUMENT ${zdroj.url}`);
      continue;
    }
    const text = bezMezer(useky.filter((u) => u.dokumentId === dokument.id).map((u) => u.text).join(''));
    // Opora může přesahovat hranici úseku, proto stačí, když jsou v textu její části delší než 40 znaků.
    const casti = zdroj.opora.split(/(?<=[.;:])\s+|\s+(?=[–-]\s)/).map(bezMezer).filter((c) => c.length >= 15);
    const chybi = casti.filter((c) => !text.includes(c));
    if (chybi.length) {
      chyb += 1;
      console.log(`${otazka.id} OPORA NENÍ CELÁ V ÚSECÍCH ${zdroj.url}\n   chybí: ${chybi.map((c) => c.slice(0, 80)).join(' | ')}`);
    }
  }
}
console.log(chyb ? `Problémů: ${chyb}.` : 'Opory všech typových otázek jsou v úsecích svých zdrojů.');
