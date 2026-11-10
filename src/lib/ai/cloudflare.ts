import { VERZE_PROMPTU } from './prompt-upravy';
import type { SluzbaAi } from './rozhrani';
import { upravitVzkaz } from './uprava';

export const MODEL_PREPISU = '@cf/openai/whisper-large-v3-turbo';
// Předběžný výběr z porovnání 6. 11. 2026, viz docs/hlasove-modely.md. Definitivně rozhodne slepý test (krok 3.6).
export const MODEL_UPRAVY = '@cf/google/gemma-4-26b-a4b-it';
// Vícejazyčné embeddingy, 1 024 rozměrů (krok 8.5). Index ve Vectorize musí mít stejný počet rozměrů.
export const MODEL_VEKTORU = '@cf/baai/bge-m3';
// Jediný přeřazovací model na Workers AI. Česky si je jistý jen zřídka, proto ho hledání bere jen při vysokém skóre.
export const MODEL_PRERAZENI = '@cf/baai/bge-reranker-base';
export const ROZMERU_VEKTORU = 1024;
// Odpověď z webu: stejný model jako úprava, bez uvažování (rozhodnuto 9. 11. 2026).
export const MODEL_ODPOVEDI = MODEL_UPRAVY;

export interface VazbaAi {
  run(model: string, vstup: Record<string, unknown>): Promise<unknown>;
}

interface VystupWhisperu {
  text?: unknown;
  word_count?: unknown;
  transcription_info?: { duration?: unknown };
}

interface VystupVektoru {
  data?: unknown;
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
        // Detekce řeči: bez ní Whisper v tichu napíše „Titulky vytvořil JohnyX.“ a řeč po dlouhém tichu na začátku
        // vynechá. Na zkušebních nahrávkách (10. 11. 2026) s ní ticho a šum dají prázdný přepis a řeč zůstane celá.
        vad_filter: true,
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

    modelOdpovedi: MODEL_ODPOVEDI,

    async vektory(texty) {
      const vystup = (await ai.run(MODEL_VEKTORU, { text: texty })) as VystupVektoru;
      const data = vystup?.data;
      if (!Array.isArray(data) || data.length !== texty.length
        || !data.every((v) => Array.isArray(v) && v.length === ROZMERU_VEKTORU)) {
        throw new Error('Model embeddingů nevrátil vektory.');
      }
      return data as number[][];
    },

    async preradit(dotaz, texty) {
      const vystup = (await ai.run(MODEL_PRERAZENI, {
        query: dotaz,
        contexts: texty.map((text) => ({ text })),
        top_k: texty.length,
      })) as { response?: { id?: unknown; score?: unknown }[] };
      if (!Array.isArray(vystup?.response)) throw new Error('Přeřazovací model nevrátil skóre.');
      // Model vrací seřazený seznam s pořadím vstupu v poli id. Text bez skóre dostane 0.
      const skore = texty.map(() => 0);
      for (const { id, score } of vystup.response) {
        if (Number.isInteger(id) && (id as number) >= 0 && (id as number) < texty.length && typeof score === 'number') skore[id as number] = score;
      }
      return skore;
    },

    async generovat(zpravy, { maxTokenu }) {
      const vystup = await ai.run(MODEL_ODPOVEDI, {
        messages: zpravy,
        max_tokens: maxTokenu,
        temperature: 0,
        chat_template_kwargs: { enable_thinking: false },
      });
      return textOdpovedi(vystup as VystupJazykovehoModelu);
    },
  };
}
