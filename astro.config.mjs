// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// https://astro.build/config
export default defineConfig({
  site: 'https://nezavisli-prisovice.cz',
  base: '/ucho',
  output: 'server',
  // Ucho session nepoužívá. Bez tohohle by adaptér při nasazení založil úložiště KV.
  session: false,
  // Styly i skripty jsou v souborech, takže CSP nepotřebuje unsafe-inline.
  build: { inlineStylesheets: 'never' },
  vite: {
    build: { assetsInlineLimit: 0 },
    // Zkouška z telefonu přes Wi-Fi: mikrofon funguje jen na https. Certifikát je mimo repozitář.
    ...(process.env.UCHO_HTTPS ? {
      server: {
        https: {
          key: readFileSync(join(homedir(), '.prisovicke-ucho', 'https', 'klic.pem')),
          cert: readFileSync(join(homedir(), '.prisovicke-ucho', 'https', 'certifikat.pem')),
        },
      },
    } : {}),
  },
  adapter: cloudflare({ imageService: 'passthrough' }),
});
