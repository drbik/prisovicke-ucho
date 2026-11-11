// Limity podání sdílí prohlížeč i server (F-02, F-04, docs/plan-mvp.md, krok 2).
export const MAX_DELKA_NAHRAVKY_S = 180;
export const UPOZORNENI_PRED_KONCEM_S = 30;
export const MIN_DELKA_NAHRAVKY_S = 2;

export const MIN_ZNAKU_TEXTU = 10;
export const MAX_ZNAKU_TEXTU = 3000;

// Upravený text autor opravuje v kroku 4 (F-14). Rychlá řeč za 3 minuty může mít přes 3 000 znaků,
// proto má upravený text víc místa než napsaný vzkaz.
export const MAX_ZNAKU_UPRAVY = 4000;
// Název podnětu podle F-13.
export const MAX_ZNAKU_NAZVU = 80;

// Tři minuty WAV 16 kHz mono mají 5,8 MB. Opus a AAC jsou menší, i když prohlížeč nedodrží datový tok.
export const MAX_VELIKOST_NAHRAVKY_B = 8 * 1024 * 1024;
export const MAX_VELIKOST_TEXTU_B = 16 * 1024;

// Když jazykový model do té doby neodpoví, autor dostane Zkusit znovu (krok 3.4).
export const LIMIT_UPRAVY_MS = 45_000;

export const POVOLENE_TYPY_NAHRAVKY = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];

export function jeTextPlatny(text: string) {
  const delka = text.trim().length;
  return delka >= MIN_ZNAKU_TEXTU && delka <= MAX_ZNAKU_TEXTU;
}
