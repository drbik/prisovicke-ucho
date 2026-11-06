/// <reference types="astro/client" />

// Vazby popisují vlastní rozhraní. Typy Workers by se tloukly s typy prohlížeče v src/skripty.
declare module 'cloudflare:workers' {
  export const env: {
    AI: import('./lib/ai/cloudflare').VazbaAi;
    PODANI_RATE_LIMITER: import('./lib/podani/ochrana').Limiter;
    // Jen lokálně v .dev.vars: stránka běží bez přihlášení ke Cloudflare.
    FALESNE_AI?: string;
  };
}
