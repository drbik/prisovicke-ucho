import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatovatCas, spustitCasovac } from '../src/lib/nahravani/casovac';

function udalosti() {
  return { naCas: vi.fn(), naUpozorneni: vi.fn(), naKonec: vi.fn() };
}

describe('časovač nahrávání (F-02)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('ukazuje uplynulý čas', () => {
    const u = udalosti();
    spustitCasovac(u);
    vi.advanceTimersByTime(5000);
    expect(u.naCas).toHaveBeenLastCalledWith(5);
    expect(u.naUpozorneni).not.toHaveBeenCalled();
  });

  it('upozorní jednou 30 s před koncem, tedy ve 2:30', () => {
    const u = udalosti();
    spustitCasovac(u);
    vi.advanceTimersByTime(149_750);
    expect(u.naUpozorneni).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250);
    expect(u.naUpozorneni).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10_000);
    expect(u.naUpozorneni).toHaveBeenCalledTimes(1);
  });

  it('ve 3:00 skončí a dál netiká', () => {
    const u = udalosti();
    spustitCasovac(u);
    vi.advanceTimersByTime(179_750);
    expect(u.naKonec).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250);
    expect(u.naKonec).toHaveBeenCalledTimes(1);
    const tiku = u.naCas.mock.calls.length;
    vi.advanceTimersByTime(5000);
    expect(u.naCas).toHaveBeenCalledTimes(tiku);
  });

  it('když prohlížeč tiky zpozdí, drží se skutečného času', () => {
    const u = udalosti();
    spustitCasovac(u);
    // Jeden tik po dlouhé prodlevě: čas z hodin, ne z počtu tiků.
    vi.setSystemTime(Date.now() + 200_000);
    vi.advanceTimersByTime(250);
    expect(u.naCas).toHaveBeenLastCalledWith(180);
    expect(u.naUpozorneni).toHaveBeenCalledTimes(1);
    expect(u.naKonec).toHaveBeenCalledTimes(1);
  });

  it('zastavení vrátí délku a ukončí tikání', () => {
    const u = udalosti();
    const casovac = spustitCasovac(u);
    vi.advanceTimersByTime(4000);
    expect(casovac.zastavit()).toBe(4);
    vi.advanceTimersByTime(200_000);
    expect(u.naKonec).not.toHaveBeenCalled();
  });
});

describe('formát času', () => {
  it.each([[0, '0:00'], [9.9, '0:09'], [75, '1:15'], [180, '3:00']])('%d s je %s', (s, text) => {
    expect(formatovatCas(s)).toBe(text);
  });
});
