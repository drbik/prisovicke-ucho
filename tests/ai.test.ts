import { describe, expect, it, vi } from 'vitest';
import { MODEL_PREPISU, vytvorCloudflareAi } from '../src/lib/ai/cloudflare';

describe('přepis přes Workers AI (F-10)', () => {
  it('pošle base64 do Whisperu s pevnou češtinou', async () => {
    const run = vi.fn(async () => ({ text: 'Dobrý den', word_count: 2, transcription_info: { duration: 1.5 } }));
    const vysledek = await vytvorCloudflareAi({ run }).prepsat(new TextEncoder().encode('audio'));
    expect(run).toHaveBeenCalledWith(MODEL_PREPISU, { audio: btoa('audio'), task: 'transcribe', language: 'cs' });
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
