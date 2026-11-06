// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://nezavisli-prisovice.cz',
  base: '/ucho',
  output: 'server',
  // Ucho session nepoužívá. Bez tohohle by adaptér při nasazení založil úložiště KV.
  session: false,
  // Styly i skripty jsou v souborech, takže CSP nepotřebuje unsafe-inline.
  build: { inlineStylesheets: 'never' },
  vite: { build: { assetsInlineLimit: 0 } },
  adapter: cloudflare({ imageService: 'passthrough' }),
});
