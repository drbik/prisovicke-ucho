import type { WebZdroje, ZdrojovyDokument } from './typy';

// Označení podle webu zdroje (rozhodnuto 9. 11. 2026, F-79).
export const OZNACENI_ZDROJE: Record<WebZdroje, string> = {
  'prisovice.cz': 'Odpověď z webu obce',
  'nezavisli-prisovice.cz': 'Podle webu Nezávislých pro Příšovice',
};

export const UPOZORNENI = 'Nejde o úřední vyjádření obce Příšovice. Odpověď vybrala AI z veřejných zdrojů a může být neúplná nebo zastaralá. Rozhoduje znění zdroje.';

export function ceskeDatum(iso: string) {
  const [rok, mesic, den] = iso.slice(0, 10).split('-');
  return `${Number(den)}. ${Number(mesic)}. ${rok}`;
}

// Datum, které citace ukáže u zdroje (F-74). Karty datum zveřejnění nemají, proto stav webu k datu stažení.
export function datumZdroje(dokument: ZdrojovyDokument) {
  if (dokument.typ === 'karta') return `stav webu k ${ceskeDatum(dokument.stazeno)}`;
  if (dokument.typ === 'stranka') {
    if (dokument.zmeneno) return `aktualizováno ${ceskeDatum(dokument.zmeneno)}`;
    // Podklady webu Nezávislých datum zveřejnění nemají, jako karty ukazují stav webu k datu stažení.
    return dokument.web === 'nezavisli-prisovice.cz' ? `stav webu k ${ceskeDatum(dokument.stazeno)}` : `staženo ${ceskeDatum(dokument.stazeno)}`;
  }
  if (dokument.zverejneno) return `zveřejněno ${ceskeDatum(dokument.zverejneno)}`;
  if (dokument.mesicNahrani) {
    const [rok, mesic] = dokument.mesicNahrani.split('-');
    return `nahráno ${Number(mesic)}/${rok}`;
  }
  return `staženo ${ceskeDatum(dokument.stazeno)}`;
}

// Odkaz u PDF vede rovnou na stranu úseku.
export function odkazNaZdroj(dokument: ZdrojovyDokument, strana: number | null) {
  return dokument.typ === 'pdf' && strana ? `${dokument.url}#page=${strana}` : dokument.url;
}

// Hlavička úseku: s ní model i hledání ví, z jakého dokumentu úsek je (krok 8, architektura).
export function hlavickaUseku(dokument: ZdrojovyDokument, strana: number | null) {
  const zdroj = dokument.web === 'prisovice.cz' ? 'web obce prisovice.cz' : 'web Nezávislých pro Příšovice';
  return `${dokument.nazev} (${zdroj}, ${datumZdroje(dokument)}${strana ? `, str. ${strana}` : ''})`;
}
