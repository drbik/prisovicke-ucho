import { ChybaPodani } from './chyby';

// Stejná ochrana jako analytický endpoint webu Nezávislých (docs/oblasti-a-web.md).
export function jePuvodPovolen(request: Request, vyvoj = false) {
  const url = new URL(request.url);
  const hostitele = vyvoj ? ['localhost', '127.0.0.1'] : ['nezavisli-prisovice.cz'];
  // Zkouška z telefonu přes Wi-Fi: při vývoji i adresa počítače v místní síti.
  const mistniSit = vyvoj && /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname);
  return (hostitele.includes(url.hostname) || mistniSit)
    && (vyvoj || url.protocol === 'https:')
    && request.headers.get('origin') === url.origin
    && !['cross-site', 'same-site'].includes(request.headers.get('sec-fetch-site') ?? '');
}

export interface Limiter {
  limit(moznosti: { key: string }): Promise<{ success: boolean }>;
}

export async function povolitPozadavek(request: Request, limiter?: Limiter) {
  const ip = request.headers.get('cf-connecting-ip');
  if (!limiter || !ip) throw new ChybaPodani('nedostupne');
  // IP dodává Cloudflare, klient ji nezmění. V limiteru je jen její hash.
  const otisk = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`podani|${ip}`));
  const key = Array.from(new Uint8Array(otisk), (bajt) => bajt.toString(16).padStart(2, '0')).join('');
  try {
    return (await limiter.limit({ key })).success;
  } catch {
    throw new ChybaPodani('nedostupne');
  }
}

// Počítá skutečné bajty ze streamu, i když Content-Length chybí nebo lže.
export async function precistTelo(request: Request, maxBajtu: number) {
  const deklarovano = request.headers.get('content-length');
  if (deklarovano !== null && (!/^\d+$/.test(deklarovano) || Number(deklarovano) > maxBajtu)) {
    throw new ChybaPodani('prilis-velke');
  }
  if (!request.body) return new Uint8Array();
  const ctenar = request.body.getReader();
  const kusy: Uint8Array[] = [];
  let velikost = 0;
  try {
    while (true) {
      const { done, value } = await ctenar.read();
      if (done) break;
      velikost += value.byteLength;
      if (velikost > maxBajtu) {
        void ctenar.cancel().catch(() => {});
        throw new ChybaPodani('prilis-velke');
      }
      kusy.push(value);
    }
  } finally {
    ctenar.releaseLock();
  }
  const bajty = new Uint8Array(velikost);
  let pozice = 0;
  for (const kus of kusy) {
    bajty.set(kus, pozice);
    pozice += kus.byteLength;
  }
  return bajty;
}
