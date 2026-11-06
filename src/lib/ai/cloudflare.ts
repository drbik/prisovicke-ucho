import type { SluzbaAi } from './rozhrani';

export const MODEL_PREPISU = '@cf/openai/whisper-large-v3-turbo';

export interface VazbaAi {
  run(model: string, vstup: Record<string, unknown>): Promise<unknown>;
}

interface VystupWhisperu {
  text?: unknown;
  word_count?: unknown;
  transcription_info?: { duration?: unknown };
}

function naBase64(bajty: Uint8Array) {
  let binarni = '';
  // Po kusech, protože String.fromCharCode nezvládne miliony argumentů naráz.
  for (let i = 0; i < bajty.length; i += 0x8000) {
    binarni += String.fromCharCode(...bajty.subarray(i, i + 0x8000));
  }
  return btoa(binarni);
}

function cislo(hodnota: unknown) {
  return typeof hodnota === 'number' ? hodnota : undefined;
}

export function vytvorCloudflareAi(ai: VazbaAi): SluzbaAi {
  return {
    async prepsat(audio) {
      // Volá se přímo Workers AI, bez AI Gateway a bez fronty. Ty by mohly audio uložit (F-10, F-14).
      const vystup = (await ai.run(MODEL_PREPISU, {
        audio: naBase64(audio),
        task: 'transcribe',
        language: 'cs',
      })) as VystupWhisperu;
      if (typeof vystup?.text !== 'string') throw new Error('Whisper nevrátil text.');
      return {
        text: vystup.text,
        delkaS: cislo(vystup.transcription_info?.duration),
        pocetSlov: cislo(vystup.word_count),
      };
    },
  };
}
