// Rozšíření indexu z 10. 11. 2026: text ze stažených dokumentů Word a ODT (npm run index:word).
// Převod dělá nainstalovaný Microsoft Word (word.ps1) s vypnutými makry. Už převedené soubory se přeskočí.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { SLOZKA_DAT } from './nastaveni';
import { formatPrilohy, nacistJson, souborStavu, souborTextuWordu, ulozitJson, type StavStazeni, type ZaznamSeznamu } from './spolecne';

const stav = await nacistJson<StavStazeni>(souborStavu(), { html: {}, pdf: {}, karty: null });
const seznam = await nacistJson<ZaznamSeznamu[]>(path.join(SLOZKA_DAT, 'seznam.json'), []);

const ulozene = seznam.filter((z) => z.typ === 'pdf' && formatPrilohy(z.url) === 'word' && stav.pdf[z.url]);
const kPrevodu = ulozene
  .filter((z) => !existsSync(path.join(SLOZKA_DAT, souborTextuWordu(z.url))))
  .map((z) => ({ zdroj: path.join(SLOZKA_DAT, stav.pdf[z.url].soubor), cil: path.join(SLOZKA_DAT, souborTextuWordu(z.url)) }));

console.log(`Dokumentů Word a ODT ${ulozene.length}, k převodu ${kPrevodu.length}.`);
if (kPrevodu.length) {
  const soubor = path.join(SLOZKA_DAT, 'word', 'k-prevodu.json');
  await ulozitJson(soubor, kPrevodu);
  const vystup = execFileSync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', path.join(import.meta.dirname, 'word.ps1'), '-Seznam', soubor,
  ], { encoding: 'utf8', timeout: 15 * 60 * 1000 });
  console.log(vystup.trim());
}
