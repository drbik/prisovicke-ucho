import { spustitCasovac } from './casovac';
import { urcitDruhChyby, vybratFormat, type DruhChybyMikrofonu } from './format';
import { spocitatHlasitost } from './hlasitost';

// Pro řeč stačí. Whisper pracuje s 16 kHz a tři minuty mají asi 1 MB, což zvládne i pomalá síť.
const DATOVY_TOK = 48_000;
const KUS_MS = 1000;

export class ChybaMikrofonu extends Error {
  readonly druh: DruhChybyMikrofonu;

  constructor(druh: DruhChybyMikrofonu) {
    super(`Mikrofon nejde použít (${druh}).`);
    this.druh = druh;
  }
}

export interface HotovaNahravka {
  blob: Blob;
  typ: string;
  delkaS: number;
}

export interface UdalostiNahravani {
  naCas(uplynuloS: number): void;
  naUpozorneni(): void;
  naHlasitost(uroven: number): void;
  naKonec(nahravka: HotovaNahravka): void;
  naChybu(): void;
}

export interface Nahravani {
  dokoncit(): void;
  zrusit(): void;
}

function sledovatHlasitost(proud: MediaStream, naHlasitost: (uroven: number) => void) {
  // Ukazatel je jen pomůcka. Když selže, nahrávání běží dál.
  try {
    const kontext = new AudioContext();
    void kontext.resume();
    const analyzator = kontext.createAnalyser();
    analyzator.fftSize = 1024;
    kontext.createMediaStreamSource(proud).connect(analyzator);
    const vzorky = new Uint8Array(analyzator.fftSize);
    let snimek = requestAnimationFrame(function kresli() {
      analyzator.getByteTimeDomainData(vzorky);
      naHlasitost(spocitatHlasitost(vzorky));
      snimek = requestAnimationFrame(kresli);
    });
    return () => {
      cancelAnimationFrame(snimek);
      void kontext.close();
    };
  } catch {
    return () => {};
  }
}

export async function spustitNahravani(udalosti: UdalostiNahravani): Promise<Nahravani> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new ChybaMikrofonu('nepodporovano');
  }

  let proud: MediaStream;
  try {
    proud = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
    });
  } catch (chyba) {
    throw new ChybaMikrofonu(chyba instanceof DOMException ? urcitDruhChyby(chyba.name) : 'jina');
  }

  const format = vybratFormat((typ) => MediaRecorder.isTypeSupported(typ));
  let zaznamnik: MediaRecorder;
  try {
    zaznamnik = new MediaRecorder(proud, { audioBitsPerSecond: DATOVY_TOK, ...(format ? { mimeType: format } : {}) });
  } catch {
    // Mikrofon nesmí zůstat zapnutý, když se nahrávání nerozběhne.
    for (const stopa of proud.getTracks()) stopa.stop();
    throw new ChybaMikrofonu('nepodporovano');
  }
  const kusy: Blob[] = [];
  let zruseno = false;
  let delkaS = 0;

  const dokoncit = () => {
    if (zaznamnik.state !== 'inactive') zaznamnik.stop();
  };
  // Zamčení telefonu nebo přepnutí aplikace nahrávání ukončí a nahraný kus se zpracuje (krok 2).
  const priSkryti = () => {
    if (document.visibilityState === 'hidden') dokoncit();
  };

  const casovac = spustitCasovac({
    naCas: udalosti.naCas,
    naUpozorneni: udalosti.naUpozorneni,
    naKonec: dokoncit,
  });
  const zastavitHlasitost = sledovatHlasitost(proud, udalosti.naHlasitost);

  const uklidit = () => {
    delkaS = casovac.zastavit();
    zastavitHlasitost();
    document.removeEventListener('visibilitychange', priSkryti);
    for (const stopa of proud.getTracks()) stopa.stop();
  };

  zaznamnik.addEventListener('dataavailable', (udalost) => {
    if (udalost.data.size > 0) kusy.push(udalost.data);
  });
  zaznamnik.addEventListener('stop', () => {
    uklidit();
    if (zruseno) return;
    const typ = zaznamnik.mimeType || format || 'audio/webm';
    udalosti.naKonec({ blob: new Blob(kusy, { type: typ }), typ, delkaS });
  });
  zaznamnik.addEventListener('error', () => {
    zruseno = true;
    dokoncit();
    udalosti.naChybu();
  });
  document.addEventListener('visibilitychange', priSkryti);
  for (const stopa of proud.getTracks()) stopa.addEventListener('ended', dokoncit);

  zaznamnik.start(KUS_MS);

  return {
    dokoncit,
    zrusit() {
      zruseno = true;
      dokoncit();
    },
  };
}
