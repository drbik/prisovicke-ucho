// Vazby Cloudflare pro ruční skripty indexu. Jdou přes přihlášení Wranglerem (vzdálené vazby), bez API tokenu v souborech.
import { getPlatformProxy } from 'wrangler';
import type { VazbaAi } from '../../src/lib/ai/cloudflare';
import type { VazbaD1, VazbaVectorize } from '../../src/lib/odpovedi/cloudflare';

export interface VazbyIndexu {
  AI: VazbaAi;
  DB: VazbaD1;
  VECTORIZE: VazbaVectorize;
}

export async function pripojitCloudflare() {
  const proxy = await getPlatformProxy<VazbyIndexu>({ configPath: 'wrangler.jsonc', persist: false, remoteBindings: true });
  return { env: proxy.env, ukoncit: () => proxy.dispose() };
}
