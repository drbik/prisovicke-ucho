import { describe, expect, it } from 'vitest';
import souborHlavicek from '../public/_headers?raw';
import { bezpecnostniHlavicky } from '../src/lib/bezpecnost/hlavicky';

function hlavickyZeSouboru() {
  const [cesta, ...radky] = souborHlavicek.trim().split(/\r?\n/);
  const hlavicky = radky.map((radek) => {
    const dvojtecka = radek.indexOf(':');
    return [radek.slice(0, dvojtecka).trim(), radek.slice(dvojtecka + 1).trim()];
  });
  return { cesta, hlavicky: Object.fromEntries(hlavicky) };
}

describe('bezpečnostní hlavičky', () => {
  it('middleware a public/_headers souhlasí', () => {
    const { cesta, hlavicky } = hlavickyZeSouboru();
    expect(cesta).toBe('/ucho/*');
    expect(hlavicky).toEqual(bezpecnostniHlavicky);
  });

  it('mikrofon je povolený jen pro vlastní původ', () => {
    expect(bezpecnostniHlavicky['Permissions-Policy']).toContain('microphone=(self)');
  });

  it('CSP nepovoluje vložené skripty ani styly', () => {
    expect(bezpecnostniHlavicky['Content-Security-Policy']).not.toContain('unsafe-inline');
    expect(bezpecnostniHlavicky['Content-Security-Policy']).toContain("script-src 'self'");
  });
});
