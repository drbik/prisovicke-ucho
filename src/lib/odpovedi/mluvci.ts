// Alternativní mluvčí (13. 11. 2026): klíče a jména pro stránku. Zadání stylu pro AI je jen na serveru, v styl.ts.
export const JMENA_MLUVCICH = {
  bart: 'Bart Simpson',
  'maly-princ': 'Malý princ',
  pu: 'Medvídek Pú',
  sokrates: 'Sokrates',
  marvin: 'Marvin',
  urednik: 'Suchý úředník',
  starocestina: 'Staročeština',
} as const;

export type KlicMluvciho = keyof typeof JMENA_MLUVCICH;
export const KLICE_MLUVCICH = Object.keys(JMENA_MLUVCICH) as KlicMluvciho[];

export function jeMluvci(hodnota: unknown): hodnota is KlicMluvciho {
  return typeof hodnota === 'string' && Object.hasOwn(JMENA_MLUVCICH, hodnota);
}
