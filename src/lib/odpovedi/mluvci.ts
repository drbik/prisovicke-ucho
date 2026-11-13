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

// Styl vzkazu volí autor kolem tlačítka ucha (13. 11. 2026). Spisovně je základ, ostatní jsou postavy.
export type KlicStylu = 'spisovne' | KlicMluvciho;
export const STYLY: KlicStylu[] = ['spisovne', ...KLICE_MLUVCICH];
export const JMENA_STYLU: Record<KlicStylu, string> = { spisovne: 'Spisovně', ...JMENA_MLUVCICH };

// Popisek velkého tlačítka podle zvoleného stylu.
export const POPISY_TLACITKA: Record<KlicStylu, string> = {
  spisovne: 'Namluvit vzkaz',
  bart: 'Namluvit jako Bart',
  'maly-princ': 'Namluvit jako Malý princ',
  pu: 'Namluvit jako Pú',
  sokrates: 'Namluvit jako Sokrates',
  marvin: 'Namluvit jako Marvin',
  urednik: 'Namluvit úředně',
  starocestina: 'Namluvit staročesky',
};

export function jeStyl(hodnota: unknown): hodnota is KlicStylu {
  return hodnota === 'spisovne' || jeMluvci(hodnota);
}
