// Řeč má malou efektivní hodnotu, proto zesílení. Ukazatel jen říká, že mikrofon slyší.
const ZESILENI = 3.5;

// Vzorky z AnalyserNode.getByteTimeDomainData: ticho je 128, plný rozkmit 0 a 255.
export function spocitatHlasitost(vzorky: Uint8Array) {
  if (vzorky.length === 0) return 0;
  let soucet = 0;
  for (const vzorek of vzorky) {
    const odchylka = (vzorek - 128) / 128;
    soucet += odchylka * odchylka;
  }
  return Math.min(1, Math.sqrt(soucet / vzorky.length) * ZESILENI);
}
