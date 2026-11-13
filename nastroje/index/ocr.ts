// Rozšíření indexu z 10. 11. 2026: OCR stran PDF bez textové vrstvy (npm run index:ocr).
// Strany bez textu se vykreslí do PNG (pdfjs a @napi-rs/canvas) a přečte je OCR ve Windows v češtině (ocr.ps1).
// Výsledek je text strany ve složce ocr/. Rozpoznané strany se znovu nezpracovávají, obrázky se po OCR smažou.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { SLOZKA_DAT } from './nastaveni';
import { cMapUrl, iccUrl, MIN_ZNAKU_STRANY, standardFontDataUrl, textPdf, wasmUrl } from './pdf';
import {
  formatPrilohy,
  nacistJson,
  sha1,
  souborOcr,
  souborOcrObrazku,
  souborStavu,
  type StavStazeni,
  type ZaznamSeznamu,
} from './spolecne';

// Delší strana obrázku zhruba odpovídá 300 dpi u A4. OCR ve Windows bere nejvýš 10 000 px.
const CILOVY_ROZMER = 3500;

interface Platno {
  canvas: { width: number; height: number; encode(format: 'png'): Promise<Buffer> };
  context: { fillStyle: string; fillRect(x: number, y: number, sirka: number, vyska: number): void };
}
interface TovarnaPlaten {
  create(sirka: number, vyska: number): Platno;
  destroy(platno: Platno): void;
}

const stav = await nacistJson<StavStazeni>(souborStavu(), { html: {}, pdf: {}, karty: null });
const seznam = await nacistJson<ZaznamSeznamu[]>(path.join(SLOZKA_DAT, 'seznam.json'), []);
const slozka = path.join(SLOZKA_DAT, 'ocr');
await fs.mkdir(slozka, { recursive: true });

const pdf = seznam.filter((z) => z.typ === 'pdf' && formatPrilohy(z.url) === 'pdf' && stav.pdf[z.url]);
let vykresleno = 0;
let stranBezTextu = 0;
for (const [poradi, zaznam] of pdf.entries()) {
  const data = await fs.readFile(path.join(SLOZKA_DAT, stav.pdf[zaznam.url].soubor));
  let strany;
  try {
    strany = await textPdf(new Uint8Array(data));
  } catch {
    continue;
  }
  const bezTextu = strany
    .filter((s) => s.text.replace(/\s+/g, '').length < MIN_ZNAKU_STRANY)
    .map((s) => s.strana);
  stranBezTextu += bezTextu.length;
  const chybi = bezTextu.filter((strana) => !existsSync(path.join(SLOZKA_DAT, souborOcr(zaznam.url, strana))));
  if (!chybi.length) continue;
  const uloha = getDocument({
    data: new Uint8Array(data),
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl,
    wasmUrl,
    iccUrl,
    verbosity: 0,
    disableFontFace: true,
    useSystemFonts: false,
  });
  const dokument = await uloha.promise;
  // V Node dodává pdfjs plátno z @napi-rs/canvas. Typy pdfjs ho popisují jen jako object.
  const tovarna = dokument.canvasFactory as unknown as TovarnaPlaten;
  try {
    for (const cislo of chybi) {
      const strana = await dokument.getPage(cislo);
      const zaklad = strana.getViewport({ scale: 1 });
      const viewport = strana.getViewport({ scale: CILOVY_ROZMER / Math.max(zaklad.width, zaklad.height) });
      const platno = tovarna.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
      // Bílé pozadí: průhledné místo by OCR četlo jako černé.
      platno.context.fillStyle = '#ffffff';
      platno.context.fillRect(0, 0, platno.canvas.width, platno.canvas.height);
      await strana.render({
        canvas: platno.canvas as unknown as HTMLCanvasElement,
        canvasContext: platno.context as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise;
      await fs.writeFile(path.join(slozka, `${sha1(zaznam.url)}-${cislo}.png`), await platno.canvas.encode('png'));
      tovarna.destroy(platno);
      strana.cleanup();
      vykresleno += 1;
    }
  } finally {
    await uloha.destroy();
  }
  if ((poradi + 1) % 25 === 0) console.log(`PDF ${poradi + 1}/${pdf.length}, vykresleno ${vykresleno} stran`);
}

console.log(`Stran bez textu ${stranBezTextu}, nově vykresleno ${vykresleno}.`);

// Obrázky pozvánek a plakátů z aktualit a úřední desky (rozšíření z 13. 11. 2026). OCR je čte rovnou,
// kopie leží v ocr/ pod jménem, ze kterého vznikne soubor s textem obrázku.
let obrazku = 0;
for (const zaznam of seznam.filter((z) => z.typ === 'obrazek' && stav.obrazky?.[z.url])) {
  if (existsSync(path.join(SLOZKA_DAT, souborOcrObrazku(zaznam.url)))) continue;
  const zdroj = stav.obrazky![zaznam.url].soubor;
  await fs.copyFile(path.join(SLOZKA_DAT, zdroj), path.join(slozka, `${sha1(zaznam.url)}-obrazek${path.extname(zdroj)}`));
  obrazku += 1;
}
console.log(`Obrázků k OCR ${obrazku}.`);
if (vykresleno || obrazku) {
  const vystup = execFileSync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', path.join(import.meta.dirname, 'ocr.ps1'), '-Slozka', slozka,
  ], { encoding: 'utf8', timeout: 60 * 60 * 1000 });
  console.log(vystup.trim());
}
// Obrázky jsou velké a po OCR je už nic nepotřebuje.
for (const soubor of await fs.readdir(slozka)) {
  const obrazek = /\.(png|jpe?g)$/i;
  if (obrazek.test(soubor) && existsSync(path.join(slozka, soubor.replace(obrazek, '.txt')))) await fs.rm(path.join(slozka, soubor));
}
