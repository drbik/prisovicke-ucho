import { VERZE_PROMPTU } from './prompt-upravy';
import type { SluzbaAi } from './rozhrani';
import { upravitVzkaz } from './uprava';

export const MODEL_PREPISU = '@cf/openai/whisper-large-v3-turbo';
// Předběžný výběr z porovnání 6. 11. 2026, viz docs/hlasove-modely.md. Definitivně rozhodne slepý test (krok 3.6).
export const MODEL_UPRAVY = '@cf/google/gemma-4-26b-a4b-it';

export interface VazbaAi {
  run(model: string, vstup: Record<string, unknown>): Promise<unknown>;
}

interface VystupWhisperu {
  text?: unknown;
  word_count?: unknown;
  transcription_info?: { duration?: unknown };
}

interface VystupJazykovehoModelu {
  choices?: { message?: { content?: unknown } }[];
  response?: unknown;
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

function textOdpovedi(vystup: VystupJazykovehoModelu | null) {
  const obsah = vystup?.choices?.[0]?.message?.content ?? vystup?.response;
  return typeof obsah === 'string' ? obsah : JSON.stringify(obsah ?? '');
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

    async upravit(text) {
      const { uprava, pokusu } = await upravitVzkaz(async (zpravy) => {
        const vystup = await ai.run(MODEL_UPRAVY, {
          messages: zpravy,
          max_tokens: 3000,
          temperature: 0.2,
          // Se zapnutým uvažováním trvá úprava i krátkého vzkazu přes minutu.
          chat_template_kwargs: { enable_thinking: false },
        });
        return textOdpovedi(vystup as VystupJazykovehoModelu);
      }, text);
      return { uprava, pokusu, model: MODEL_UPRAVY, verzePromptu: VERZE_PROMPTU };
    },
  };
}
