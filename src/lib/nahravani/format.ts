// Prohlížeče na Chromiu nahrávají WebM/Opus. MP4 je pro Safari a Ogg pro Firefox, ty se v MVP netestují.
const FORMATY = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export function vybratFormat(jePodporovan: (typ: string) => boolean) {
  return FORMATY.find(jePodporovan);
}

export type DruhChybyMikrofonu = 'zakazano' | 'chybi' | 'obsazeno' | 'nepodporovano' | 'jina';

export function urcitDruhChyby(nazev: string): DruhChybyMikrofonu {
  if (nazev === 'NotAllowedError' || nazev === 'SecurityError') return 'zakazano';
  if (nazev === 'NotFoundError' || nazev === 'OverconstrainedError') return 'chybi';
  if (nazev === 'NotReadableError' || nazev === 'AbortError') return 'obsazeno';
  return 'jina';
}
