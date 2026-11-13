// Podpis dat serverem (HMAC-SHA256, klíč KLIC_PODPISU ve Workers Secrets). Stránka data vrátí a server pozná,
// že je sám vydal: odpověď k převyprávění, návrh AI úpravy a text postavy k uložení vzkazu (F-14).
// Účel je součástí podpisu, takže podpis jednoho druhu dat neplatí pro jiný.
const kodovac = new TextEncoder();

async function klicHmac(tajemstvi: string) {
  return crypto.subtle.importKey('raw', kodovac.encode(tajemstvi), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

// Data se podepisují jako text. Volající je předá v pevném tvaru (pořadí klíčů), aby podpis seděl i po cestě stránkou.
export async function podepsat(ucel: string, data: string, tajemstvi: string) {
  const podpis = await crypto.subtle.sign('HMAC', await klicHmac(tajemstvi), kodovac.encode(`${ucel}|${data}`));
  return Array.from(new Uint8Array(podpis), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function overit(ucel: string, data: string, podpis: unknown, tajemstvi: string) {
  if (typeof podpis !== 'string' || !/^[0-9a-f]{64}$/.test(podpis)) return false;
  const bajty = new Uint8Array(podpis.match(/../g)!.map((dvojice) => parseInt(dvojice, 16)));
  return crypto.subtle.verify('HMAC', await klicHmac(tajemstvi), bajty, kodovac.encode(`${ucel}|${data}`));
}
