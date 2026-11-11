import { MAX_DELKA_NAHRAVKY_S, UPOZORNENI_PRED_KONCEM_S } from '../podani/limity';

export interface UdalostiCasovace {
  naCas(uplynuloS: number): void;
  naUpozorneni(): void;
  naKonec(): void;
}

const TIK_MS = 250;

// Čas se bere z hodin, ne z počtu tiků: prohlížeč tiky na pozadí zpomaluje (F-02).
export function spustitCasovac(udalosti: UdalostiCasovace, hodiny: () => number = Date.now) {
  const zacatek = hodiny();
  const uplynulo = () => (hodiny() - zacatek) / 1000;
  let upozorneno = false;

  const tik = () => {
    const s = uplynulo();
    udalosti.naCas(Math.min(s, MAX_DELKA_NAHRAVKY_S));
    if (!upozorneno && s >= MAX_DELKA_NAHRAVKY_S - UPOZORNENI_PRED_KONCEM_S) {
      upozorneno = true;
      udalosti.naUpozorneni();
    }
    if (s >= MAX_DELKA_NAHRAVKY_S) {
      clearInterval(id);
      udalosti.naKonec();
    }
  };
  const id = setInterval(tik, TIK_MS);

  return {
    zastavit() {
      clearInterval(id);
      return Math.min(uplynulo(), MAX_DELKA_NAHRAVKY_S);
    },
  };
}

export function formatovatCas(sekundy: number) {
  const cele = Math.floor(sekundy);
  return `${Math.floor(cele / 60)}:${String(cele % 60).padStart(2, '0')}`;
}
