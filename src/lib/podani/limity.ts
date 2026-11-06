// Limity podání sdílí prohlížeč i server (F-02, F-04, docs/plan-mvp.md, krok 2).
export const MAX_DELKA_NAHRAVKY_S = 180;
export const UPOZORNENI_PRED_KONCEM_S = 30;
export const MIN_DELKA_NAHRAVKY_S = 2;

export const MIN_ZNAKU_TEXTU = 10;
export const MAX_ZNAKU_TEXTU = 3000;

// Tři minuty WAV 16 kHz mono mají 5,8 MB. Opus a AAC jsou menší, i když prohlížeč nedodrží datový tok.
export const MAX_VELIKOST_NAHRAVKY_B = 8 * 1024 * 1024;
export const MAX_VELIKOST_TEXTU_B = 16 * 1024;

export const POVOLENE_TYPY_NAHRAVKY = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];

export function jeTextPlatny(text: string) {
  const delka = text.trim().length;
  return delka >= MIN_ZNAKU_TEXTU && delka <= MAX_ZNAKU_TEXTU;
}
