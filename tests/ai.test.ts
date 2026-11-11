import { describe, expect, it, vi } from 'vitest';
import { MODEL_PREPISU, MODEL_UPRAVY, vytvorCloudflareAi } from '../src/lib/ai/cloudflare';
import { VERZE_PROMPTU } from '../src/lib/ai/prompt-upravy';

describe('přepis přes Workers AI (F-10)', () => {
  it('pošle base64 do Whisperu s pevnou češtinou a detekcí řeči', async () => {
    const run = vi.fn(async () => ({ text: 'Dobrý den', word_count: 2, transcription_info: { duration: 1.5 } }));
    const vysledek = await vytvorCloudflareAi({ run }).prepsat(new TextEncoder().encode('audio'));
    expect(run).toHaveBeenCalledWith(MODEL_PREPISU, { audio: btoa('audio'), task: 'transcribe', language: 'cs', vad_filter: true });
    expect(MODEL_PREPISU).toBe('@cf/openai/whisper-large-v3-turbo');
    expect(vysledek).toEqual({ text: 'Dobrý den', pocetSlov: 2, delkaS: 1.5 });
  });

  it('zvládne velkou nahrávku bez přetečení zásobníku', async () => {
    const run = vi.fn(async (_model: string, _vstup: Record<string, unknown>) => ({ text: 'ok' }));
    const audio = new Uint8Array(6 * 1024 * 1024).fill(65);
    await vytvorCloudflareAi({ run }).prepsat(audio);
    expect((run.mock.calls[0][1].audio as string).length).toBe(Math.ceil(audio.length / 3) * 4);
  });

  it('nesmyslný výstup modelu je chyba', async () => {
    const ai = vytvorCloudflareAi({ run: async () => ({ neco: 'jineho' }) });
    await expect(ai.prepsat(new Uint8Array([1]))).rejects.toThrow('Whisper nevrátil text.');
  });
});

describe('úprava přes Workers AI (F-12, F-13)', () => {
  const VYSTUP = '{"text":"Upravený text.","nazev":"Název","oblast":"ostatni","typ":"navrh"}';

  it('pošle zprávy do jazykového modelu a vrátí ověřenou úpravu', async () => {
    const run = vi.fn(async (_model: string, _vstup: Record<string, unknown>) => ({
      choices: [{ message: { content: VYSTUP } }],
    }));
    const vysledek = await vytvorCloudflareAi({ run }).upravit('text občana');
    expect(run.mock.calls[0][0]).toBe(MODEL_UPRAVY);
    expect(run.mock.calls[0][1]).toMatchObject({ chat_template_kwargs: { enable_thinking: false } });
    expect(JSON.stringify(run.mock.calls[0][1].messages)).toContain('text občana');
    expect(vysledek).toEqual({
      uprava: { text: 'Upravený text.', nazev: 'Název', oblast: 'ostatni', typ: 'navrh' },
      model: MODEL_UPRAVY,
      verzePromptu: VERZE_PROMPTU,
      pokusu: 1,
    });
  });

  it('přijme i starší tvar odpovědi modelu', async () => {
    const ai = vytvorCloudflareAi({ run: async () => ({ response: VYSTUP }) });
    expect((await ai.upravit('text')).uprava.nazev).toBe('Název');
  });

  it('přijme odpověď, kterou model vrátí jako objekt', async () => {
    const ai = vytvorCloudflareAi({ run: async () => ({ response: JSON.parse(VYSTUP) }) });
    expect((await ai.upravit('text')).uprava.nazev).toBe('Název');
  });

  it('po prázdné odpovědi zkusí další požadavek', async () => {
    const run = vi.fn<() => Promise<unknown>>()
      .mockResolvedValueOnce({ choices: [{ message: { content: null } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: VYSTUP } }] });
    expect((await vytvorCloudflareAi({ run }).upravit('text')).pokusu).toBe(2);
  });
});
