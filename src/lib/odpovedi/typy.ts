// Entita Zdrojový dokument podle datového modelu PRD. Typ je navíc rozdělený na úřední desku a kartu (krok 8).
export type WebZdroje = 'prisovice.cz' | 'nezavisli-prisovice.cz';
export type TypDokumentu = 'stranka' | 'aktualita' | 'uredni-deska' | 'pdf' | 'karta';

export interface ZdrojovyDokument {
  id: string;
  url: string;
  nazev: string;
  web: WebZdroje;
  typ: TypDokumentu;
  // Datum zveřejnění (RRRR-MM-DD). Stálé stránky ho mají z REST API, karty žádné.
  zverejneno: string | null;
  zmeneno: string | null;
  // Měsíc nahrání PDF (RRRR-MM), když PDF nemá datum stránky, která na něj odkazuje.
  mesicNahrani: string | null;
  // SHA-256 vytaženého textu. Změna otisku jednou spustí kontrolu navázaných odpovědí (F-78, Později).
  otisk: string;
  stazeno: string;
  // Stránka, která na PDF odkazuje.
  nadrazenyUrl: string | null;
}

// Úsek je technická tabulka indexu, v PRD jako entita není (rozhodnuto 9. 11. 2026).
export interface Usek {
  id: string;
  dokumentId: string;
  poradi: number;
  strana: number | null;
  hlavicka: string;
  text: string;
}

export interface NalezenyUsek extends Usek {
  dokument: ZdrojovyDokument;
}
